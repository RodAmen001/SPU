// Pipeline narratif partagé : sources → synthèse → matching → histoire
// Utilisé par /api/ask (Oracle/Enfant), /api/mentor (étape 1) et /api/deep (niveau 1).
// Les événements suivent la Partie 15 du cahier des charges.

import { orchestrerSources, type Synthese, type SourceResultat } from './sources';
import { trouverParabole, reArbitrerSurSynthese, detecterTonalite, type ParaboleMatch } from './matching';
import { paraboleEnLigne } from './parabole-en-ligne';
import { genererHistoire, chunker, type HistoireGeneree } from './story';
import { genererPerspective } from './perspective';
import { MESSAGE_ERREUR_SOURCES } from './constants';
import { budgetEpuise } from './budget';

export type EvenementSSE =
  | { type: 'status'; step: string }
  | { type: 'erreur'; message: string }
  | { type: 'synthesis'; text: string; sources: string[]; confiance: number; niveauSources?: number; escalade?: { niveau: number; confiance: number }[] }
  | {
      type: 'parabole';
      id: string;
      code: string;
      enonce: string;
      interpretation: string;
      culture: string;
      famille: string;
      sources: string[];
      score: number;
      sousSeuil: boolean;
      enLigne?: boolean;
    }
  | { type: 'histoire'; chunk: string }
  | { type: 'perspective'; text: string };

export interface OptionsFlux {
  modeCorpus: 'adulte' | 'enfant';
  contexte?: string; // contexte utilisateur partagé (Mentor/Deep)
  sourcesLimitees?: boolean; // Deep niveau 1 : moins de sources, plus lent
}

export interface ResultatFlux {
  synthese: Synthese | null;
  sources: SourceResultat[];
  parabole: ParaboleMatch | null;
  histoire: HistoireGeneree | null;
  perspective: string | null;
  erreur: string | null;
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Déroule le flux narratif complet en émettant des événements SSE.
 * Le retour de fonction porte les données finales pour la journalisation.
 * Résilience : si toutes les sources externes échouent (quota, réseau…), le flux
 * se dégrade au lieu de bloquer — le corpus local (parabole) et le conteur
 * (histoire par template sûr) restent disponibles hors-ligne.
 */
export async function* fluxNarratif(question: string, opts: OptionsFlux): AsyncGenerator<EvenementSSE, ResultatFlux> {
  const resultat: ResultatFlux = { synthese: null, sources: [], parabole: null, histoire: null, perspective: null, erreur: null };

  // ── v4.7 Fluidité : le matching du corpus démarre EN MÊME TEMPS que la
  // consultation des sources. L'arbitre identifie le cœur émotionnel de LA
  // QUESTION (pas celui de la synthèse), il n'a donc pas besoin d'attendre :
  // ses ~12 s d'analyse se déroulent pendant que les sources répondent.
  yield { type: 'status', step: 'sources' };
  const matchPromis = trouverParabole(question, question, opts.modeCorpus).catch(() => null);
  const orch = await orchestrerSources(question);
  resultat.sources = orch.sources;
  let modeDegrade = false;
  if (orch.toutesEchouees) {
    // Mode dégradé honnête : pas de synthèse externe, mais le corpus local continue.
    modeDegrade = true;
    yield { type: 'status', step: 'matching' };
  } else {
    yield { type: 'status', step: 'synthèse' };
    // La synthèse retenue sort directement de l'escalade adaptative 2 → 3 → 4 → 5
    // sources (critère de confiance ≥ 50 %, sinon meilleur score).
    const synthese = orch.synthese!;
    resultat.synthese = synthese;
    yield {
      type: 'synthesis',
      text: synthese.texte,
      sources: synthese.sources,
      confiance: synthese.confiance,
      niveauSources: orch.niveauSources,
      escalade: orch.historique,
    };
    yield { type: 'status', step: 'matching' };
  }

  // Le matching a tourné pendant les sources : il est déjà prêt (coût résiduel ≈ 0).
  let match = await matchPromis;
  if (!match) {
    const msg = modeDegrade
      ? MESSAGE_ERREUR_SOURCES
      : "Je n'ai pas trouvé de parabole pertinente dans mon corpus pour l'instant. Réessaie avec des mots un peu différents.";
    resultat.erreur = msg;
    yield { type: 'erreur', message: msg };
    return resultat;
  }

  // ── v4.8 — Orientation vers la synthèse (exigence du concepteur) ───────────
  // La parabole-réponse et son interprétation doivent refléter LA SYNTHÈSE des
  // sources. Le premier arbitrage (sur la question, en parallèle) a laissé la
  // parabole sous le seuil ? On ré-arbitre alors les candidates DU CORPUS
  // directement contre la synthèse.
  if (match.sousSeuil && !modeDegrade && resultat.synthese?.texte && !budgetEpuise(14000)) {
    yield { type: 'status', step: 'reorientation' };
    const reorientee = await reArbitrerSurSynthese(resultat.synthese.texte, question, opts.modeCorpus).catch(() => null);
    if (reorientee && !reorientee.sousSeuil) match = reorientee;
  }

  // ── v4.8 — Repli EN LIGNE : aucune parabole du corpus ne convient efficacement
  // ? Le SPU consulte une IA + un moteur de recherche pour RETROUVER une parabole
  // réelle et traditionnelle (jamais inventée), sourcée et vérifiée via
  // l'encyclopédie, orientée vers la synthèse. En cas d'échec : la parabole du
  // corpus la plus proche reste servie, honnêtement signalée sous le seuil.
  if (match.sousSeuil && !modeDegrade && resultat.synthese?.texte && !budgetEpuise(16000)) {
    yield { type: 'status', step: 'enligne' };
    const trouvee = await paraboleEnLigne(resultat.synthese.texte, question, opts.modeCorpus).catch(() => null);
    if (trouvee) match = trouvee;
  }

  resultat.parabole = match;
  yield {
    type: 'parabole',
    id: match.id,
    code: match.code,
    enonce: match.texte,
    interpretation: match.interpretationChoisie,
    culture: match.culture,
    famille: match.famille,
    sources: match.sources,
    score: match.score,
    sousSeuil: match.sousSeuil || modeDegrade,
    enLigne: match.enLigne || false,
  };

  yield { type: 'status', step: 'histoire' };
  // v4.7 : la tonalité est détectée localement (instantané, plus d'appel IA) et la
  // mise en perspective est générée EN PARALLÈLE de l'histoire — les deux ne
  // dépendent que de la parabole. Restitution dans l'ordre canonique.
  const tonalite = opts.modeCorpus === 'enfant' ? 'neutre' : await detecterTonalite(question);
  const perspectivePromis = genererPerspective(question, match.texte, match.interpretationChoisie, {
    enfantine: opts.modeCorpus === 'enfant',
  });
  const histoire = await genererHistoire({
    enonce: match.texte,
    interpretation: match.interpretationChoisie,
    contexte: opts.contexte || 'non partagé',
    culture: match.culture,
    tonalite,
    mode: opts.modeCorpus,
    // L'histoire est ancrée sur la question RÉELLE de l'utilisateur : elle doit
    // résonner avec sa préoccupation précise, jamais générique.
    preoccupation: question,
  });
  resultat.histoire = histoire;
  const chunks = chunker(histoire.texte, 3);
  for (const c of chunks) {
    yield { type: 'histoire', chunk: c };
    await pause(35); // rythme de lecture, respiration du stream
  }

  // ── Mise en perspective : le pont entre LA question posée et LA parabole offerte ──
  // Exigence du concept : visible dans la réponse, quel que soit le mode.
  // (déjà générée en parallèle de l'histoire — plus d'attente supplémentaire)
  yield { type: 'status', step: 'perspective' };
  resultat.perspective = await perspectivePromis;
  yield { type: 'perspective', text: resultat.perspective };

  return resultat;
}

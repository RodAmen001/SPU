// Pipeline narratif partagé : sources → synthèse → matching → histoire
// Utilisé par /api/ask (Oracle/Enfant), /api/mentor (étape 1) et /api/deep (niveau 1).
// Les événements suivent la Partie 15 du cahier des charges.

import { orchestrerSources, type Synthese, type SourceResultat } from './sources';
import { trouverParabole, detecterTonalite, type ParaboleMatch } from './matching';
import { genererHistoire, chunker, type HistoireGeneree } from './story';
import { genererPerspective } from './perspective';
import { MESSAGE_ERREUR_SOURCES } from './constants';

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

  yield { type: 'status', step: 'sources' };
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

  const match = await trouverParabole(modeDegrade ? question : `${question} ${resultat.synthese?.texte || ''}`, question, opts.modeCorpus);
  if (!match) {
    const msg = modeDegrade
      ? MESSAGE_ERREUR_SOURCES
      : "Je n'ai pas trouvé de parabole pertinente dans mon corpus pour l'instant. Réessaie avec des mots un peu différents.";
    resultat.erreur = msg;
    yield { type: 'erreur', message: msg };
    return resultat;
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
  };

  yield { type: 'status', step: 'histoire' };
  const tonalite = opts.modeCorpus === 'enfant' ? 'neutre' : await detecterTonalite(question);
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
  yield { type: 'status', step: 'perspective' };
  resultat.perspective = await genererPerspective(question, match.texte, match.interpretationChoisie, {
    enfantine: opts.modeCorpus === 'enfant',
  });
  yield { type: 'perspective', text: resultat.perspective };

  return resultat;
}

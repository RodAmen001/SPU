// PHASE 3 — Matching vectoriel avec le corpus (3.4) + arbitrage sémantique LLM
// Étapes : index TF-IDF en mémoire (construit depuis la BDD) → top 5 cosinus →
// l'arbitre LLM choisit la parabole la plus pertinente et note la correspondance 0-1.
// Seuil du cahier : 0.65. En dessous → mention honnête "parabole la plus proche du corpus"
// (le workflow de quarantaine externe arrive en lot 4 ; jamais d'IA générative n'invente de parabole).

import { db } from '@/lib/db';
import { construireIndex, rechercher, type CorpusIndex } from './vector-index';
import { llmChat, extractJson } from './llm';
import { SEUIL_MATCHING, FAMILLES } from './constants';

const _index: Record<'adulte' | 'enfant', CorpusIndex | null> = { adulte: null, enfant: null };
const _indexTime: Record<'adulte' | 'enfant', number> = { adulte: 0, enfant: 0 };
const INDEX_TTL_MS = 5 * 60 * 1000; // reconstruit au max toutes les 5 min

export async function getIndex(mode: 'adulte' | 'enfant' = 'adulte'): Promise<CorpusIndex> {
  if (_index[mode] && Date.now() - _indexTime[mode] < INDEX_TTL_MS) return _index[mode]!;
  const paraboles = await db.parabole.findMany({
    where: { mode, statut: { in: ['validated', 'pending'] } },
    select: { id: true, texte: true, interpretations: true, culture: true, famille: true, motsCles: true },
  });
  const documents = paraboles.map((p) => ({
    id: p.id,
    texte: [
      p.texte,
      ...safeParse<string[]>(p.interpretations, []),
      p.culture,
      FAMILLES[p.famille] || '',
      // mots-clés éditoriaux pondérés ×2 (pré-indexation du cahier 8.1)
      ...safeParse<string[]>(p.motsCles, []),
      ...safeParse<string[]>(p.motsCles, []),
    ].join(' '),
  }));
  _index[mode] = construireIndex(documents);
  _indexTime[mode] = Date.now();
  return _index[mode]!;
}

export function invaliderIndex(): void {
  _index.adulte = null;
  _index.enfant = null;
}

function safeParse<T>(json: string | null | undefined, defaut: T): T {
  try {
    return json ? (JSON.parse(json) as T) : defaut;
  } catch {
    return defaut;
  }
}

export interface ParaboleMatch {
  id: string;
  code: string;
  texte: string;
  culture: string;
  famille: string;
  interpretations: string[];
  sources: string[];
  score: number;
  interpretationChoisie: string;
  sousSeuil: boolean; // true = "parabole la plus proche du corpus"
}

/** Matching complet : cosinus top-8 puis arbitrage LLM (score de pertinence 0-1). */
export async function trouverParabole(synthese: string, question: string, mode: 'adulte' | 'enfant' = 'adulte'): Promise<ParaboleMatch | null> {
  const index = await getIndex(mode);
  const top = rechercher(synthese, index, 8);
  if (!top.length) return null;

  const ids = top.map((t) => t.id);
  const paraboles = await db.parabole.findMany({
    where: { id: { in: ids }, mode },
    include: {},
  });
  if (!paraboles.length) return null;
  const parCode = new Map(paraboles.map((p) => [p.id, p]));

  const candidats = top
    .filter((t) => parCode.has(t.id))
    .map((t) => {
      const p = parCode.get(t.id)!;
      const interps = safeParse<string[]>(p.interpretations, []);
      return {
        id: p.id,
        code: p.code,
        texte: p.texte,
        culture: p.culture,
        famille: `${p.famille} — ${FAMILLES[p.famille] || ''}`,
        interpretations: interps,
        scoreCosinus: Math.round(t.score * 1000) / 1000,
      };
    });
  if (!candidats.length) {
    // Garantie « toujours une parabole » : si l'index est muet, on offre une
    // parabole RÉELLE du corpus (rotation déterministe), honnêtement sous le seuil.
    // Jamais d'IA générative n'invente une parabole.
    const toutes = await db.parabole.findMany({ where: { mode }, take: 80 });
    if (!toutes.length) return null;
    const p = toutes[question.length % toutes.length];
    const interps = safeParse<string[]>(p.interpretations, []);
    return {
      id: p.id,
      code: p.code,
      texte: p.texte,
      culture: p.culture,
      famille: p.famille,
      interpretations: interps,
      sources: safeParse<string[]>(p.sources, []),
      score: 0.3,
      interpretationChoisie: interps[0] || p.texte,
      sousSeuil: true,
    };
  }

  // ── Arbitrage LLM : précision sémantique sur le top-5 ──
  let arbitrage: { id: string; score: number; interpretation_index: number } | null = null;
  try {
    const consigne = `On te donne une question, sa synthèse, et ${candidats.length} paraboles candidates issues d'un corpus réel.
Question : ${question.slice(0, 600)}
Synthèse : ${synthese.slice(0, 900)}

Candidates :
${candidats.map((c, i) => `[${i}] (${c.code}, ${c.culture}) « ${c.texte} » — interprétations : ${c.interpretations.join(' / ')}`).join('\n')}

Identifie d'abord le CŒUR ÉMOTIONNEL de la question (ex. : trahison d'un proche, mensonge dans la famille, perte de confiance, peur d'abandon, injustice…), pas seulement ses mots.
Choisis ensuite la parabole dont le ressort émotionnel correspond le mieux à ce cœur — elle doit éclairer la situation de la personne, pas simplement reprendre ses mots.
Note la pertinence de 0 à 1 (1 = éclairage profond et juste ; 0.4 = très vague ; 0.65 = seuil de qualité minimal).
Réponds UNIQUEMENT avec un JSON exact : {"index": 0, "score": 0.0, "interpretation_index": 0}`;
    const reponse = await llmChat([{ role: 'user', content: consigne }], { timeoutMs: 12000, temperature: 0.2, maxTokens: 120 });
    const json = extractJson<{ index: number; score: number; interpretation_index: number }>(reponse);
    if (json && typeof json.index === 'number' && candidats[json.index]) {
      arbitrage = {
        id: candidats[json.index].id,
        score: Math.max(0, Math.min(1, typeof json.score === 'number' ? json.score : 0.5)),
        interpretation_index: typeof json.interpretation_index === 'number' ? json.interpretation_index : 0,
      };
    }
  } catch {
    // arbitrage indisponible : on garde le meilleur cosinus
  }

  const choisi = arbitrage ? candidats.find((c) => c.id === arbitrage!.id)! : candidats[0];
  const score = arbitrage ? arbitrage.score : Math.min(0.9, choisi.scoreCosinus * 1.35); // cosinus calibré si pas d'arbitre
  const p = parCode.get(choisi.id)!;
  const interps = safeParse<string[]>(p.interpretations, []);
  const interpretation = interps[arbitrage?.interpretation_index ?? 0] || interps[0] || p.texte;

  return {
    id: p.id,
    code: p.code,
    texte: p.texte,
    culture: p.culture,
    famille: p.famille,
    interpretations: interps,
    sources: safeParse<string[]>(p.sources, []),
    score: Math.round(score * 100) / 100,
    interpretationChoisie: interpretation,
    sousSeuil: score < SEUIL_MATCHING,
  };
}

/** Détecte la tonalité de la question (3.6) — positif / négatif / neutre. */
export async function detecterTonalite(question: string): Promise<'positive' | 'negative' | 'neutre'> {
  try {
    const reponse = await llmChat(
      [
        {
          role: 'system',
          content:
            "Détecte la tonalité dominante du message en français. Réponds UNIQUEMENT avec un JSON : {\"tonalite\": \"positive\"|\"negative\"|\"neutre\"}. Positive = espoir, joie, projet. Negative = souffrance, peur, colère, tristesse. Neutre = question, curiosité, réflexion.",
        },
        { role: 'user', content: question.slice(0, 800) },
      ],
      { timeoutMs: 8000, temperature: 0.1, maxTokens: 40 }
    );
    const json = extractJson<{ tonalite: string }>(reponse);
    if (json?.tonalite && ['positive', 'negative', 'neutre'].includes(json.tonalite)) return json.tonalite as 'positive' | 'negative' | 'neutre';
    return 'neutre';
  } catch {
    return 'neutre';
  }
}

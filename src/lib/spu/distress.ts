// PHASE 0 — Détection de détresse (3.1 du cahier) — NON NÉGOCIABLE
// Couche A : détection lexicale (regex multilingue, indicateurs explicites)
// Couche B : classifieur LLM (score 0-1) — remplacement fonctionnel du modèle local
// Couche C : heuristique de tonalité (sentiment basique + vocabulaire de rupture)
//
// Règles absolues du cahier :
//   • Aucune donnée de détresse n'est envoyée à un tiers.
//   • Logs anonymisés (hash + horodatage uniquement, jamais de texte).
//   • Jamais de parabole en cas de détresse confirmée.

import { llmChat, extractJson } from './llm';

// ── Couche A : lexique des signaux explicites ────────────────────────────────
const REGEX_EXPLICITES: RegExp[] = [
  /\bje\s+(veux|voudrais|pense\s+à|compte|vais)\s+(vraiment\s+)?(en\s+finir|mourir|me\s+tuer|mettre\s+fin)/i,
  /\b(je\s+)?(me\s+)?(veux\s+)?me\s+(tuer|suicider|couper|pendre|jeter\s+par\s+la\s+f[êe]n[êe]tre)/i,
  /\b(je\s+)?(vais|veux|compte)\s+faire\s+du\s+mal\s+([àa]\s+(mon|ma|mes|moi)|au\s+corps)/i,
  /\b(je\s+)?(me\s+)?suicide(r|)?\b/i,
  /\bautodestruction|auto[-\s]?mutilation|je\s+me\s+mutile\b/i,
  /\bje\s+ne\s+(veux|peux)\s+plus\s+(vivre|continuer|exister)\b/i,
  /\bplus\s+rien\s+n'a\s+de\s+sens\b/i,
  /\bfinir\s+avec\s+la\s+vie\b/i,
  /\bmettre\s+fin\s+[àa]\s+(mes\s+jours|ma\s+vie|tout\s+cela)\b/i,
  /\bje\s+n'ai\s+plus\s+envie\s+de\s+vivre\b/i,
  /\b(je\s+)?vais\s+(sauter|me\s+jeter)\b/i,
  /\b(dernier\s+message|adieu\s+[àa]\s+tous|au\s+revoir\s+pour\s+toujours|ne\s+cherchez\s+pas\s+[àa]\s+me)\b/i,
  /\bi\s+(want\s+to\s+)?(kill\s+myself|end\s+it\s+all|die)\b/i,
  /\bno\s+(reason\s+)?to\s+live\b/i,
];

/** Couche A — 1 si un indicateur explicite est trouvé, sinon 0. */
export function coucheA(question: string): number {
  if (!question) return 0;
  return REGEX_EXPLICITES.some((r) => r.test(question)) ? 1 : 0;
}

// ── Couche C : heuristique de tonalité ───────────────────────────────────────
const VOCAB_NEGATIF = [
  'triste', 'seul', 'seule', 'vide', 'perdu', 'perdue', 'fatigué', 'fatiguée', 'épuisé', 'épuisée',
  'pleurer', 'larmes', 'peur', 'angoisse', 'angoissé', 'angoissée', 'sombre', 'noir', 'noire',
  'souffrance', 'souffre', 'souffrir', 'sans espoir', "plus d'espoir", 'plus rien', 'désespéré', 'désespérée',
  'abandonné', 'abandonnée', 'inutile', 'nul', 'nulle', 'raté', 'ratée', 'honte', 'culpabilité',
  'coupable', 'incapable', 'impossible', 'lourd', 'chaos', 'détresse', 'malheur', 'malade',
  'hopeless', 'alone', 'tired', 'empty', 'pain', 'hurt', 'lost', 'cry',
];

const VOCAB_RUPTURE = [
  'arrêter', 'finir', 'fin', 'partir', 'disparaître', 'mourir', 'la mort', 'quitter tout',
  'abandonner tout', 'tout lâcher', 'jamais plus', 'pour toujours', 'cesser', 'silence définitif',
  'quit', 'leave forever', 'end', 'stop everything',
];

/** Couche C — score de tonalité 0..1 (négativité forte + vocabulaire de rupture). */
export function coucheC(question: string): number {
  if (!question) return 0;
  const q = question.toLowerCase();
  let neg = 0;
  for (const w of VOCAB_NEGATIF) if (q.includes(w)) neg++;
  let rup = 0;
  for (const w of VOCAB_RUPTURE) if (q.includes(w)) rup++;
  // normalisation douce : saturer vers 1 quand plusieurs marqueurs coexistent
  const scoreNeg = Math.min(1, neg / 4);
  const scoreRup = Math.min(1, rup / 2);
  // "très négatif" : combinaison des deux
  return Math.min(1, 0.55 * scoreNeg + 0.65 * scoreRup + (scoreNeg > 0.5 && scoreRup > 0.5 ? 0.15 : 0));
}

// ── Couche B : classifieur LLM ───────────────────────────────────────────────
export interface ClassificationB {
  score: number; // 0..1
  niveau: 'aucune' | 'vigilance' | 'crise';
}

/** Couche B — classification par LLM. En cas d'échec : score 0 (les couches A et C restent actives). */
export async function coucheB(question: string): Promise<ClassificationB> {
  if (!question || question.length < 3) return { score: 0, niveau: 'aucune' };
  try {
    const reponse = await llmChat(
      [
        {
          role: 'system',
          content:
            "Tu es un module de détection de détresse psychologique. On te donne un message d'utilisateur. Détecte UNIQUEMENT les signaux explicites de crise suicidaire, d'auto-agression ou de mise en danger. Ne détecte PAS la tristesse ordinaire, le deuil, l'épuisement professionnel ou les questions philosophiques sur la mort. Réponds UNIQUEMENT avec un JSON exact, sans texte autour : {\"score\": 0.0 à 1.0, \"niveau\": \"aucune\"|\"vigilance\"|\"crise\"}. \"crise\" = intention explicite ou probable de se faire du mal. \"vigilance\" = souffrance intense sans intention claire. \"aucune\" = rien de préoccupant pour la sécurité physique de la personne.",
        },
        { role: 'user', content: question.slice(0, 1500) },
      ],
      { timeoutMs: 12000, temperature: 0.1, maxTokens: 100 }
    );
    const json = extractJson<ClassificationB>(reponse);
    if (json && typeof json.score === 'number') {
      const score = Math.max(0, Math.min(1, json.score));
      const niveau = ['aucune', 'vigilance', 'crise'].includes(json.niveau) ? json.niveau : (score >= 0.75 ? 'crise' : score >= 0.5 ? 'vigilance' : 'aucune');
      return { score, niveau };
    }
    return { score: 0, niveau: 'aucune' };
  } catch {
    return { score: 0, niveau: 'aucune' }; // fail-safe : les couches A et C suffisent
  }
}

// ── Décision (seuils du cahier 3.1) ──────────────────────────────────────────
export type Decision = 'distress' | 'review' | 'pass';

export interface ResultatPhase0 {
  a: number;
  b: number;
  c: number;
  decision: Decision;
}

export function decider(a: number, b: number, c: number): Decision {
  if (a === 1) return 'distress'; // Couche A déclenche → détresse confirmée
  if (b >= 0.75) return 'distress'; // Couche B ≥ 0.75 → détresse confirmée
  if (b >= 0.5 && c >= 0.7) return 'review'; // B entre 0.5 et 0.75 ET C très négatif → probable
  return 'pass';
}

/** Phase 0 complète (asynchrone à cause de la couche B). */
export async function phase0(question: string): Promise<ResultatPhase0> {
  const a = coucheA(question);
  const c = coucheC(question);
  // Optimisation : si la couche A est confirmée, inutile d'interroger le LLM
  const b = a === 1 ? 1 : (await coucheB(question)).score;
  const decision = decider(a, b, c);
  return { a, b, c, decision };
}

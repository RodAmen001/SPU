// ═════════════════════════════════════════════════════════════════════════════
// v6.7 — CORRECTEUR DÉTERMINISTE DE FRANÇAIS (filet de sécurité sous les
// consignes « FRANÇAIS IMPECCABLE » des prompts). Les moteurs IA gratuits
// laissent parfois passer des fautes d'accord de genre (« ton question »,
// « mon question ») — inacceptables à l'écran. Ce correcteur ne réécrit PAS
// le style : il répare uniquement des accords certains, sur une liste fermée
// de noms FÉMININS à consonne initiale (« ton histoire » devant voyelle étant
// correct, les mots à voyelle initiale ne sont jamais touchés).
// Fonction pure, testée dans tests/francais.test.ts.
// ═════════════════════════════════════════════════════════════════════════════

const FEMININS = [
  'question', 'réponse', 'parabole', 'synthèse', 'synthese', 'perspective',
  'route', 'parole', 'pensée', 'pensee', 'démarche', 'demarche',
  'lecture', 'vérité', 'verite', 'chaleur', 'force', 'lumière', 'lumiere',
  'sagesse', 'marche', 'musique', 'phrase', 'formation', 'condition',
  'situation', 'attente', 'courage', 'confiance', 'présence', 'presence',
];

// La fin du nom n'utilise PAS \b : \b échoue après une lettre accentuée
// (é n'est pas un caractère de mot en JS) — on exige plutôt un séparateur.
const FIN = '(?=[\\s,.;:!?«»\'’"“”()\\-]|$)';

const REMPLACANTS: Record<string, string> = {
  ton: 'ta', mon: 'ma', son: 'sa', ce: 'cette', cet: 'cette',
  le: 'la', du: 'de la', au: 'à la', un: 'une',
};

const CORRECTIONS: [RegExp, string][] = [
  // « ton question » → « ta question », « ce réponse » → « cette réponse », etc.
  ...Object.keys(REMPLACANTS).flatMap((det) =>
    FEMININS.map((n) => [new RegExp(`\\b${det}\\s+${n}${FIN}`, 'g'), `${REMPLACANTS[det]} ${n}`] as [RegExp, string])
  ),
  // élisions oubliées, vues dans les sorties réelles des moteurs gratuits
  [/\bje suis pas\b/g, 'je ne suis pas'],
  [/\bc'est pas\b/g, "ce n'est pas"],
  [/\bje sais pas\b/g, 'je ne sais pas'],
  [/\bje comprends pas\b/g, 'je ne comprends pas'],
  [/\btu peux pas\b/g, 'tu ne peux pas'],
  [/\bon peut pas\b/g, 'on ne peut pas'],
  [/\bça va pas\b/g, 'ça ne va pas'],
  [/\bj'ai pas\b/g, "je n'ai pas"],
  // propreté : doubles espaces, espaces avant ponctuation
  [/ {2,}/g, ' '],
  [/ ([,;:.!?])/g, '$1'],
];

/** Répare les accords certains d'un texte produit par un moteur IA. */
export function corrigerFrancais(texte: string): string {
  let t = texte;
  for (const [re, vers] of CORRECTIONS) t = t.replace(re, vers);
  return t.trim();
}

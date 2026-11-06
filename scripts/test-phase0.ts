// TESTS PHASE 0 — 30 cas conformes au cahier (17.1)
// Critère d'acceptation : 100 % des cas de détresse évidente détectés (couche A).
//   Couche A (lexicale)      : déterministe — testée sur les 30 cas.
//   Couche B (LLM)           : testée en direct avec --live (3 appels API réels).
//   Couche C (heuristique)   : déterministe — vérifiée sur les 30 cas.
// Usage : bun run scripts/test-phase0.ts [--live]

import { coucheA, coucheC, decider, coucheB } from '../src/lib/spu/distress';

interface Cas {
  texte: string;
  groupe: 'évidente' | 'ambiguïté' | 'normal';
  aAttendu: 0 | 1;
}

const CAS: Cas[] = [
  // ── 10 détresses évidentes : la couche A DOIT déclencher (critère 100 %) ──
  { texte: "je veux en finir avec la vie ce soir", groupe: 'évidente', aAttendu: 1 },
  { texte: "je vais me tuer, c'est décidé", groupe: 'évidente', aAttendu: 1 },
  { texte: "je ne peux plus continuer comme ça, je veux mourir", groupe: 'évidente', aAttendu: 1 },
  { texte: "je vais faire du mal à mon corps ce soir", groupe: 'évidente', aAttendu: 1 },
  { texte: "plus rien n'a de sens, j'ai décidé de mettre fin à mes jours", groupe: 'évidente', aAttendu: 1 },
  { texte: "je pense au suicide chaque jour", groupe: 'évidente', aAttendu: 1 },
  { texte: "je me mutile quand je suis seule", groupe: 'évidente', aAttendu: 1 },
  { texte: "adieu à tous, ne cherchez pas à me retrouver", groupe: 'évidente', aAttendu: 1 },
  { texte: "I want to kill myself, I have no reason to live", groupe: 'évidente', aAttendu: 1 },
  { texte: "c'est mon dernier message, je vais en finir", groupe: 'évidente', aAttendu: 1 },

  // ── 10 ambiguïtés : souffrance réelle SANS signal explicite —
  //    la couche A ne doit PAS déclencher (le tri fin relève de la couche B LLM) ──
  { texte: "mon chat est mort hier et j'ai l'impression que tout est vide", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "je suis tellement fatiguée de tout, j'ai envie de partir loin", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "je pleure toutes les nuits depuis la séparation, je me sens seule", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "j'ai perdu mon travail et j'ai honte de le dire", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "je n'en peux plus de cette douleur dans ma poitrine", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "je me sens inutile et abandonnée par tout le monde", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "l'avenir me fait peur, je ne vois pas le bout du tunnel", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "je suis épuisée, tout me semble sombre et lourd", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "I feel so alone and empty these days", groupe: 'ambiguïté', aAttendu: 0 },
  { texte: "je voudrais disparaître quelques jours pour me ressourcer", groupe: 'ambiguïté', aAttendu: 0 },

  // ── 10 normaux : aucune alerte, aucune souffrance lourde ──
  { texte: "comment trouver du sens quand on traverse une période de doute ?", groupe: 'normal', aAttendu: 0 },
  { texte: "comment faire face au deuil de mon grand-père ?", groupe: 'normal', aAttendu: 0 },
  { texte: "est-ce que la patience aide vraiment dans les difficultés ?", groupe: 'normal', aAttendu: 0 },
  { texte: "je dois choisir entre deux emplois, comment décider ?", groupe: 'normal', aAttendu: 0 },
  { texte: "que disent les proverbes africains sur la solidarité ?", groupe: 'normal', aAttendu: 0 },
  { texte: "comment apprendre à lâcher prise sans renoncer ?", groupe: 'normal', aAttendu: 0 },
  { texte: "pourquoi ai-je peur d'échouer alors que je suis préparée ?", groupe: 'normal', aAttendu: 0 },
  { texte: "quelle est la différence entre courage et entêtement ?", groupe: 'normal', aAttendu: 0 },
  { texte: "comment garder l'espoir pendant une longue convalescence ?", groupe: 'normal', aAttendu: 0 },
  { texte: "mes enfants se disputent tout le temps, que faire ?", groupe: 'normal', aAttendu: 0 },
];

let ok = 0;
let ko = 0;
const echecs: string[] = [];

console.log('════════════════════════════════════════════════════════════');
console.log(' TESTS PHASE 0 — couches A (lexicale) + C (heuristique)');
console.log('════════════════════════════════════════════════════════════\n');

for (const [i, cas] of CAS.entries()) {
  const a = coucheA(cas.texte);
  const c = coucheC(cas.texte);
  // décision vérifiée dans les scénarios de couche B pertinents :
  //  évidente  : distress quelle que soit la couche B (0 / 0.6 / 0.9)
  //  ambiguïté : jamais distress tant que B < 0.75 (0 / 0.6) — B ≥ 0.75 = crise confirmée par le LLM, légitime
  //  normal    : pass avec B bas (0 / 0.3 / 0.5)
  const scenarios = cas.groupe === 'évidente' ? [0, 0.6, 0.9] : cas.groupe === 'ambiguïté' ? [0, 0.6] : [0, 0.3, 0.5];
  const decisions = scenarios.map((b) => decider(a, b, c));
  const pass =
    a === cas.aAttendu &&
    (cas.groupe === 'évidente'
      ? decisions.every((d) => d === 'distress')
      : cas.groupe === 'ambiguïté'
        ? decisions.every((d) => d !== 'distress')
        : decisions.every((d) => d === 'pass') && c < 0.4);
  if (pass) ok++;
  else {
    ko++;
    echecs.push(`  ✗ Cas ${i + 1} [${cas.groupe}] A=${a} (attendu ${cas.aAttendu}) C=${c.toFixed(2)} — « ${cas.texte.slice(0, 60)} »`);
  }
  const symbole = pass ? '✓' : '✗';
  console.log(`${symbole} [${cas.groupe.padEnd(9)}] A=${a} C=${c.toFixed(2)} → décisions(B=0/0.6/0.9): ${decisions.join('/')} « ${cas.texte.slice(0, 44)} »`);
}

console.log('\n────────────────────────────────────────────────────────────');
console.log(`Couches A+C : ${ok}/${CAS.length} réussis, ${ko} échecs`);
const evidentes = CAS.filter((c) => c.groupe === 'évidente');
const evidentesOk = evidentes.every((c) => coucheA(c.texte) === 1);
console.log(`CRITÈRE DU CAHIER — 100 % des évidentes détectées (couche A) : ${evidentesOk ? '✓ ATTEINT' : '✗ ÉCHOUÉ'}`);

if (process.argv.includes('--live')) {
  console.log('\n────────────────────────────────────────────────────────────');
  console.log(' Couche B (classifieur LLM) — 3 appels réels');
  const casB: { texte: string; attendu: (s: number) => boolean; label: string }[] = [
    { texte: "je ne supporte plus, ce soir je vais en finir avec tout ça", attendu: (s) => s >= 0.6, label: 'crise → score élevé' },
    { texte: "je me sens épuisée par mon travail, tout est gris", attendu: (s) => s < 0.75, label: 'épuisement → pas de crise confirmée' },
    { texte: "comment aider un ami qui traverse une dépression ?", attendu: (s) => s < 0.5, label: 'question d\'entraide → score bas' },
  ];
  let okB = 0;
  for (const cb of casB) {
    const r = await coucheB(cb.texte);
    const pass = cb.attendu(r.score);
    if (pass) okB++;
    console.log(`${pass ? '✓' : '✗'} ${cb.label} — score obtenu : ${r.score} (niveau: ${r.niveau})`);
  }
  console.log(`Couche B : ${okB}/3`);
  process.exit(okB === 3 && evidentesOk && ko === 0 ? 0 : 1);
}

process.exit(ko > 0 || !evidentesOk ? 1 : 0);

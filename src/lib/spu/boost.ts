// ═════════════════════════════════════════════════════════════════════════════
// SPU v6.0 — LE MODE BOOST : théâtre audio courageux en 5 phases
// Exigence du concepteur : après le chemin parcouru (Mentor : après la 3ᵉ
// question ; Enfant : après ≥ 3 questions corrélées), le SPU orchestre un
// SCÉNARIO plus ou moins voisin des histoires passées, où le héros — face aux
// difficultés — se remet LUI-MÊME en confiance (parfois suite à une exhortation
// vive d'un maître/mentor) par une DÉCLARATION FORTE, puis, par ses actions et
// ses prières, atteint les résultats recherchés.
// Phases imposées :
//   1.1 Situation initiale (facultative) — équilibre de départ
//   1.2 Élément déclencheur — rupture de l'équilibre
//   2   Péripéties — obstacles et rebondissements + LA DÉCLARATION FORTE (BOOST)
//   3.1 Dénouement — résolution
//   3.2 Situation finale (facultative) — nouvel équilibre
// Tout est JOUÉ par plusieurs personnages, chacun avec SA voix distincte —
// jamais une narration mono-voix. Durée visée : 3 à 5 minutes.
// ═════════════════════════════════════════════════════════════════════════════

import { llmChat, extractJson } from './llm';

// ── Types du scénario ─────────────────────────────────────────────────────────
export interface LigneTheatre {
  perso: string; // nom du personnage (ex. « Kofi »)
  voix: string; // profil de voix SPU (les 12 voix)
  didascalie?: string; // ce qu'il fait en parlant (affiché, pas parlé)
  texte: string; // la réplique parlée
}

export interface SceneBoost {
  phase: string; // '1.1' | '1.2' | '2' | '3.1' | '3.2'
  titre: string;
  image: string; // emoji-clé pour la bande dessinée enfant
  musique: 'douce' | 'tension' | 'declaration' | 'triomphe';
  lignes: LigneTheatre[];
}

export interface ScenarioBoost {
  titre: string;
  resume: string; // ce que ce BOOST vient fortifier chez l'utilisateur
  heros: string; // nom du héros / acteur principal
  declaration: string; // LA déclaration forte
  personnages: { nom: string; role: string; voix: string }[];
  scenes: SceneBoost[];
  dureeEstimeeSec: number;
}

// ── Les 12 voix principales disponibles pour la distribution ──────────────────
export const VOIX_BOOST_DISPONIBLES = [
  'narrateur', 'conteur', 'sage', 'homme-jeune', 'homme-mure', 'homme-vigoureux',
  'femme-jeune', 'femme-mure', 'femme-conteuse', 'vieille-femme', 'enfant-fille', 'enfant-garcon',
];

// Distribution de secours : si le modèle rend des voix invalides ou dupliquées,
// on redistribue depuis cette rotation (timbres nettement distincts entre eux).
const ROTATION_SECOURS = [
  'homme-jeune', 'femme-jeune', 'sage', 'femme-conteuse', 'homme-vigoureux', 'femme-mure',
  'homme-mure', 'vieille-femme', 'conteur', 'enfant-fille', 'enfant-garcon', 'narrateur',
];

function attribuerVoix(personnages: { nom: string; role: string; voix?: string }[]): { nom: string; role: string; voix: string }[] {
  const prises = new Set<string>();
  const lowerNom = (s: string) => s.toLowerCase();
  return personnages.slice(0, 8).map((p, i) => {
    let voix = p.voix && VOIX_BOOST_DISPONIBLES.includes(p.voix) ? p.voix : '';
    // un Conteur/Narrateur explicite reçoit SA voix dédiée
    if (!voix) {
      if (lowerNom(p.nom).includes('conteur')) voix = 'conteur';
      else if (lowerNom(p.nom).includes('narrat')) voix = 'narrateur';
    }
    if (!voix || prises.has(voix)) {
      voix = ROTATION_SECOURS.find((v) => !prises.has(v)) || ROTATION_SECOURS[i % ROTATION_SECOURS.length];
    }
    prises.add(voix);
    return { nom: p.nom, role: p.role, voix };
  });
}

const PHASES_ORDRE = ['1.1', '1.2', '2', '3.1', '3.2'];

/** Estimation simple : ~15 caractères parlés/seconde + respirations de scène. */
function estimerDuree(scenes: SceneBoost[]): number {
  let sec = 0;
  for (const sc of scenes) {
    for (const l of sc.lignes) sec += l.texte.length / 14 + 1.6;
    sec += 2; // respiration entre les scènes
  }
  return Math.round(sec);
}

// ── Le prompt BOOST ───────────────────────────────────────────────────────────
function promptBoost(chemin: string, audience: 'adulte' | 'enfant'): string {
  const styleEnfant = audience === 'enfant'
    ? `PUBLIC : un enfant de 6 à 12 ans. Vocabulaire simple, images concrètes, personnages animaux ou enfants, ZÉRO violence réaliste, zéro peur glacée : les obstacles restent surmontables et rassurants. La prière devient une « petite prière » ou une « chanson d'espoir » douce.`
    : `PUBLIC : adulte. Ton vigoureux, sincère, jamais mièvre ; la foi et la prière sont des forces agissantes du héros (fidèle à l'esprit des histoires du chemin parcouru).`;
  return `Tu es l'architecte du THÉÂTRE BOOST du SPU. À partir du chemin parcouru par la personne (ses questions et les histoires reçues), tu écris un SCÉNARIO AUDIO de 3 à 5 minutes — plus ou moins voisin des histoires qui viennent de lui être racontées — où le héros, face aux difficultés de son parcours, se remet LUI-MÊME en confiance (parfois suite à une exhortation vive et forte d'un maître/mentor) par une DÉCISION FERME : LA DÉCLARATION FORTE. Suite à cette décision, ses propres actions et ses prières consécutives lui permettent d'atteindre les résultats tant recherchés, ou les conditions/relations garantissant l'accomplissement de ses objectifs.

CHEMIN PARCOURU PAR LA PERSONNE :
${chemin.slice(0, 3000)}

${styleEnfant}

STRUCTURE IMPOSÉE — les phases, dans cet ordre :
• Phase "1.1" — Situation initiale (FACULTATIVE : l'équilibre de départ, courte).
• Phase "1.2" — Élément déclencheur : rupture de l'équilibre.
• Phase "2" — Péripéties : obstacles et rebondissements, qui culminent avec LA DÉCLARATION FORTE (le cœur du BOOST : le héros — exhorté par un maître, un mentor ou lui-même — prononce une déclaration ferme et inspirante, tout en majuscules possibles pour les mots clés).
• Phase "3.1" — Dénouement : la résolution (actions concrètes du héros + prières → résultats).
• Phase "3.2" — Situation finale (FACULTATIVE : le nouvel équilibre, courte).

RÈGLES ABSOLUES :
• TOUT est JOUÉ par les personnages, JAMAIS narré d'une seule voix du début à la fin : un personnage « Le Conteur » peut porter les transitions, mais chaque phase contient AU MOINS DEUX personnages qui parlent.
• 4 à 6 personnages au total, chacun nommé (prénoms vivants, adaptés au public), chacun avec SA voix distincte.
• La réplique « texte » est courte (1 à 3 phrases) — c'est du théâtre parlé, rythmé.
• « didascalie » = l'action visible en une ligne (affichée à l'écran, jamais lue).
• Volume total parlé : 2400 à 3200 caractères (≈ 3 à 5 minutes de théâtre audio).
• Image : 1 emoji par scène pour la bande dessinée enfant.
• Français, pas de markdown, pas d'emoji DANS les répliques.

Réponds UNIQUEMENT avec un JSON exact :
{"titre": "…",
"resume": "ce que ce BOOST vient fortifier chez la personne (1-2 phrases, parlé à la deuxième personne)",
"heros": "nom du héros",
"declaration": "LA DÉCLARATION FORTE complète, telle qu'elle est prononcée",
"personnages": [{"nom": "…", "role": "…", "voix": "un id parmi la liste", "genre": "homme|femme|enfant|aieul"}],
"scenes": [{"phase": "1.1", "titre": "…", "image": "🌅", "musique": "douce", "lignes": [{"perso": "…", "voix": "…", "didascalie": "…", "texte": "…"}]}]}

LISTE DES VOIX DISPONIBLES (id exacts, chacune pour UN personnage distinct) : narrateur, conteur, sage (aïeul posé), homme-jeune, homme-mure, homme-vigoureux, femme-jeune, femme-mure, femme-conteuse, vieille-femme, enfant-fille, enfant-garcon.
Astuce de distribution : le Conteur → "conteur" ; le héros jeune homme → "homme-jeune" ; le héros jeune femme → "femme-jeune" ; le maître/mentor → "sage" ; l'enfant héros → "enfant-fille" ou "enfant-garcon".`;
}

// ── Génération ────────────────────────────────────────────────────────────────
export async function genererBoost(
  chemin: string,
  audience: 'adulte' | 'enfant' = 'adulte'
): Promise<ScenarioBoost | null> {
  // deux tentatives : les moteurs gratuits ont des fenêtres de quota — un seul
  // échec ne doit pas priver la personne de son BOOST.
  for (let essai = 0; essai < 2; essai++) {
    try {
      const brut = await llmChat([{ role: 'user', content: promptBoost(chemin, audience) }], {
        timeoutMs: 55000,
        temperature: essai === 0 ? 0.85 : 0.75,
        maxTokens: 2800,
      });
    const extrait = brut.slice(brut.indexOf('{'), brut.lastIndexOf('}') + 1);
    const j = extractJson<{
      titre?: string;
      resume?: string;
      heros?: string;
      declaration?: string;
      personnages?: { nom?: string; role?: string; voix?: string }[];
      scenes?: { phase?: string; titre?: string; image?: string; musique?: string; lignes?: { perso?: string; voix?: string; didascalie?: string; texte?: string }[] }[];
    }>(brut);
    if (!j?.scenes?.length || !j.personnages?.length) {
      console.error(
        '[boost] réponse inutilisable (longueur', brut.length, ') :',
        brut.slice(0, 220).replace(/\s+/g, ' '),
        '… extrait fin :', brut.slice(-160).replace(/\s+/g, ' ')
      );
      return null;
    }

    const personnages = attribuerVoix(
      j.personnages.filter((p) => p.nom && p.nom.trim()).map((p) => ({ nom: p.nom!.trim(), role: (p.role || 'personnage').trim(), voix: p.voix }))
    );
    if (personnages.length < 2) return null;
    const voixDe = new Map(personnages.map((p) => [p.nom.toLowerCase(), p.voix]));

    // scènes validées, ordonnées selon la séquence imposée des phases
    const scenesBrutes = j.scenes
      .filter((s) => s.phase && (s.lignes?.length || 0) >= 1)
      .sort((a, b) => PHASES_ORDRE.indexOf(a.phase!) - PHASES_ORDRE.indexOf(b.phase!));
    if (!scenesBrutes.length) return null;

    // LA phase 2 doit contenir la déclaration forte : si le modèle l'a oubliée,
    // on l'insère comme réplique du héros.
    const phase2 = scenesBrutes.find((s) => s.phase === '2');
    const declaration = (j.declaration || '').trim();
    if (phase2 && declaration) {
      const presente = phase2.lignes!.some((l) => (l.texte || '').toUpperCase().includes(declaration.slice(0, 40).toUpperCase()));
      if (!presente && j.heros) {
        phase2.lignes!.push({ perso: j.heros, voix: voixDe.get(j.heros.toLowerCase()) || 'homme-jeune', didascalie: 'debout, la voix qui ne tremble plus', texte: declaration });
      }
    }

    const scenes: SceneBoost[] = scenesBrutes.map((s) => ({
      phase: s.phase!,
      titre: (s.titre || `Phase ${s.phase}`).trim(),
      image: (s.image || '🎬').trim().slice(0, 4),
      musique: ['douce', 'tension', 'declaration', 'triomphe'].includes(s.musique || '') ? (s.musique as SceneBoost['musique']) : 'douce',
      lignes: s.lignes!
        .filter((l) => l.perso && l.texte)
        .map((l) => ({
          perso: l.perso!.trim(),
          voix: (l.voix && VOIX_BOOST_DISPONIBLES.includes(l.voix) && !voixDe.has(l.voix)) ? l.voix : (voixDe.get(l.perso!.trim().toLowerCase()) || 'narrateur'),
          didascalie: (l.didascalie || '').trim(),
          texte: l.texte!.trim(),
        })),
    }));

    const heros = (j.heros || personnages[0].nom).trim();
    return {
      titre: (j.titre || 'Le BOOST').trim(),
      resume: (j.resume || '').trim(),
      heros,
      declaration,
      personnages,
      scenes,
      dureeEstimeeSec: estimerDuree(scenes),
    };
    } catch (e) {
      console.error('[boost] tentative', essai + 1, 'en échec :', e instanceof Error ? e.message : e);
      // une seule tentative de plus, puis on renonce en silence — le BOOST ne
      // doit JAMAIS amputer ni retarder la réponse principale.
    }
  }
  return null;
}

// ── Décision BOOST côté Enfant : corrélation locale de la série ───────────────
// Les ≥ 3 dernières questions sont-elles « corrélatives » (même préoccupation) ?
// Chevauchement de mots porteurs — instantané, sans appel IA, sans coût.
const MOTS_VIDES_ENFANT = new Set([
  'pourquoi', 'comment', 'estce', 'quoi', 'quel', 'quelle', 'est', 'ce', 'que',
  'je', 'tu', 'il', 'elle', 'nous', 'on', 'mais', 'alors', 'comme', 'avec', 'sans',
  'pour', 'dans', 'une', 'des', 'les', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
  'quand', 'peut', 'veux', 'faire', 'avoir', 'etre', 'suis', 'plus', 'tout', 'tous',
]);

export function motsClesEnfant(q: string): Set<string> {
  return new Set(
    q
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((m) => m.length > 3 && !MOTS_VIDES_ENFANT.has(m))
  );
}

/** Chevauchement de Jaccard entre deux ensembles de mots-clés. */
function chevauchement(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const m of a) if (b.has(m)) inter++;
  return inter / (a.size + b.size - inter);
}

/**
 * v6.0 — Enfant : si le système juge que la série des questions juste passées
 * (≥ 3, corrélatives) peut être soldée d'un BOOST, il est orchestré.
 * Corrélation : chevauchement moyen des mots-clés ≥ 0.18 entre les questions
 * de la série (préoccupation commune) — et pas plus d'un BOOST par série.
 */
export function serieSoldeeParBoost(questions: string[]): boolean {
  if (questions.length < 3) return false;
  const dernieres = questions.slice(-3);
  const cles = dernieres.map(motsClesEnfant);
  const score =
    (chevauchement(cles[0], cles[1]) + chevauchement(cles[1], cles[2]) + chevauchement(cles[0], cles[2])) / 3;
  return score >= 0.18;
}

/** Le chemin BOOST : requête première → dernières requêtes (exigence du concepteur). */
export function cheminBoost(questions: string[], resumes: string[]): string {
  const parties: string[] = [];
  if (questions[0]) parties.push(`Première requête : « ${questions[0]} »`);
  for (let i = 1; i < questions.length; i++) {
    parties.push(`Puis : « ${questions[i]} »${resumes[i] ? ` — l'histoire reçue parlait de : ${resumes[i].slice(0, 220)}` : ''}`);
  }
  return parties.join('\n');
}

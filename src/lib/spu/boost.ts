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
import { corrigerFrancais } from './francais';

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
• PERSONNAGES ET CONDITIONS RÉELS (exigence du concepteur : pas de contenu générique) : chaque personnage a une condition précise et vivante liée AU CHEMIN PARCOURU — métier, lien familial, quartier, épreuve concrète — cohérente d'une scène à l'autre ; les circonstances ÉVOLUENT vraiment (la situation de départ, l'élément déclencheur et les péripéties doivent être des événements précis, datables dans le récit, jamais des formules abstraites type « un jour tout a changé »).
• La réplique « texte » est COURTE (1 à 2 phrases, jamais plus de 220 caractères) — c'est du théâtre parlé, rythmé : les répliques s'enchaînent comme dans une scène réelle, sans monologues.
• « didascalie » = la PHRASE QUE LE NARRATEUR LIT À VOIX HAUTE avant la réplique pour annoncer la CONDITION dans laquelle se trouve le personnage (ce qu'il fait, où il est, comment il respire) : une phrase française complète, parlable, vivante — jamais un fragment télégraphique, jamais entre parenthèses. Exemple correct : « Léo marche dans la ville, les yeux plissés par le soleil de midi. »
• FRANÇAIS IMPECCABLE (exigence du concepteur) : orthographe, conjugaison, syntaxe et lexique soignés dans TOUT le scénario — relis chaque réplique avant de répondre ; jamais « se rendre pas », jamais d'anglicisme ni de mot mal accordé.
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
// v6.4 — après la génération, une PASSE DE RELECTURE IA relit le scénario
// complet : corrige les fautes de français, affine les didascalies pour qu'elles
// soient parlables et vivantes, garde exactement la même structure. Le résultat
// est le scénario SOIGNEUSEMENT ORCHESTRÉ exigé par le concepteur.
export async function reviserScenario(scenario: ScenarioBoost, audience: 'adulte' | 'enfant'): Promise<ScenarioBoost> {
  try {
    const brut = await llmChat(
      [
        {
          role: 'system',
          content:
            "Tu es metteur en scène et RELECTEUR d'un théâtre audio en français. On te donne le JSON complet d'un scénario BOOST. Ton travail : (1) corriger TOUTES les fautes de français (orthographe, conjugaison, syntaxe, lexique) dans les répliques, les didascalies, le titre et le résumé ; (2) rendre chaque didascalie PARLABLE et vivante — une phrase complète que le narrateur lira à voix haute pour annoncer la condition du personnage (ex. « Léo marche dans la ville, les yeux plissés par le soleil de midi. »), jamais un fragment ; (3) serrer les répliques qui dépassent 220 caractères ; (4) ne RIEN changer d'autre : mêmes personnages, mêmes voix, mêmes scènes, même ordre, même déclaration forte. " +
            (audience === 'enfant' ? 'Public : enfant de 6 à 12 ans — reste simple, concret, rassurant.' : 'Public : adulte.') +
            ' Réponds UNIQUEMENT avec le JSON corrigé, même schéma exact que l\u2019original.',
        },
        { role: 'user', content: JSON.stringify(scenario) },
      ],
      { timeoutMs: 50000, temperature: 0.3, maxTokens: 3000 }
    );
    const j = extractJson<Partial<ScenarioBoost>>(brut);
    // la relecture ne remplace le scénario que si elle est COMPLÈTE et cohérente
    if (
      j?.scenes?.length &&
      j.personnages?.length &&
      j.scenes.every((s) => s.phase && s.lignes?.length) &&
      j.scenes.length === scenario.scenes.length
    ) {
      return { ...scenario, ...j } as ScenarioBoost;
    }
    return scenario;
  } catch {
    return scenario; // la relecture est un plus — jamais bloquante
  }
}

export async function genererBoost(
  chemin: string,
  audience: 'adulte' | 'enfant' = 'adulte',
  opts: { timeoutMs?: number } = {}
): Promise<ScenarioBoost | null> {
  const timeoutMs = opts.timeoutMs ?? 55000;
  // v6.7 — TROIS tentatives (au lieu de deux) et surtout : une réponse
  // inutilisable RECOMMENCE au lieu d'abandonner — l'ancien code faisait
  // `return null` dès le premier JSON tronqué ou incomplet (la 2ᵉ tentative
  // n'était jamais atteinte). Et après tout : un scénario LOCAL de secours
  // garantit que le BOOST est toujours proposé, même moteurs saturés.
  for (let essai = 0; essai < 3; essai++) {
    try {
      const brut = await llmChat([{ role: 'user', content: promptBoost(chemin, audience) }], {
        timeoutMs,
        temperature: essai === 0 ? 0.85 : 0.75,
        maxTokens: 2800,
      });
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
          '[boost] tentative', essai + 1, 'inutilisable (longueur', brut.length, ') — reprise :',
          brut.slice(0, 200).replace(/\s+/g, ' ')
        );
        continue; // v6.7 — REPRISE (l'ancien code renonçait définitivement ici)
      }

      const personnages = attribuerVoix(
        j.personnages.filter((p) => p.nom && p.nom.trim()).map((p) => ({ nom: p.nom!.trim(), role: (p.role || 'personnage').trim(), voix: p.voix }))
      );
      if (personnages.length < 2) {
        console.error('[boost] tentative', essai + 1, ': moins de deux personnages nommés — reprise');
        continue;
      }
      const voixDe = new Map(personnages.map((p) => [p.nom.toLowerCase(), p.voix]));

      // scènes validées, ordonnées selon la séquence imposée des phases
      const scenesBrutes = j.scenes
        .filter((s) => s.phase && (s.lignes?.length || 0) >= 1)
        .sort((a, b) => PHASES_ORDRE.indexOf(a.phase!) - PHASES_ORDRE.indexOf(b.phase!));
      if (!scenesBrutes.length) {
        console.error('[boost] tentative', essai + 1, ': aucune scène avec phase valide — reprise');
        continue;
      }

      // LA phase 2 doit contenir la déclaration forte : si le modèle l'a oubliée,
      // on l'insère comme réplique du héros.
      const phase2 = scenesBrutes.find((s) => s.phase === '2');
      const declaration = corrigerFrancais((j.declaration || '').trim());
      if (phase2 && declaration) {
        const presente = phase2.lignes!.some((l) => (l.texte || '').toUpperCase().includes(declaration.slice(0, 40).toUpperCase()));
        if (!presente && j.heros) {
          phase2.lignes!.push({ perso: j.heros, voix: voixDe.get(j.heros.toLowerCase()) || 'homme-jeune', didascalie: 'debout, la voix qui ne tremble plus', texte: declaration });
        }
      }

      const scenes: SceneBoost[] = scenesBrutes.map((s) => ({
        phase: s.phase!,
        titre: corrigerFrancais((s.titre || `Phase ${s.phase}`).trim()),
        image: (s.image || '🎬').trim().slice(0, 4),
        musique: ['douce', 'tension', 'declaration', 'triomphe'].includes(s.musique || '') ? (s.musique as SceneBoost['musique']) : 'douce',
        lignes: s.lignes!
          .filter((l) => l.perso && l.texte)
          .map((l) => ({
            perso: l.perso!.trim(),
            voix: (l.voix && VOIX_BOOST_DISPONIBLES.includes(l.voix) && !voixDe.has(l.voix)) ? l.voix : (voixDe.get(l.perso!.trim().toLowerCase()) || 'narrateur'),
            didascalie: corrigerFrancais((l.didascalie || '').trim()),
            texte: corrigerFrancais(l.texte!.trim()),
          })),
      }));

      const heros = (j.heros || personnages[0].nom).trim();
      const scenario: ScenarioBoost = {
        titre: corrigerFrancais((j.titre || 'Le BOOST').trim()),
        resume: corrigerFrancais((j.resume || '').trim()),
        heros,
        declaration,
        personnages,
        scenes,
        dureeEstimeeSec: estimerDuree(scenes),
      };
      // v6.4 — PASSE DE RELECTURE IA avant stockage : français impeccable,
      // didascalies parlables, répliques serrées (structure intacte).
      return await reviserScenario(scenario, audience);
    } catch (e) {
      console.error('[boost] tentative', essai + 1, 'en échec :', e instanceof Error ? e.message : e);
    }
    if (essai < 2) await new Promise((r) => setTimeout(r, 1500)); // les moteurs gratuits ont des fenêtres de quota
  }
  // v6.7 — TOUS les moteurs ont échoué : le théâtre LOCAL de secours prend la
  // relève — le BOOST est TOUJOURS proposé, jamais amputé.
  return scenarioLocalDeSecours(chemin, audience);
}

// ── v6.7 — LE THÉÂTRE LOCAL DE SECOURS ────────────────────────────────────────
// Tous les moteurs IA peuvent être saturés en même temps : le BOOST ne doit
// JAMAIS disparaître pour autant. Ce scénario honnête, construit SANS IA à
// partir du chemin parcouru (la question réelle de la personne), garde la
// structure imposée (déclencheur, péripéties avec LA DÉCLARATION FORTE,
// dénouement, nouvel équilibre) et trois voix nettement distinctes.
export function scenarioLocalDeSecours(chemin: string, audience: 'adulte' | 'enfant'): ScenarioBoost {
  const extraitQuestions = [...chemin.matchAll(/«\s*([^»]{4,240})\s*»/g)].map((m) => m[1].trim());
  const question =
    extraitQuestions[0] ||
    chemin.split('\n').find((l) => l.trim().length > 8)?.slice(0, 240) ||
    'Comment avancer quand la réponse se fait attendre ?';
  const enfant = audience === 'enfant';
  const fille = Math.random() < 0.5;
  const heros = enfant ? (fille ? 'Zeyna' : 'Tiaki') : (fille ? 'Amani' : 'Kossi');
  const voixHeros = enfant ? (fille ? 'enfant-fille' : 'enfant-garcon') : (fille ? 'femme-jeune' : 'homme-jeune');
  const declaration = enfant
    ? 'JE N\u2019ABANDONNE PAS : je vais essayer, encore et encore, jusqu\u2019à ce que la réponse vienne !'
    : 'JE CONTINUE. Ma question a une réponse, et je vais la construire pas à pas, avec ce que je sais déjà.';
  const scenes: SceneBoost[] = [
    {
      phase: '1.2',
      titre: enfant ? 'La question qui suit partout' : 'La question qui ne dort pas',
      image: '🌙',
      musique: 'tension',
      lignes: [
        {
          perso: 'Le Conteur', voix: 'conteur',
          didascalie: enfant ? 'Zeyna et Tiaki s\u2019assoient au bord du chemin, les pieds fatigués.' : 'Le voyageur s\u2019arrête au bord du chemin, la main posée sur la question du jour.',
          texte: `Une question l\u2019accompagne depuis le matin : « ${question} »`,
        },
        {
          perso: heros, voix: voixHeros,
          didascalie: 'il regarde la route, puis le ciel',
          texte: enfant ? 'Cette question me suit partout, même dans mes jeux.' : 'Cette question me suit partout, même quand je souris.',
        },
      ],
    },
    {
      phase: '2',
      titre: 'La déclaration',
      image: '🔥',
      musique: 'declaration',
      lignes: [
        {
          perso: 'Le Sage', voix: 'sage',
          didascalie: 'il s\u2019approche, posé comme un vieux baobab',
          texte: enfant
            ? 'La réponse ne tombe pas du ciel : elle se construit, pas à pas, avec toi.'
            : 'La réponse ne tombe pas du ciel : elle se construit, pas à pas, avec ce que tu sais déjà.',
        },
        {
          perso: heros, voix: voixHeros,
          didascalie: 'debout, la voix qui ne tremble plus',
          texte: declaration,
        },
      ],
    },
    {
      phase: '3.1',
      titre: 'Le pas décisif',
      image: '🌅',
      musique: 'triomphe',
      lignes: [
        {
          perso: 'Le Conteur', voix: 'conteur',
          didascalie: 'le soleil traverse la brume du matin',
          texte: 'Alors le voyageur se relève : la marche reprend, et chaque pas pèse plus lourd que le doute.',
        },
        {
          perso: heros, voix: voixHeros,
          didascalie: 'il fait un pas franc vers la lumière',
          texte: enfant
            ? 'Aujourd\u2019hui, je fais mon premier pas : je demande de l\u2019aide et j\u2019essaie.'
            : 'Aujourd\u2019hui, je fais mon premier pas : j\u2019écris ma question, je la découpe, je commence.',
        },
      ],
    },
    {
      phase: '3.2',
      titre: 'Le nouvel équilibre',
      image: '🕊️',
      musique: 'douce',
      lignes: [
        {
          perso: 'Le Conteur', voix: 'conteur',
          didascalie: 'le chemin s\u2019ouvre, calme et clair',
          texte: 'La question reste la même, mais le chemin a changé de visage : celui qui la porte sait maintenant d\u2019où vient sa force.',
        },
      ],
    },
  ];
  return {
    titre: enfant ? 'Le petit théâtre du courage' : 'Le théâtre du courage',
    resume: enfant
      ? 'Ce petit théâtre vient te rappeler que la réponse se construit pas à pas.'
      : 'Ce théâtre vient fortifier ton courage : la réponse se construit pas à pas.',
    heros,
    declaration,
    personnages: [
      { nom: 'Le Conteur', role: 'conteur', voix: 'conteur' },
      { nom: heros, role: enfant ? 'petit voyageur' : 'voyageur', voix: voixHeros },
      { nom: 'Le Sage', role: 'maître du chemin', voix: 'sage' },
    ],
    scenes,
    dureeEstimeeSec: estimerDuree(scenes),
  };
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

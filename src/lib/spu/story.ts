// PHASE 4 — Génération d'histoire dynamique (3.6) + filtrage post-génération obligatoire
// v5.0 — le repli local n'est plus UN template générique : six canevas distincts
// (forge, port, verger, route, maison, rivière — un seul sur six), tissés sur les
// mots de LA question de l'utilisateur, pour que même hors IA l'histoire varie.

import { llmChat } from './llm';
import { promptHistoireAdulte, promptHistoireEnfant } from './constants';

// Filtre lexical : contenu violent, sexuel, haineux ou inapproprié pour mineurs
const MOTS_INTERDITS = [
  // violence explicite
  /\bsang\s+qui\s+(coule|jaillit)\b/i, /\bd[ée]membr/i, /\btorture\b/i, /\bsuicide\b/i,
  /\bmeurtre\s+(sanglant|horrible)\b/i, /\b[ée]gorge/i, /\bmutil/i,
  // contenu sexuel
  /\bsexuel/i, /\bsexualit[ée]\b/i, /\bpornograph/i, /\bnudité\b/i, /\b[ée]rotique\b/i, /\bfellation\b/i,
  // haine / discrimination
  /\bnazi\b/i, /\braciste\b/i, /\bvoile\s+islamique\s+interdit\b/i, /\binf[ée]rieure?s?\s+(race|peuple)\b/i,
  // peur extrême (mode enfant)
  /\bhorrible\s+monstre\s+qui\s+d[ée]vore\b/i, /\bnuit\s+terrifiante\b/i,
];

export interface ResultatFiltre {
  ok: boolean;
  motDetecte?: string;
}

export function filtrerContenu(texte: string): ResultatFiltre {
  for (const r of MOTS_INTERDITS) {
    const m = texte.match(r);
    if (m) return { ok: false, motDetecte: m[0] };
  }
  return { ok: true };
}

// ── Outils du repli local ─────────────────────────────────────────────────────
function hashChaine(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const MOTS_VIDES = new Set([
  'comment', 'pourquoi', 'quand', 'quoi', 'quel', 'quelle', 'faire', 'faut', 'peut', 'veux',
  'avec', 'sans', 'pour', 'dans', 'sur', 'tout', 'tous', 'mais', 'comme', 'alors', 'puis',
  'jamais', 'toujours', 'encore', 'trouver', 'garder', 'retenir', 'savoir', 'vie', 'temps',
]);

/** 1 à 3 mots porteurs de sens de LA question — pour tisser le repli local. */
function motsDeLaQuestion(question: string): string[] {
  const n = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ');
  return n.split(/\s+/).filter((m) => m.length > 4 && !MOTS_VIDES.has(m)).slice(0, 3);
}

// élision française : « d'Asie » mais « de Méditerranée »
function paysDe(culture: string): string {
  const c = culture.trim();
  return /^[aeiouyàâéèê]/i.test(c) ? `d'${c}` : `de ${c}`;
}

interface ParamsRepli {
  enonce: string;
  interpretation: string;
  culture: string;
  preoccupation: string;
  enfant: boolean;
}

/** Six canevas adultes distincts — le choix dépend de la question (hash). */
const CANEVAS_ADULTE: ((p: { pays: string; enonce: string; interpretation: string; mots: string[] }) => string)[] = [
  // 1. La forge — le feu patiente
  ({ pays, enonce, interpretation, mots }) => `À la lisière ${pays}, une vieille forge ne s'éteignait jamais tout à fait : la nuit, un brasier rouge dormait sous la cendre. Un apprenti, hanté par ${mots[0] ? `cette idée de ${mots[0]} qui ne le lâchait pas` : 'une question qui ne le lâchait pas'}, voulut tout refaire d'un coup : il souffla trop fort, le feu bondit, la pièce perdit son fer. Le maître, sans un reproche, remit une braise sous le soufflet et dit : « ${enonce} » La leçon du métal, l'apprenti l'inscrivit dans sa main : ${interpretation}`,
  // 2. Le port — les barques ne partent pas toutes à la même heure
  ({ pays, enonce, interpretation, mots }) => `Dans un petit port ${pays}, un pêcheur nommé Imrâne se tenait chaque matin devant sa barque, immobile, tandis que d'autres partaient déjà. On le moquait : « Il attend ${mots[0] ? `sa ${mots[0]}` : 'son heure'} ». Un vieux gréeur lui demanda un jour pourquoi. « Je regarde la marée, répondit-il, pas les autres. » Ce soir-là, les premiers rentrés à vide le virent décharger son filet plein. Entre l'attente et le départ, il avait appris cela : ${interpretation}`,
  // 3. Le verger — la greffe demande l'hiver
  ({ pays, enonce, interpretation, mots }) => `Sur une colline ${pays}, une greffeuse travaillait au plus froid de l'hiver, quand les branches semblent mortes. Un voisin passait, inquiet pour ${mots[0] ? `sa propre ${mots[0]}` : 'ses propres projets'} : « Pourquoi couper alors que rien ne pousse ? » Elle posa son couteau : « C'est justement parce que rien ne pousse que la blessure peut devenir un arbre nouveau. » Au printemps, la branche greffée portait. Elle avait compris depuis longtemps : ${interpretation}`,
  // 4. La route — deux voyages, un seul carrefour
  ({ pays, enonce, interpretation, mots }) => `Une marchande ${pays} faisait la même route depuis vingt ans, et chaque année le carrefour du chêne la renvoyait au même doute — celui qui, chez toi, s'appelle ${mots[0] ? `${mots[0]}` : 'hésitation'}. Un jour, un pèlerin assis au carrefour lui dit simplement : « ${enonce} » Elle repartit, et la route n'avait pas changé d'un caillou — mais son pas, si. Ce qu'elle glana ce jour-là, c'est cela : ${interpretation}`,
  // 5. La maison — la lampe de l'arrière-cour
  ({ pays, enonce, interpretation, mots }) => `Dans une maison basse ${pays}, une grand-mère allumait chaque soir une lampe à l'arrière-cour, où il n'y avait rien à éclairer. Sa petite-fille se moquait : « Qui passe ici ? Personne. » « C'est justement pour personne, disait la grand-mère, qu'on laisse une lampe. » Des années plus tard, perdue de nuit dans ses propres doutes — ${mots[0] ? `ce tourment de ${mots[0]}` : 'un tourment sans nom'} —, la petite-fille reconnut cette lumière-là, et avec elle cette vérité : ${interpretation}`,
  // 6. La rivière — la pierre plate (une seule variante sur six garde l'eau)
  ({ pays, enonce, interpretation, mots }) => `Un soir ${pays}, un cardeur de laine s'arrêta au bord d'une rivière, incapable de choisir entre deux chemins — entre deux façons d'habiter ${mots[0] ? `sa ${mots[0]}` : 'sa vie'}. L'eau passa sous ses yeux sans le conseiller ; il prit une pierre plate, la retourna longuement dans sa main, et la phrase du fleuve lui parvint : « ${enonce} » Il ne choisit pas ce soir-là. Il choisit mieux le lendemain. La pierre, dans sa poche, portait ceci : ${interpretation}`,
];

/** Trois canevas enfants — douceur, animaux, question traitée franchement. */
const CANEVAS_ENFANT: ((p: { pays: string; enonce: string; interpretation: string; mots: string[] }) => string)[] = [
  ({ pays, enonce, interpretation }) => `Il était une fois, ${pays}, un petit hérisson qui trouvait que ses piquants l'empêchaient de jouer serré avec les autres. Un soir, la lune lui chuchota : « ${enonce} » Il réfléchit sous une feuille de chêne, puis sourit : ${interpretation} Et toi, à quoi ressemble ton petit hérisson, aujourd'hui ?`,
  ({ pays, enonce, interpretation, mots }) => `Dans un grand jardin ${pays}, une fourmi très travailleuse s'inquiétait de ${mots[0] ? `la ${mots[0]}` : 'quelque chose'} qui trottait dans sa tête. La vieille tortue du potager la fit asseoir et lui raconta : « ${enonce} » La fourmi écouta jusqu'au bout, rangea ses graines, et comprit une chose douce : ${interpretation} Et si on écoutait aussi, toi et moi, jusqu'au bout ?`,
  ({ pays, enonce, interpretation }) => `Au bord d'une mare ${pays}, un petit canard n'osait pas sauter le muret de pierre. Tous les grands sautaient ; lui restait là, les ailes tout tremblantes. Une coccinelle se posa sur son bec et lui dit : « ${enonce} » Il prit une grande inspiration, sauta — pas très haut, mais juste assez. Et dans son cœur, il garda ceci : ${interpretation} La prochaine fois, à ton avis, qui sautera avec lui ?`,
];

/** Template de repli sûr (3.6) — v5.0 : varié, tissé sur la question, jamais deux fois le même. */
function templateSur(params: { enonce: string; interpretation: string; culture: string; preoccupation: string; enfant: boolean }): string {
  const { enonce, interpretation, culture, preoccupation, enfant } = params;
  const pays = paysDe(culture);
  const mots = motsDeLaQuestion(preoccupation);
  if (enfant) {
    const canevas = CANEVAS_ENFANT[hashChaine(preoccupation + enonce) % CANEVAS_ENFANT.length];
    return canevas({ pays, enonce, interpretation, mots });
  }
  const canevas = CANEVAS_ADULTE[hashChaine(preoccupation + enonce) % CANEVAS_ADULTE.length];
  return canevas({ pays, enonce, interpretation, mots });
}

export interface ParamsHistoire {
  enonce: string;
  interpretation: string;
  contexte: string;
  culture: string;
  tonalite: 'positive' | 'negative' | 'neutre';
  mode: 'adulte' | 'enfant';
  preoccupation: string; // la question réelle de l'utilisateur — ancre l'histoire
}

export interface HistoireGeneree {
  texte: string;
  filtrePasse: boolean;
  regeneration: number; // nb de régénérations (0 = OK au 1er essai)
}

export async function genererHistoire(params: ParamsHistoire): Promise<HistoireGeneree> {
  const enfant = params.mode === 'enfant';
  const consigne = enfant
    ? promptHistoireEnfant({ enonce: params.enonce, interpretation: params.interpretation, contexte: params.contexte, culture: params.culture, preoccupation: params.preoccupation })
    : promptHistoireAdulte({ enonce: params.enonce, interpretation: params.interpretation, contexte: params.contexte, culture: params.culture, tonalite: params.tonalite, preoccupation: params.preoccupation });

  for (let essai = 0; essai < 2; essai++) {
    try {
      const texte = await llChatSafe(consigne, enfant, essai > 0);
      const filtre = filtrerContenu(texte);
      if (filtre.ok) return { texte: texte.trim(), filtrePasse: true, regeneration: essai };
      console.warn(`[histoire] filtre post-génération: rejet (mot: ${filtre.motDetecte}) → régénération`);
      // détection → régénération avec contrainte renforcée
    } catch (e) {
      console.error('[histoire] échec génération LLM:', e instanceof Error ? e.message : e);
      break;
    }
  }
  // Fallback template sûr — v5.0 : six canevas, tissés sur la question
  return {
    texte: templateSur({ enonce: params.enonce, interpretation: params.interpretation, culture: params.culture, preoccupation: params.preoccupation, enfant }),
    filtrePasse: true,
    regeneration: 2,
  };
}

async function llChatSafe(consigne: string, enfant: boolean, renforcee: boolean): Promise<string> {
  const contrainte = renforcee
    ? `${consigne}

Rappel absolu : ton histoire doit être 100 % appropriée${enfant ? ' pour des enfants de 6 à 12 ans' : ''}. Aucune violence, aucun contenu sexuel ou haineux, aucune scène effrayante. Réécris en gardant uniquement la dimension douce et lumineuse.`
    : consigne;
  return llmChat(
    [{ role: 'user', content: contrainte }],
    { timeoutMs: 20000, temperature: enfant ? 0.8 : 0.85, maxTokens: enfant ? 500 : 700 }
  );
}

/** Découpe un texte en chunks de mots pour le streaming SSE. */
export function chunker(texte: string, mots = 3): string[] {
  const tokens = texte.split(/(\s+)/);
  const chunks: string[] = [];
  let courant = '';
  let compteur = 0;
  for (const t of tokens) {
    courant += t;
    if (/\S/.test(t)) compteur++;
    if (compteur >= mots) {
      chunks.push(courant);
      courant = '';
      compteur = 0;
    }
  }
  if (courant.trim()) chunks.push(courant);
  return chunks;
}

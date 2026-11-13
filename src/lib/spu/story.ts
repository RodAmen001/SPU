// PHASE 4 — Génération d'histoire dynamique (3.6) + filtrage post-génération obligatoire

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

// Template de repli sûr (3.6 : "régénération ou fallback sur un template sûr")
function templateSur(params: { enonce: string; interpretation: string; culture: string; enfant: boolean }): string {
  const { enonce, interpretation, culture, enfant } = params;
  // élision française : "d'Asie" mais "de Méditerranée"
  const c = culture.trim();
  const pays = /^[aeiouyàâéèê]/i.test(c) ? `d'${c}` : `de ${c}`;
  // en mode enfant, on garde uniquement la première phrase de la parabole (douçeur et brièveté)
  const enonceCourt = enfant ? `${enonce.split(/[.!?]/)[0].trim()}.` : enonce;
  if (enfant) {
    return `Il était une fois, dans un pays ${pays}, un petit voyageur curieux. Sur son chemin, il rencontra une rivière qui murmurait : « ${enonceCourt} » Le petit voyageur s'assit sur une pierre, regarda l'eau briller, et comprit quelque chose de doux : ${interpretation}

Il sourit, prit une grande inspiration, et continua sa route en fredonnant. Et toi, qu'est-ce que tu aurais entendu, toi, au bord de cette rivière ?`;
  }
  return `Dans un pays ${pays}, quelqu'un marchait depuis longtemps, chargé d'une question sans nom. Un soir, au bord d'une rivière, la voix de l'eau lui parvint : « ${enonce} »

Il s'arrêta. L'eau ne lui donna ni conseil ni verdict — seulement cette phrase, posée là comme une pierre plate au milieu du courant. Et quelque chose, en lui, se mit à respirer autrement : ${interpretation}

Au matin, la question était toujours là. Mais lui n'était plus tout à fait le même : la rivière avait passé la nuit à user sa pierre, sans jamais la forcer.`;
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
  // Fallback template sûr
  return {
    texte: templateSur({ enonce: params.enonce, interpretation: params.interpretation, culture: params.culture, enfant }),
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

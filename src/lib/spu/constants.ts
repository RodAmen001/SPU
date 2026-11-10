// Constantes SPU v4.4 — messages imposés par le cahier des charges (Parts 13, 15, 21)

/** Version officielle affichée partout (accueil, pied de page, titre, /api/version). */
export const VERSION_SPU = '4.4';

export const FAMILLES: Record<string, string> = {
  F1: 'Patience',
  F2: 'Détachement',
  F3: 'Courage',
  F4: 'Justice',
  F5: 'Renouveau',
  F6: 'Ancrage',
  F7: 'Légèreté',
  F8: 'Intégrité',
  F9: 'Action',
  F10: 'Relation',
};

// 21.4 — Message d'accueil
export const MESSAGE_ACCUEIL = `Bienvenue dans le SPU v4.4.

Je suis un orchestrateur narratif. Je consulte plusieurs sources d'intelligence artificielle et de recherche, je synthétise leurs réponses, puis je te propose une parabole réelle et une histoire personnalisée.

Choisis ton mode :
• Oracle — une réponse unique, rapide.
• Mentor — un dialogue progressif en 3 étapes.
• Deep — une exploration contemplative en 3 niveaux.
• Enfant — un conte rassurant pour les 6-12 ans.

Quel mode choisis-tu ? (Si tu ne précises pas, Oracle est sélectionné par défaut.)`;

// 21.5 — Message d'erreur (toutes sources indisponibles)
export const MESSAGE_ERREUR_SOURCES = `Je n'ai pas pu joindre mes sources d'intelligence artificielle et de recherche. Cela peut être temporaire. Réessaie dans quelques instants.
Si le problème persiste, tu peux toujours consulter les paraboles du corpus local, qui reste accessible hors-ligne.`;

// 21.6 — Message de détresse (modèle imposé)
export const MESSAGE_DEDETRESSE = `Ce que tu traverses est trop grave pour une parabole. Je ne suis pas un professionnel, mais je peux te donner des contacts qui peuvent vraiment t'aider.

Ressources :
• France : 3114 (prévention du suicide), SOS Amitié 09 72 39 40 50.
• Europe : 112 (urgences).
• États-Unis : 988 (Suicide & Crisis Lifeline), 911 (urgences).
• International : findahelpline.com.

Si tu es en danger immédiat, appelle les secours.
Je suis là pour t'écouter si tu veux parler, mais je ne suis pas un médecin. Ta vie compte.`;

// Ressources structurées (affichage en cartes)
export const RESSOURCES_DEDETRESSE = [
  { region: 'France', lignes: ['3114 — Prévention du suicide (24h/24, 7j/7)', 'SOS Amitié — 09 72 39 40 50'] },
  { region: 'Europe', lignes: ['112 — Urgences européennes'] },
  { region: 'États-Unis', lignes: ['988 — Suicide & Crisis Lifeline', '911 — Urgences'] },
  { region: 'International', lignes: ['findahelpline.com — lignes d\'écoute par pays'] },
];

// Message prudent (détresse "review" — tonalités préoccupantes sans signaux explicites)
export const MESSAGE_PRUDENT = `Je remarque que ce que tu traverses semble lourd. Je ne suis pas un professionnel, et certaines choses sont trop importantes pour rester sans soutien.

Si tu as besoin de parler à un humain, des personnes formées existent, jour et nuit :
• France : 3114 — SOS Amitié : 09 72 39 40 50
• International : findahelpline.com

Si tu veux continuer avec moi, je suis là — sans jugement, et sans prétendre remplacer personne.`;

// 3.3 — Prompt de synthèse (imposé tel quel)
export const PROMPT_SYNTHESE = `Tu es un synthétiseur neutre. On te donne N réponses issues de sources différentes à la question [QUESTION]. Produis une synthèse de 3 phrases maximum, en français, sans prendre position, sans inventer d'information. Cite entre crochets les sources utilisées, par exemple [1], [2], [3]. Si les sources se contredisent, mentionne-le. Ne dépasse jamais 120 mots.`;

// 3.6 — Prompts de génération (ancrés sur la préoccupation réelle de l'utilisateur)
export function promptHistoireAdulte(params: { enonce: string; interpretation: string; contexte: string; culture: string; tonalite: string; preoccupation: string }): string {
  return `Tu es un conteur. Rédige une histoire de 150 à 300 mots, incarnée et émotionnelle, illustrant l'énoncé [${params.enonce}] et l'interprétation [${params.interpretation}].

PRÉOCCUPATION RÉELLE DE LA PERSONNE (cœur de sa demande, à honorer en priorité) : « ${params.preoccupation} »

L'histoire DOIT résonner avec cette préoccupation précise : elle peut l'aborder par une situation parallèle (métaphore narrée), mais son ressort émotionnel — trahison, patience, doute, perte, attente… — doit être le même que le sien. Ne donne aucune leçon explicite, aucun jugement : la personne doit se reconnaître et sentir que SA question a été entendue. Contexte supplémentaire : [${params.contexte}]. Culture : [${params.culture}]. Tonalité : [${params.tonalite}].`;
}

export function promptHistoireEnfant(params: { enonce: string; interpretation: string; contexte: string; culture: string; preoccupation: string }): string {
  return `Tu es un conteur pour enfants de 6 à 12 ans. Rédige une histoire de 100 à 200 mots, avec un vocabulaire simple, un ton chaleureux et rassurant.

CE QUE L'ENFANT A VRAIMENT DEMANDÉ (sa question ou son souci, à traiter directement) : « ${params.preoccupation} »

L'histoire DOIT répondre à cette inquiétude précise : l'enfant doit terminer l'histoire en sentant que sa question a reçu une vraie réponse, pas une histoire générique. Si le sujet est délicat (confusion dans la famille, dispute, mensonge…), traite-le avec des personnages animaux ou symboliques, avec douceur et honnêteté adaptées à son âge, et termine par une note rassurante qui ouvre une question douce. Parabole : [${params.enonce}]. Interprétation : [${params.interpretation}]. Contexte : [${params.contexte}]. Culture : [${params.culture}].`;
}

// Question ouverte finale (mode Mentor / Deep — posture éthique 1.3)
export const QUESTION_OUVERTE_FINALE = `Et toi, qu'est-ce que cette histoire te dit de ta propre route ? Prends ton temps pour répondre — ou garde la question avec toi.`;

// Seuils (3.4)
export const SEUIL_MATCHING = 0.65;
export const TIMEOUT_SOURCE_MS = 8000;
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
export const RATE_LIMIT_MAX = 20; // req / min / IP
export const RATE_LIMIT_WINDOW_MS = 60000;
export const PURGE_SESSIONS_JOURS = 90;

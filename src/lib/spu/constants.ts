// Constantes SPU v4.4 — messages imposés par le cahier des charges (Parts 13, 15, 21)

/** Version officielle affichée partout (accueil, pied de page, titre, /api/version). */
export const VERSION_SPU = '5.0';

// Identité réseau du SPU (politique Wikimedia : User-Agent descriptif + contact)
export const UA_SPU = 'SPU/5.0 (https://spu-web.onrender.com; contact ramenyido@gmail.com)';

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
export const MESSAGE_ACCUEIL = `Bienvenue dans le SPU v4.9.

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

// v4.9 — Honnêteté en cas de panne (exigence du bilan de test) : l'utilisateur
// doit savoir quand les sources ont échoué, jamais croire à une recherche fictive.
export const NOTE_SOUS_SEUIL = `Parabole la plus proche de mon corpus pour ta question — mes sources n'ont pas permis d'affiner davantage ce choix aujourd'hui.`;
export const BANNIERE_SOURCES_ECHOUEES = `Je n'ai pas pu joindre mes sources d'intelligence et de recherche : la synthèse est donc absente, et cette parabole n'a pas pu être orientée vers elle. Réessaie dans quelques instants — la parabole reste, elle, réelle et sourcée.`;

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
// v5.0 — exiger la spécificité (fini les « quelqu'un marchait… » génériques) et
// ouvrir aux LIVRES SAINTS : l'histoire peut mettre en scène un passage RÉEL de la
// Bible, du Coran, de la Torah/Talmud ou des autres textes sacrés — fidèle au
// texte — ou une histoire originale dans leur esprit, orientée vers la question.
export function promptHistoireAdulte(params: { enonce: string; interpretation: string; contexte: string; culture: string; tonalite: string; preoccupation: string }): string {
  return `Tu es un conteur. Rédige une histoire de 150 à 300 mots, incarnée et émotionnelle, illustrant l'énoncé [${params.enonce}] et l'interprétation [${params.interpretation}].

PRÉOCCUPATION RÉELLE DE LA PERSONNE (cœur de sa demande, à honorer en priorité) : « ${params.preoccupation} »

SPÉCIFICITÉ OBLIGATOIRE (v5.0) :
• INTERDIT d'écrire une histoire interchangeable : commence par une scène CONCRÈTE — un lieu précis, un personnage caractérisé (métier, nom ou trait marquant), un objet ou un moment identifiable.
• INTERDITS ABSOLUS : « Dans un pays X, quelqu'un marchait depuis longtemps », « chargé d'une question sans nom », « la voix de l'eau lui parvint », « au bord d'une rivière » par défaut, et toute fin du type « la rivière avait passé la nuit à user sa pierre ». Ces formules génériques sont bannies.
• L'histoire DOIT résonner avec la préoccupation précise citée ci-dessus : une situation parallèle (métaphore narrée) dont le ressort émotionnel — trahison, patience, doute, perte, attente… — est le même que le sien. La personne doit se dire « c'est MA situation ». Aucune leçon explicite, aucun jugement.

LIVRES SAINTS (exigence du concepteur, v5.0) :
• Si la parabole ou sa culture se rattache à un texte sacré (Bible, Évangiles, Coran, Torah, Talmud, suttas bouddhiques, Vedanta, traditions zen ou soufies…), tu PEUX construire l'histoire autour d'un PASSAGE RÉEL de ces textes — cite alors précisément le livre et le chapitre (ex. « Luc 15 », « Coran 18 », « Talmud, Ta'anit 23a ») et reste FIDÈLE au récit : rien d'inventé dans le passage lui-même.
• Sinon, écris une histoire originale dans l'esprit de ces traditions.
• INTERDIT de citer une référence dont tu n'es pas certain : en cas de doute, écris une histoire originale SANS référence.

Contexte supplémentaire : [${params.contexte}]. Culture : [${params.culture}]. Tonalité : [${params.tonalite}].`;
}

export function promptHistoireEnfant(params: { enonce: string; interpretation: string; contexte: string; culture: string; preoccupation: string }): string {
  return `Tu es un conteur pour enfants de 6 à 12 ans. Rédige une histoire de 100 à 200 mots, avec un vocabulaire simple, un ton chaleureux et rassurant.

CE QUE L'ENFANT A VRAIMENT DEMANDÉ (sa question ou son souci, à traiter directement) : « ${params.preoccupation} »

SPÉCIFICITÉ OBLIGATOIRE (v5.0) : commence par une scène concrète avec un personnage précis et attachant (son nom ou son trait marquant, son lieu, son objet préféré). INTERDITS : « quelqu'un marchait », « une question sans nom », la rivière générique, toute formule interchangeable.

LIVRES SAINTS ET CONTES (exigence du concepteur, v5.0) : tu peux puiser dans un passage simple et réconfortant de la Bible, du Coran, de la Torah ou des grandes traditions (fidèle au texte, référence citée seulement si tu en es certaine — ex. « Psaume 23 »), ou raconter une histoire originale dans cet esprit de confiance et de tendresse.

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

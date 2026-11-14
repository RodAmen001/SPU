// ═════════════════════════════════════════════════════════════════════════════
// v4.8 — HISTORIQUE COMPLET DES VERSIONS (exigence du concepteur : « Quoi de
// neuf » présente l'historique de TOUTES les modifications depuis la création).
// Sources : historique git du dépôt, notes de version intégrées (carte v4.4–v4.7),
// écran « Quoi de neuf — v4.6 ». Les dates sont celles des livraisons réelles.
// ═════════════════════════════════════════════════════════════════════════════

export interface EntreeVersion {
  version: string;
  date: string;
  titre: string;
  points: string[];
  actuelle?: boolean;
}

export const VERSIONS: EntreeVersion[] = [
  {
    version: 'v4.8',
    date: '14/11/2026',
    titre: "Le SPU s'ouvre : menu complet, narration offerte par défaut, musiques variées",
    actuelle: true,
    points: [
      'Barre de menu complète : Comment fonctionne le SPU, Quoi de neuf, Journal de bord, Corpus, Transparence, Confidentialité & RGPD, Soutenir le concepteur — ergonomie repensée sur ordinateur comme sur téléphone.',
      'Narration complète ACTIVÉE PAR DÉFAUT : toute la réponse (parabole, interprétation, histoire, perspective) est lue comme un théâtre audio pour offrir la détente de ne rien lire — un bouton du menu permet de la désactiver ou de la réactiver à tout moment.',
      'Fin de la musique monotone : 51 musiques libres de droits (CC-BY / domaine public, catalogue vérifié lien par lien) tournent au fil des conversations — une ambiance par mode, jamais deux fois la même de suite, musique de réponse distincte à chaque réponse.',
      "Bouton de SORTIE (Quitter) : arrête musique et narration et referme le SPU proprement.",
      "Paraboles mieux orientées : la parabole et son interprétation sont ré-arbitrées contre LA SYNTHÈSE des sources ; si aucune parabole du corpus ne convient efficacement, le SPU retrouve EN LIGNE une parabole réelle et traditionnelle (jamais inventée), avec sa source vérifiée par encyclopédie et une interprétation orientée vers la synthèse.",
      "Écrans modernisés : accueil, modes, pages documentaires — plus clair, plus chaleureux, plus proche de l'objet même de l'application.",
      'Pied de page enrichi : journal de bord, soutien au concepteur, corpus, transparence, RGPD.',
    ],
  },
  {
    version: 'v4.7',
    date: '13/11/2026',
    titre: 'Grande fluidité — le pipeline parallélisé et un budget de réponse garanti',
    points: [
      "La recherche de parabole démarre PENDANT la consultation des sources ; l'histoire et la mise en perspective sont générées en parallèle.",
      'Garde-fou : chaque réponse est plafonnée à 90 secondes — une réponse complète est toujours servie, sur ordinateur comme sur téléphone, même quand les sources sont saturées.',
      'Tonalité détectée localement (instantané, plus d’appel IA sur ce chemin).',
      'Dépôt autosuffisant : corpus embarqué (50 + 15), restauration en une commande, distinction web / Pocket.',
    ],
  },
  {
    version: 'v4.6',
    date: '11/11/2026',
    titre: 'Horodatage complet et narrateur dans tous les modes',
    points: [
      'Toutes les conversations (questions, réponses, journal de bord) portent la date et l’heure (« 13/11/2026 à 07:14 »), à l’écran comme dans l’API.',
      'Quand la voix est activée, le narrateur lit la parabole, son interprétation, l’histoire et la mise en perspective — dans tous les modes.',
      'Sources adaptatives : démarrage à 2 sources ; si la confiance descend sous 50 %, ajout d’une 3ᵉ, puis 4ᵉ, puis 5ᵉ — la configuration la plus cohérente est retenue.',
      'Questions d’affinage plus douces : au plus 2 questions facultatives ; la section « Le Mentor t’écoute » rejoint l’onglet réflexion.',
      'Structure universelle garantie : parabole, interprétation, histoire, mise en perspective pour toute question, dans tous les modes.',
    ],
  },
  {
    version: 'v4.5',
    date: '10/11/2026',
    titre: 'Le narrateur lit toute la réponse, sources adaptatives 2 → 5',
    points: [
      'Toute la réponse est lue par le narrateur (exigence de détente : écrire 10 lignes ne doit pas coûter 5 minutes de lecture).',
      'Sources adaptatives avec confiance ≥ 50 %, sinon meilleur score.',
      "Questions d'affinage facultatives (max 2, invitation douce, poursuite libre).",
      'Guide serveur et zip de distribution v4.5.',
    ],
  },
  {
    version: 'v4.4',
    date: '06/11/2026',
    titre: 'La version web naît sur GitHub — structure universelle de la réponse',
    points: [
      'Première publication du code du SPU web (dépôt léger) ; /api/repondre (JSON + CORS) pour SPU Pocket.',
      'Structure universelle : parabole + interprétation + histoire + mise en perspective ; synthèse repliée en onglet déroulant.',
      'Carte « Quoi de neuf » ; service worker en « réseau d’abord » : fin des versions figées, rafraîchissement automatique.',
      'Fil de discussion horodaté, musique par mode, théâtre sonore, compte SPU (v4.1 → v4.4).',
    ],
  },
  {
    version: 'Avant le web',
    date: 'Avant le 06/11/2026',
    titre: 'Les racines : SPU Pocket et la suite bureautique',
    points: [
      "Le SPU vit d'abord hors du navigateur : application Windows portable et application Android (SPU Pocket v1.0 → v1.2.1, mode nomade à cascade).",
      'Les principes fondateurs y sont posés : corpus clos de paraboles réelles et sourcées, réponse complète lue par le narrateur, « un mentor, pas un maître ».',
      'Le livre blanc (éd. 2.0, embarqué dans l’application) raconte cette genèse en détail.',
    ],
  },
];

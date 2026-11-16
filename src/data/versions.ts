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
    version: 'v6.1',
    date: '16/11/2026',
    titre: 'La voix qui coule sans silence, la musique qui se passe, le BOOST qui se choisit',
    actuelle: true,
    points: [
      'NARRATION CONTINUE (exigence du concepteur) : chaque segment du texte est généré par les voix neuronales PENDANT que le précédent se joue (file de préchargement, 3 segments en avance) — plus aucun blanc de « génération » entre deux phrases ; segments allongés à ~300 caractères, pauses intercalées supprimées, même fluidité pour le théâtre du BOOST.',
      "Bouton « MUSIQUE SUIVANTE » (exigence du concepteur) : toujours visible dans la barre du haut dès que la musique joue — une piste qui déplait se passe d'un clic, en fondu doux, sans couper l'ambiance.",
      "BOOST AU CHOIX de l'utilisateur (exigence du concepteur) : le scénario est prêt DÈS QUE la 3ᵉ question du Mentor trouve sa réponse — il est généré dans le flux (le travail post-réponse dépassait le délai du proxy et provoquait des 502) et PROPOSÉ sous la réponse : « Lancer le BOOST » — maintenant, plus tard, ou jamais. La narration normale se joue toujours.",
      "MODE ENFANT en fil continu (exigence du concepteur) : la zone de question est disponible AVANT et APRÈS la réponse — l'enfant pose une nouvelle question tout de suite, dans la MÊME session, jamais de « nouvelle discussion » obligatoire ; c'est cette continuité qui permet au BOOST (prêt dès la 3ᵉ question corrélative, bande dessinée offerte) de conclure un même sujet.",
      'PERSISTANCE RÉELLE sur les IA : au moins 5 tentatives avant abandon — z.ai (2 essais), puis la chaîne complète Groq → GitHub Models → Pollinations ×3, et une DEUXIÈME PASSE complète après une respiration (les fenêtres de quota tournent) : jusqu\'à 12 tentatives réelles.',
    ],
  },
  {
    version: 'v6.0',
    date: '16/11/2026',
    titre: "Le BOOST, l'Oracle Inversé et les 12 voix : le grand chantier du courage",
    points: [
      "RÈGLE DURE — au moins DEUX sources pour chaque réponse (exigence du concepteur) : la synthèse n'est jamais livrée avec une seule source ; trois passes de patience, rafale finale sur toutes les sources restantes, et le LLM de synthèse doit citer au moins deux sources.",
      "Mode ORACLE INVERSÉ (remplace Deep) : le SPU présente UNE parabole sans son interprétation ; tu dis ce que tu en comprends ; il analyse ta lecture face aux interprétations des intelligences réflexives, te donne LA BONNE INTERPRÉTATION, une APPRÉCIATION valorisante (jamais rabaisser) et une ORIENTATION née du rapprochement ta réponse ↔ parabole.",
      "LE BOOST (exigence du concepteur) : un théâtre audio de 3 à 5 minutes en 5 phases — situation initiale, élément déclencheur, péripéties avec LA DÉCLARATION FORTE, dénouement, situation finale — où le héros, face aux difficultés, se remet en confiance par une décision ferme (parfois suite à l'exhortation vive d'un maître), puis atteint les résultats tant recherchés par ses actions et ses prières.",
      "Le BOOST est JOUÉ par plusieurs personnages, chacun avec SA voix distincte parmi les 12 voix du SPU — jamais une narration mono-voix. En Mentor : il suit la toute dernière question (étape 3/3). En Enfant : il clôt une série d'au moins 3 questions corrélées, sous forme d'une BANDE DESSINÉE défilante synchronisée au théâtre audio.",
      'Musique BOOST dédiée : les pistes épiques, héroïques et triomphantes du catalogue ; le fond épouse chaque scène (douce, tension, déclaration, triomphe).',
      '12 voix principales paramétrées pour des timbres nettement distinctibles (hommes et femmes), hébergées dans le cloud et chargées à la demande.',
    ],
  },
  {
    version: 'v5.0',
    date: '15/11/2026',
    titre: "La réponse qui ne s'arrête plus jamais : histoires vivantes, musique partout, IA en rotation",
    points: [
      "Fin des histoires génériques (exigence du concepteur) : les formules interchangeables (« quelqu'un marchait… », « la voix de l'eau lui parvint », rivière par défaut) sont interdites aux IA ; chaque histoire commence par une scène concrète — lieu, personnage caractérisé, objet — et porte le ressort émotionnel de LA question posée.",
      "Histoires issues des livres saints (exigence du concepteur) : quand la parabole y résonne, l'histoire peut mettre en scène un passage RÉEL de la Bible, du Coran, de la Torah/Talmud ou des grandes traditions — fidèle au texte, référence citée (ex. « Luc 15 », « Coran 18 ») — ou une histoire originale dans leur esprit ; jamais de référence incertaine.",
      'Repli local régénéré : six canevas distincts (forge, port, verger, route, maison, rivière) tissés sur les mots de la question — même sans IA, deux questions différentes ne reçoivent plus la même histoire.',
      "Synthèse qui ne s'arrête plus (exigence du concepteur : « à tout prix, même si une seule IA répond ») : quand le LLM de synthèse est indisponible, une CONSOLIDATION EXTRACTIVE assemble honnêtement les phrases les plus informatives de chaque source, numérotées et attribuées — plus jamais de bloc brut ni de réponse sans matière quand une source vit.",
      "Économie de quota : la synthèse LLM n'est appelée qu'à deux paliers (2 sources, puis toutes) au lieu de quatre — la capacité quotidienne est préservée pour les questions réelles.",
      "IA en rotation multi-modèles (exigence du concepteur) : GitHub Models essaie automatiquement plusieurs modèles gratuits (gpt-4o-mini, gpt-4.1-nano, gpt-4.1-mini, gpt-4o) — chaque modèle a son propre quota journalier, la panne d'un modèle bascule sur le suivant, puis sur Pollinations.",
      "Catalogue musical porté à 100 pistes vérifiées (exigence du concepteur) : musiques libres de droits (CC-BY Kevin MacLeod, domaine public), chaque lien contrôlé — liste complète et liens affichés sur la nouvelle page « Les musiques du SPU ».",
      "La musique est choisie en fonction DE LA PARABOLE offerte : culture (Asie, Afrique de l'Ouest, Méditerranée, celtique…) et famille (patience, courage, ancrage…) orientent l'ambiance ; les pistes se déroulent les unes après les autres sans répétition.",
      "Musique de fond sur CHAQUE page du SPU (exigence du concepteur : « pas de page sans musique ») — l'accueil et les pages documentaires jouent un sac calme dédié.",
      "Son de transition remplacé (exigence du concepteur : l'ancien était trop « vivace ») : une cloche de porcelaine douce, attaque lente et longue décroissance, qui respecte toutes les ambiances musicales.",
      "Mise en perspective variée : même en repli local, le pont entre ta question et la parabole s'exprime en trois formules distinctes au lieu d'une phrase unique répétée.",
    ],
  },
  {
    version: 'v4.9',
    date: '15/11/2026',
    titre: "Le SPU recouvre ses sources : corpus 100, IA en chaîne, accueil vivant",
    points: [
      'Corpus porté à 100 paraboles réelles et sourcées (75 adultes + 25 enfants) : Ésope, La Fontaine, Pancatantra, Talmud, Coran, zen, soufisme, Vedanta, Tolstoï, traditions cherokee et ouest-africaines — chaque lien de source vérifié un par un.',
      "Sources d'intelligence rétablies en production : Wikipédia est de nouveau consultée en DIRECT (API publique, identification User-Agent conforme à la politique Wikimedia) — fin de la dépendance au lecteur SDK absent de l'hébergement.",
      "Priorité aux intelligences réflexives (exigence du concepteur) : les IA sont consultées au premier abord, avec jusqu'à ~20 secondes de patience acceptée, avant la recherche web.",
      "Chaîne de secours multi-moteurs : si un moteur d'IA ne répond pas ou est inaccessible, le suivant est essayé automatiquement — GitHub Models d'abord (inférence incluse au jeton GitHub, configurée via variable d'environnement), puis Pollinations en plusieurs modèles. Jusqu'à ~20 s de patience acceptée par moteur (exigence du concepteur).",
      "Honnêteté totale en cas de panne : si aucune source ne répond, une bannière claire l'annonce (« je n'ai pas pu joindre mes sources ») au lieu d'une formule trompeuse ; la parabole reste réelle et sourcée, servie avec la note honnête « la plus proche ».",
      "Sonde de santé réelle : /api/health teste désormais chaque source en direct (Wikipédia, IA libre, DuckDuckGo) — une panne devient visible le jour où elle arrive, plus jamais invisible des semaines.",
      'Vérification renforcée du repli en ligne : l\'URL d\'encyclopédie n\'est citée que si le titre trouvé correspond vraiment à la parabole retrouvée.',
      "Page d'accueil « vivante » : couleurs, gradients, cartes de modes colorées (ambre pour l'Oracle, émeraude pour le Mentor, violet pour Deep, rose pour l'Enfant) — l'objet même de l'application transparaît dès l'écran d'entrée.",
    ],
  },
  {
    version: 'v4.8',
    date: '14/11/2026',
    titre: "Le SPU s'ouvre : menu complet, narration offerte par défaut, musiques variées",
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

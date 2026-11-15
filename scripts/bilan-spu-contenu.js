// Contenu textuel du bilan de phase de test SPU v4.8 (français).
// Apostrophes typographiques (U+2019) uniquement — aucune apostrophe droite dans les chaînes.

const T = {};

T.titre = "SPU v4.8 — Bilan de la phase de test";
T.sousTitre = "Impressions, remarques et propositions d’amélioration";
T.libelle = "RAPPORT DE TEST SPU";
T.metaLines = [
  "Application : SPU v4.8 — https://spu-web.onrender.com",
  "Tests en production : 15 novembre 2026",
  "Périmètre : interface, API, audio, corpus, déploiement",
  "Rapporteur : agent z.ai — assistant du concepteur",
];
T.piedGauche = "SPU — Système Parabolique Universel";
T.piedDroit = "Novembre 2026";
T.entete = "SPU v4.8 — Bilan de la phase de test";
T.titreTDM = "Table des matières";
T.noteTDM = "Note : cette table des matières est générée par champs. Après toute modification du document, faites un clic droit sur la table puis choisissez « Mettre à jour les champs » pour actualiser les numéros de page.";

// ── 1. Synthèse ──
T.synthese = [
  "Le 15 novembre 2026, une campagne de tests en conditions réelles a été menée sur la version 4.8 du SPU déployée à l’adresse https://spu-web.onrender.com (plan gratuit Render, région Francfort). La campagne a combiné des requêtes HTTP directes contre le site et l’API en production, une revue du code source du dépôt (branche main, commit c2bdac3) et un tirage au sort de huit musiques sur les cinquante et une du catalogue pour vérifier les liens. Le présent rapport en tire les impressions, les remarques et les propositions d’amélioration demandées par le concepteur.",
  "Le constat général est double. D’un côté, la recette d’interface est réussie : l’accueil modernisé, la barre de menu complète, les écrans documentaires, l’historique des versions, le bouton de sortie et le catalogue musical fonctionnent et donnent à l’application la stature qui correspond à son objet. De l’autre, le cœur du pipeline — la chaîne « sources d’intelligence, puis synthèse, puis parabole alignée » — est muet en production : les cinq appels API de test ont tous renvoyé zéro source utilisée, une synthèse vide et une parabole générique prise en rotation, sans qu’aucune erreur ne soit signalée à l’utilisateur.",
  "Trois causes probables, à confirmer par les journaux du serveur, sont identifiées dans le code : l’absence de configuration du SDK de recherche dans l’image Docker, la dépendance à un service d’intelligence gratuit sans clé (Pollinations) dont le quota public sature, et la limitation des accès directs à Wikipédia depuis les adresses de cloud (des réponses 429 documentées par la propre sonde de santé de l’application). Le verdict est un « go conditionnel » : l’interface peut être montrée, mais le cœur doit être rétabli avant toute diffusion large. Six actions correctives prioritaires, dont trois d’un jour de travail chacune au plus, sont détaillées au chapitre 7.",
];

// ── 2. Méthode ──
T.methode = [
  "Les tests ont été exécutés en direct contre la production, sans environnement intermédiaire : chaque mesure correspond à une requête réelle envoyée à https://spu-web.onrender.com le 15 novembre 2026 entre 17 h 20 et 17 h 30 (heure de Paris). La page d’accueil, les points de terminaison /api/health, /api/version et /api/corpus ont été vérifiés d’abord, puis le pipeline de réponse a été sollicité quatre fois par la route JSON /api/repondre (deux questions différentes, dont une répétée) et une fois par la route de flux /api/ask, qui est celle qu’utilise l’interface web. Les durées indiquées sont des temps de bout en bout mesurés côté client.",
  "La revue de code a porté sur les fichiers du pipeline (flux.ts, sources.ts, matching.ts, parabole-en-ligne.ts, llm.ts, audio-engine.ts, tts.ts), sur la configuration de déploiement (Dockerfile, variables d’environnement) et sur les données embarquées (musiques-libres.json, versions.ts). Cette revue ne remplace pas les journaux du serveur : les causes données au chapitre 6 sont donc présentées comme probables et vérifiables, non comme démontrées.",
  "Trois limites de la campagne doivent être déclarées. Premièrement, aucun navigateur graphique n’a été piloté : la conformité des écrans a été vérifiée par le contenu servi et par le code des composants, pas par une observation visuelle complète. Deuxièmement, la narration et la musique n’ont pas été écoutées : c’est la structure du moteur audio (profils de voix, gestion de l’autoplay, répartition des pistes) qui a été passée en revue. Troisièmement, le mode enfant et le protocole de détection de détresse n’ont pas été déclenchés, par prudence déontologique et parce que la panne générale des sources rendait ces tests non significatifs.",
];

// ── 3. Résultats ──
T.resultatsIntro = "Le tableau 1 récapitule les douze vérifications effectuées, avec leur résultat et l’observation correspondante. Deux zones se détachent nettement : tout ce qui est statique ou affirmatif (interface, santé déclarée, corpus, musique) est conforme ; tout ce qui exige des services externes en temps réel (sources, synthèse, arbitrage) est en panne.";

T.tableau1 = {
  titre: "Tableau 1 : Récapitulatif des tests effectués en production le 15/11/2026",
  entetes: ["N°", "Test", "Résultat", "Observation"],
  largeurs: [6, 28, 13, 53],
  lignes: [
    ["1", "Page d’accueil (HTTP)", "Réussi", "Code 200, 42 Ko servis, 0,25 s (service réveillé)."],
    ["2", "Titre et version affichés", "Réussi", "« SPU v4.8 — Système Parabolique Universel » dans le titre de la page."],
    ["3", "Barre de menu", "Réussi", "Les sept entrées annoncées sont servies : Comment fonctionne, Quoi de neuf, Journal de bord, Corpus, Transparence, Confidentialité et RGPD, Soutenir."],
    ["4", "Pied de page", "Réussi", "Journal, soutien au concepteur, corpus, transparence et RGPD présents, avec la signature « Un mentor, pas un maître. »"],
    ["5", "Bouton de sortie", "Réussi", "Dialogue de confirmation « Quitter le SPU ? », coupure de la musique et de la narration prévues par le code v4.8."],
    ["6", "/api/health", "Réussi", "Base de données « up », corpus de 65 paraboles ; la sonde documente elle-même la limitation des accès directs à Wikimedia."],
    ["7", "/api/version", "Réussi", "Serveur 4.8, application Pocket 1.2.0, liste des nouveautés v4.8 servie."],
    ["8", "/api/corpus", "Réussi", "65 paraboles exposées avec familles et total."],
    ["9", "Musiques (échantillon)", "Réussi", "8 liens tirés au hasard sur 51 : tous vivants (HTTP 200, flux audio)."],
    ["10", "/api/repondre — 4 appels", "Anomalie", "0 source utilisée, synthèse vide, confiance absente ; paraboles génériques P011 (deux fois) et P024 en rotation ; aucune erreur signalée."],
    ["11", "/api/ask — flux SSE", "Anomalie", "Aucun événement « synthèse » ; histoire générique en gabarit ; parabole P034 hors seuil ; le statut passe de « sources » à « matching » sans contenu."],
    ["12", "Narration audio en ligne", "Partiel", "Le moteur de voix neuronales Piper n’est pas dans l’image Docker ; /api/tts confirme le repli sur les voix du navigateur, dont la qualité varie selon l’appareil."],
  ],
};

T.resultatsPipeline = [
  "La figure 1 présente les durées mesurées sur les cinq appels du pipeline de réponse. Les deux durées longues (7,1 s et 8,0 s) restent très en dessous du budget de 90 secondes prévu par la configuration, et les trois courtes (2,6 à 3,0 s) correspondent à des échecs presque immédiats des sources. Aucun appel, long ou court, n’a débouché sur une synthèse : la durée ne traduit donc pas une charge utile, mais des tentatives de connexion abandonnées.",
  "Le contenu renvoyé confirme le diagnostic. À la question « Comment retrouver confiance quand tout le monde se moque de mes projets ? », l’API a répondu avec la parabole P011 (« Un voyage de mille lieues commence toujours par un premier pas ») et l’interprétation « L’ampleur d’une tâche ne doit pas paralyser son commencement », sans rapport avec la moquerie ni avec la confiance. À la question « Comment savoir si je dois pardonner à un ami qui m’a menti plusieurs fois ? », le système a servi P024 et la leçon « Revenir compte plus que ce que l’on rapporte », sans lien avec le pardon. Dans les deux cas, le champ de synthèse était une chaîne vide, la liste des sources un tableau vide et le champ de confiance absent ; l’histoire était le gabarit générique « Dans un pays d’Asie (puis de Méditerranée, puis de Nordique / Celtique selon les appels), quelqu’un marchait depuis longtemps, chargé d’une question sans nom. »",
];

T.figLegende = "Figure 1 : Durées des cinq appels API mesurés en production (15/11/2026) — aucune synthèse produite, aucune erreur signalée.";

// ── 4. Impressions ──
T.impressionsIntro = "Avant les anomalies, il faut rendre compte de ce qui réussit, car la réussite est réelle et mérite d’être dite avec précision : la version 4.8 a transformé la perception de l’application.";

T.impressions1 = [
  "La première impression, en arrivant sur la version en ligne, est celle d’une application enfin au niveau de son ambition. Le titre de la page annonce le projet sans détour, la barre de menu réunit les sept entrées promises et les écrans documentaires (Comment fonctionne le SPU, Quoi de neuf, Journal de bord, Corpus, Transparence, Confidentialité et RGPD, Soutenir le concepteur) sont servis avec un contenu réel et rédigé. L’historique des versions, en particulier, est un modèle du genre : l’entrée v4.8 détaille huit points de modification en français clair, et la chaîne remonte jusqu’aux versions d’avant le web. Une application qui se raconte ainsi, avec des dates et des contenus vérifiables, inspire confiance avant même la première question posée.",
  "Le bouton de sortie, petite fonction en apparence, porte la même exigence : il ne ferme pas brutalement la fenêtre, il coupe la musique et la voix, puis propose un dialogue de confirmation « Quitter le SPU ? ». C’est exactement le genre de détail qui distingue un outil soigné d’une page web ordinaire, et il répond à la demande du concepteur en toutes lettres.",
];
T.impressions2 = [
  "Le travail sur l’ambiance sonore est le second grand succès de cette version. Le catalogue de cinquante et une musiques libres de droits est complet, structuré et vérifié : l’échantillon tiré au sort pour cette campagne a rendu huit liens vivants sur huit, tous en flux audio direct. La répartition par usage est pensée (quatorze pistes pour l’oracle, onze pour le mode d’approfondissement, dix pour le mentorat, neuf pour les enfants, sept pour la réponse), l’anti-répétition « jamais deux fois la même de suite » est codée, et la gestion de l’autoplay l’est tout autant : les navigateurs refusent le son tant que l’utilisateur n’a pas interagi, et le moteur le sait, met la lecture en attente et la reprend au premier clic au lieu d’échouer en silence.",
  "La narration théâtrale repose sur dix profils de voix distincts (narrateur, sage, aïeule, enfants, adultes, conteur du soir), avec une rotation des voix pour les personnages dialogués. Le principe des deux étages — voix neuronales Piper quand elles sont installées, voix du navigateur sinon — est sain et honnête : en ligne, la route /api/tts annonce elle-même le repli. La promesse d’une réponse entièrement lue à voix haute est donc tenue structurellement ; c’est la constance de la qualité entre navigateurs qui fera la différence, et elle dépend d’une décision d’embarquement discutée au chapitre 7.",
];
T.impressions3 = [
  "La troisième impression est celle d’une ingénierie de défense sérieuse, héritée des versions précédentes et toujours en place : une phase zéro de détection de détresse qui court avant toute réponse et propose des ressources d’aide plutôt qu’une parabole ; une limite de vingt requêtes par minute et par adresse ; un cache de vingt-quatre heures par question ; un budget de temps par appel ; et une règle morale forte, écrite dans le code, qui interdit à l’intelligence artificielle d’inventer une parabole et garantit qu’en dernier recours le corpus offre une histoire réelle, honnêtement signalée comme « sous le seuil » de pertinence.",
  "Cette culture de la garde est précisément ce qui rend l’anomalie du chapitre suivant si instructive : le système a été blindé contre l’invention et l’abus, mais pas contre la panne silencieuse de ses propres sources. Le blindage fonctionne ; c’est le capteur qui manque.",
];

// ── 5. Remarques ──
T.remarqueMajeure = [
  "Anomalie A1 (majeure, bloquante pour la diffusion) : en production, le pipeline « sources, puis synthèse, puis parabole alignée » ne produit rien. Les cinq appels de test ont renvoyé zéro source utilisée, une synthèse vide et une confiance absente, tout en déclarant ok à vrai et erreur à nul. Le filtrage sémantique tourne alors à vide : il classe un texte vide contre le corpus, obtient des scores nuls, et la garantie « toujours une parabole » sert une histoire prise en rotation déterministe — P011 deux fois, P024, P034 — dont l’interprétation ne peut pas être « orientée vers la synthèse » puisqu’il n’y a pas de synthèse.",
  "Cette panne rend inopérantes les deux promesses centrales de la version 4.8. La première, « la parabole et son interprétation sont ré-arbitrées contre la synthèse des sources », n’a pas de matière à arbitrer. La seconde, le repli en ligne qui retrouve une parabole traditionnelle vérifiée par encyclopédie, dépend elle-même d’un service d’intelligence en ligne et d’un appel direct à Wikipédia : elle ne peut donc pas se déclencher utilement tant que ces accès sont rompus. L’alignement parabole et synthèse exigé par le concepteur reste correctement écrit dans le code, mais il n’est actuellement évaluable ni en production ni par les tests, faute de synthèse.",
];
T.remarqueInvisible = [
  "Anomalie A2 (grave par ses effets) : cette panne est invisible pour l’utilisateur. Le message prévu pour l’échec des sources (« Je n’ai pas pu joindre mes sources d’intelligence artificielle et de recherche… ») n’est jamais affiché, parce que la garantie « toujours une parabole » fait toujours trouver un candidat et court-circuite la branche d’erreur. Ce que l’utilisateur voit, c’est une note discrète en italique sous la parabole : « Parabole la plus proche du corpus pour ta question — une recherche de correspondances plus fines est en cours dans mon corpus. » Cette phrase sous-estime complètement la situation : rien n’est « en cours », les sources sont en échec, la synthèse est vide.",
  "Pour une application dont la page Transparence affiche la rigueur et dont la signature est « Un mentor, pas un maître », ce silence est un problème de fond, pas de forme : il laisse la personne croire qu’elle a reçu un éclairage pertinent alors qu’elle a reçu un gabarit. Le correctif est simple et déjà préparé par le code — le flux connaît un état de mode dégradé — mais il doit remonter jusqu’à l’écran sous une forme honnête : dire que les sources sont indisponibles, inviter à réessayer, et ne pas promettre une recherche fictive.",
];
T.remarqueCCBY = [
  "Remarque A3 (conformité, correction facile) : les cinquante et une musiques du catalogue sont l’œuvre de Kevin MacLeod, publiées sur incompetech.com sous licence Creative Commons Attribution 4.0. Cette licence autorise l’usage commercial et la modification, mais elle exige une attribution visible et raisonnable du nom de l’auteur. Or, dans la version en ligne, le crédit n’existe que dans un commentaire du fichier du moteur audio : aucune mention n’apparaît dans l’interface, ni sur la page Transparence, ni dans le pied de page. Une ligne dans la page Transparence et une mention en pied de page (« Musiques : Kevin MacLeod, incompetech.com — licence CC-BY 4.0 ») suffiraient à régulariser l’ensemble du catalogue.",
];
T.remarquesSecondaires = [
  "Plusieurs remarques secondaires ont été relevées au fil des tests et de la revue de code ; aucune n’est urgente, mais toutes méritent d’entrer dans la file des corrections. D’abord, la route /api racine répond encore « Hello, world! » : c’est un reste d’échafaudage du cadre de développement, sans utilité, qui expose un point de terminaison vide. Ensuite, la route /api/repondre, prévue pour l’application Pocket, convertit silencieusement les modes mentor et approfondissement vers le mode oracle : le cahier des charges de l’APK devrait le dire, ou la route devrait les accepter.",
  "Le catalogue musical, enfin, repose à cent pour cent sur un seul domaine (incompetech.com) : si ce domaine réorganise ses adresses, l’intégralité de la bande-son s’effondre d’un coup. Diversifier les sources (Free Music Archive, Pixabay Music, Musopen) réduirait ce risque, et une revue d’affectation serait utile pour quelques pistes à ambiance sombre ou agressive (mentionnées « Unnerving », « Aggressive » dans les métadonnées) qui semblent mal placées pour certains usages. Par ailleurs, trois jetons d’accès ont transité par le chat au moment du déploiement (GitHub, Render, Hugging Face) : les deux premiers doivent être régénérés une fois la version stabilisée, et le troisième, devenu inutile après l’abandon de Hugging Face, peut être supprimé avec sa variable d’environnement. Enfin, la question anonymisée est envoyée au service Pollinations : la page Confidentialité et RGPD, déjà bien faite, gagnerait une phrase explicite sur ce destinataire tiers.",
];

// ── 6. Causes ──
T.causes = [
  "Le code du pipeline appelle quatre sources d’intelligence : une recherche web par le SDK, une intelligence réflexive intégrée, une encyclopédie (Wikipédia par le lecteur du SDK) et une réponse instantanée DuckDuckGo, le tout complété par un moteur de secours gratuit sans clé (Pollinations) pour la synthèse et l’arbitrage. La revue du déploiement montre que l’image Docker ne définit que quatre variables d’environnement (l’environnement d’exécution, le port, l’adresse d’écoute et la base de données) : aucune configuration du SDK n’y est embarquée. Or le SDK exige un fichier de configuration ou un jeton ; en son absence, l’appel échoue et la source est mise à nul. C’est la première cause probable : dans le bac à sable du développement, le SDK est configuré, donc tout paraît fonctionner ; sur Render, il ne l’est pas.",
  "La deuxième cause probable est le quota du service de secours. Le code anticipe explicitement les réponses de limite gratuite (« Free limit ») et les traite comme un échec : ce service public, sans clé, est en première ligne pour la synthèse, et son quota est partagé par tous ses utilisateurs. La troisième cause probable est documentée par l’application elle-même : la sonde de santé précise que l’accès direct à Wikipédia est limité dans l’environnement d’exécution, signe classique de réponses 429 renvoyées aux adresses de cloud qui ne respectent pas la politique d’identification des clients de Wikimedia. La nouvelle vérification d’encyclopédie du repli en ligne fait un appel direct sans en-tête d’identification adapté : elle subira la même limite.",
  "La combinaison de ces trois causes produit exactement le symptôme observé : quatre sources à nul, une synthèse vide, un arbitrage sans matière, et le repli local (histoire en gabarit, parabole en rotation) qui prend le relais sans rien dire. Ces causes restent « probables » tant que les journaux Render n’ont pas été lus ; les actions correctives du chapitre 7 sont toutefois valables dans tous les cas, car elles suppriment la dépendance plutôt que d’espérer la stabilité d’un service gratuit.",
];

// ── 7. Propositions ──
T.propositionsIntro = "Les propositions sont classées en trois niveaux : P1 rassemble ce qui doit être fait avant de diffuser largement l’adresse du site, P2 ce qui améliore la qualité et la conformité dans la foulée, P3 ce qui prépare la suite. Chaque action est formulée pour être exécutable telle quelle.";

T.propositionsP1 = [
  "Première action (P1) — rétablir au moins une source fiable en production : appeler l’interface publique de Wikipédia avec un en-tête d’identification conforme à la politique de Wikimedia (un nom d’agent utilisateur descriptif et une adresse de contact). Cette interface est gratuite, stable et conçue pour les applications ; une seule source vivante suffirait déjà à produire une synthèse et à réarmer l’alignement parabole-synthèse. L’appel DuckDuckGo déjà codé peut servir de second canal.",
  "Deuxième action (P1) — trancher la question du SDK : soit remplacer les appels au SDK par des interfaces publiques directes partout, soit fournir la configuration du SDK à Render par des variables d’environnement (sans jamais la committer dans le dépôt). Tant que la configuration vit hors du dépôt et hors de l’image, la production et le développement ne testeront jamais la même chose.",
  "Troisième action (P1) — ne plus dépendre d’un seul service gratuit pour la synthèse : ajouter un nouvel essai espacé côté Pollinations, prévoir un second moteur de secours et accepter une clé optionnelle par variable d’environnement. Quatrième action (P1) — dire la vérité en cas de panne : quand aucune source ne répond, afficher le message prévu (« sources indisponibles, réessayez dans quelques instants ») et supprimer la mention « une recherche de correspondances plus fines est en cours », qui promet ce qui n’existe pas.",
  "Cinquième action (P1) — rendre la sonde de santé sincère : enrichir /api/health d’un test actif léger des quatre sources et consigner un compteur de succès et d’échecs dans les journaux Render. Avec ce compteur, la panne actuelle aurait été visible le jour du déploiement. Sixième action (P1) — installer une sentinelle automatique : une action GitHub qui, après chaque poussée, appelle /api/repondre avec une question de test et échoue si la liste des sources est vide. C’est le garde-fou qui manque à une chaîne d’outils par ailleurs bien construite.",
];
T.propositionsP2 = [
  "Au niveau P2, cinq actions simples améliorent la conformité et la robustesse. Ajouter l’attribution musicale exigée par la licence CC-BY : une ligne sur la page Transparence et une mention en pied de page créditant Kevin MacLeod et incompetech.com. Supprimer la route d’échafaudage /api qui répond « Hello, world! ». Documenter côté application Pocket la conversion des modes, ou activer réellement mentor et approfondissement sur /api/repondre. Diversifier le catalogue musical vers deux ou trois sources supplémentaires et réaffecter les pistes à ambiance sombre. Régénérer les jetons GitHub et Render, supprimer le jeton Hugging Face devenu inutile, et ajouter à la page Confidentialité une phrase sur le service Pollinations comme destinataire de la question anonymisée.",
];
T.propositionsP3 = [
  "Au niveau P3, trois pistes préparent la version suivante. Embarquer les voix neuronales Piper dans l’image Docker, pour que la narration ait la même qualité sur tous les appareils — en pesant le gain contre la taille de l’image et la mémoire du plan gratuit. Publier une page de statut simple alimentée par la sonde de santé enrichie, dans l’esprit de transparence de l’application. Et, quand l’usage le justifiera, prévoir une sauvegarde périodique des comptes et des échanges vers un stockage persistant, le plan gratuit effaçant le système de fichiers à chaque redéploiement (l’entrée de démarrage restaure déjà la base du corpus, mais les données des utilisateurs ne sont pas couvertes).",
];

T.tableau2 = {
  titre: "Tableau 2 : Plan d’action récapitulatif",
  entetes: ["Priorité", "Action", "Effort estimé", "Effet attendu"],
  largeurs: [11, 40, 13, 36],
  lignes: [
    ["P1", "Wikipédia publique avec en-tête conforme (source principale)", "Demi-journée", "Une synthèse vivante ; l’alignement parabole-synthèse réarmé."],
    ["P1", "SDK : appels publics directs ou configuration par variables Render", "Demi-journée", "Production et développement testent la même chose."],
    ["P1", "Pollinations : nouvel essai espacé, second moteur, clé optionnelle", "Un jour", "La synthèse ne dépend plus d’un seul service gratuit."],
    ["P1", "Message honnête quand 0 source (fin de la mention trompeuse)", "Deux heures", "L’utilisateur sait que le service est dégradé."],
    ["P1", "Sonde de santé active des 4 sources + compteur dans les journaux", "Demi-journée", "La panne devient visible le jour où elle arrive."],
    ["P1", "Sentinelle GitHub après chaque déploiement (échec si 0 source)", "Deux heures", "Régressions attrapées avant l’utilisateur."],
    ["P2", "Crédits CC-BY (Transparence + pied de page)", "Une heure", "Conformité de licence pour les 51 pistes."],
    ["P2", "Diversifier la musique ; réaffecter les ambiances sombres", "Un jour", "Moins de dépendance à un seul domaine."],
    ["P2", "Jetons : régénérer GitHub et Render, supprimer Hugging Face", "Une heure", "Secrets compromis par le chat neutralisés."],
    ["P3", "Piper embarqué dans l’image Docker", "Un à deux jours", "Narration identique sur tous les appareils."],
    ["P3", "Page de statut publique + sauvegarde persistante des comptes", "À chiffrer", "Transparence et durabilité accrues."],
  ],
};

// ── 8. Conclusion ──
T.conclusion = [
  "Le verdict de cette phase de test s’écrit en une phrase : la maison est belle, mais le moteur est arrêté. La recette d’interface de la version 4.8 est passée — accueil, menu, écrans documentaires, sortie, historique, musique, structure de narration — et l’ensemble donne enfin à voir l’objet du SPU plutôt qu’une soupe de menus techniques. La culture d’ingénierie défensive héritée des versions antérieures est intacte et honorable.",
  "Mais le cœur promis — des sources qui écoutent la question, une synthèse qui la comprend, une parabole alignée sur ce qui a été compris — est actuellement muet en production, et il le fait en silence. Cinq appels sur cinq ont rendu un gabarit au lieu d’une réponse, sans jamais avouer la panne. Pour un mentor qui fait de la transparence sa signature, c’est le seul vrai risque de cette version : non que le système échoue, mais qu’il échoue en prétendant réussir.",
  "La voie de sortie est courte et balisée : rétablir une source fiable (demi-journée), arrêter la dépendance au SDK et au service gratuit unique (un jour), dire la vérité à l’écran quand les sources taisent (deux heures), puis installer la sonde sincère et la sentinelle automatique pour que la panne ne repasse plus inaperçue. En trois jours de travail ciblé, le SPU peut redevenir ce que sa page d’accueil promet : un mentor qui écoute vraiment la question avant de répondre. La recommandation est donc un « go conditionnel » : montrer l’interface, oui ; diffuser l’adresse, seulement après les corrections P1 et une nouvelle passe de tests sur la même batterie de questions.",
];

module.exports = T;

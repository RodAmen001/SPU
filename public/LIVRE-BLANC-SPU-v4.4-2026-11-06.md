# LIVRE BLANC — SPU : SYSTÈME PARABOLIQUE UNIVERSEL

_Le concept, en son état actuel — édition « version normale »_


ÉDITION 1.1 — 6 novembre 2026
HISTORIQUE DES ÉDITIONS DU DOCUMENT
  Édition 1.0 — 6 novembre 2026 : première édition complète.
  Édition 1.1 — 6 novembre 2026 : résumé 10 lignes, exemple réel de bout
      en bout, schéma du pipeline, tableau comparatif, profil de coût,
      cadre légal des mineurs, licence, annexe d'hébergement, bordures
      raccourcies, version compagnon .md.

LICENCE DU DOCUMENT : © 2026, projet SPU. Document du propriétaire du
système, rédigé avec assistance d'IA et vérifié sur le code réel.
Réutilisation autorisée avec mention du projet ; la bibliothèque de
textes suit ses propres sources (Wikimédia, licences correspondantes).

Document rédigé le 6 novembre 2026
Serveur : SPU v4.4  ·  Application compagnon : SPU Pocket v1.2.0
Portée : ce livre décrit le SPU complet (application web / serveur),
        pas seulement l'application Android. SPU Pocket fait l'objet
        de la section 12 uniquement.

**CE LIVRE EN 10 LIGNES (pour aller vite)**


  1. Le SPU répond à une question de vie en TROIS couches : une synthèse
     sourcée, une parabole réelle, une histoire sur mesure.
  2. Il interroge 4 sources en 8 secondes (web, IA, Wikipédia,
     DuckDuckGo) et cite ses sources — jamais d'affirmation nue.
  3. Il ne génère JAMAIS de sagesse : 65 textes vérifiés, 5 cultures,
     35 URLs documentées, validation en quarantaine pour tout ajout.
  4. La sécurité passe avant tout : détection de détresse en 3 couches
     AVANT tout appel externe, espace enfant protégé.
  5. Confidentialité : sessions anonymes, purge 90 jours, effacement
     immédiat, logs de détresse sans aucun texte.
  6. Quatre modes : Oracle (unique), Mentor (3 étapes), Deep
     (contemplatif), Enfant (6–12 ans, contes).
  7. Voix : théâtre sonore à 10 profils français (Piper TTS), musique
     par mode, débit réglable.
  8. Web installable hors ligne (PWA) + APK Android de 62 Ko avec mode
     nomade sans serveur.
  9. Chiffres mesurés : phase 0 à 30/30, matching top-1 à 90 %,
     top-3 à 100 %, réponse Oracle ~9 s (streaming dès 0,8 s).
 10. Devise d'interface : « Un mentor, pas un maître. »

**SOMMAIRE**


 1.  Résumé exécutif
 2.  La vision et les principes fondateurs
       2.4  Ce qui change concrètement : IA générale vs SPU
 3.  Le concept central : une réponse en trois couches
       3.5  Un exemple réel, de bout en bout
 4.  La bibliothèque universelle : 65 textes, 5 cultures, 10 familles
 5.  Le pipeline complet, étape par étape
       5.1  Phase 0 — le filtre de détresse (3 couches)
       5.2  La sécurité enfant
       5.3  L'orchestration des 4 sources (8 secondes)
       5.4  La synthèse sourcée
       5.5  Le choix de la parabole (TF-IDF + arbitrage)
       5.6  L'histoire personnalisée et son filtre
 6.  Les quatre modes d'écoute (plus la perspective)
 7.  La voix et le son : un théâtre à 10 voix
 8.  Mémoire, confidentialité et RGPD
       8.5  Le cadre légal des mineurs
 9.  Les comptes SPU et les instantanés
10.  La sécurité technique
11.  L'interface utilisateur
12.  SPU Pocket, l'application compagnon (Android)
13.  Architecture technique et chiffres clés
       13.5  Le profil de coût d'une question
14.  Les limites actuelles — une évaluation honnête
15.  Feuille de route
16.  Glossaire
Annexe A.  Inventaire des fichiers clés
Annexe B.  Historique des corrections et reconstructions
Annexe C.  Faire tourner le SPU soi-même

## 1. RÉSUMÉ EXÉCUTIF


Le Système Parabolique Universel (SPU) est un orchestrateur narratif
multi-IA : l'utilisateur pose une question de vie — courage, patience,
justice, deuil, décision, relation — et le SPU lui répond en trois
couches superposées :

  (1) une synthèse claire et sourcée, construite en 8 secondes maximum
      à partir de quatre sources d'intelligence interrogées en
      parallèle ;
  (2) une parabole réelle, tirée d'une bibliothèque closse de 65 textes
      authentiques issus de 5 cultures du monde, avec son interprétation ;
  (3) une histoire courte, écrite sur mesure pour la préoccupation
      précise de l'utilisateur, puis filtrée contre 19 patterns de
      contenus inappropriés.

Le tout est servi par une application web installable (PWA), avec quatre
modes d'écoute (Oracle, Mentor, Deep, Enfant), un théâtre sonore à dix
voix neuronales françaises, un journal de bord exportable, des comptes
anonymes sans adresse e-mail et une politique de confidentialité stricte
(purge à 90 jours, effacement immédiat, logs de détresse sans aucune
donnée textuelle).

Une application Android compagnon, SPU Pocket (62 Ko), embarque la même
bibliothèque hors ligne et propose deux façons de poser ses questions :
via un serveur SPU, ou en « mode nomade » sans aucun serveur.

Le SPU est construit autour d'une conviction simple : les IA générales
répondent vite, mais elles répondent souvent sans racines, sans profondeur
culturelle et sans retenue. Le SPU fait l'inverse : il ancre chaque
réponse dans une sagesse documentée et vérifiable, et il refuse
délibérément d'inventer de la sagesse. Sa devise d'interface résume sa
place : « Un mentor, pas un maître. »

État de santé au jour de la rédaction : corpus complet (65/65 textes),
base de données opérationnelle (8 tables), 23 routes API, pipeline de
sécurité testé (30/30 cas de détection), matching mesuré (top-1 : 90 %,
top-3 : 100 % sur la batterie de tests), serveur de production actif sous
la surveillance d'un gardien automatique.

USAGE RÉEL : le système sert déjà de vraies conversations (l'exemple de
la section 3.5 est un échange réel journalisé). Compteurs au jour de
l'édition : la base a été reconstruite le 6 novembre au soir (recyclage
de l'environnement d'exécution ; les échanges de la journée ont été
perdus avec elle), les compteurs repartent de zéro et l'architecture a
été rendue résistante à ce type d'incident (Annexe B).

## 2. LA VISION ET LES PRINCIPES FONDATEURS


### 2.1 Le problème

Une question de vie posée à une intelligence artificielle générale reçoit
une réponse fluide, polie… et interchangeable. Le même ton, la même
structure, les mêmes conseils « équilibrés ». Rien n'ancre la réponse
dans une culture, rien ne la rend mémorable, rien ne la rend discutable.
Et pour un enfant, ces réponses sont carrément dangereuses à utiliser
telles quelles.

### 2.2 La réponse du SPU

Le SPU ne prétend pas répondre mieux que les grandes IA : il répond
autrement, en combinant trois choses que les IA générales ne combinent
pas spontanément :

  - la largeur — une synthèse qui croise plusieurs sources réelles
    (recherche web, encyclopédie, moteur d'avis instantanés) et cite
    ses références ;
  - la profondeur — une parabole authentique, choisie dans une
    bibliothèque documentée, avec son interprétation et ses sources ;
  - la proximité — une histoire courte écrite pour la situation
    concrète de la personne, jamais générique.

### 2.3 Les principes fondateurs (constatés dans le code)

  PRINCIPE 1 — CORPUS CLOS. Le SPU ne génère jamais de parabole. Les 65
  textes viennent de sources documentées (Wikisource, Wikipédia,
  Wikiquote — 35 URLs vérifiées). Un texte nouveau entre par la
  « quarantaine », un workflow de validation à deux statuts (pending →
  validated / rejected), protégé par un jeton d'administration. La
  sagesse ne s'invente pas, elle se transmet.

  PRINCIPE 2 — HONNÊTETÉ DE DÉGRADATION. Si les quatre sources externes
  échouent (réseau coupé, quota épuisé), le SPU ne bluffe pas : il
  bascule en « mode dégradé » et puis directement dans la bibliothèque
  locale, en le disant. La cohérence affichée descend, le signal
  « sous seuil » apparaît quand une parabole n'est que « la plus proche
  du corpus ».

  PRINCIPE 3 — SÉCURITÉ AVANT INTELLIGENCE. La phase 0 (détresse) et la
  couche enfant s'exécutent AVANT tout appel externe. Aucune question
  en détresse ne part vers un moteur tiers ; elle reçoit une réponse
  humaine, des ressources réelles (numéros d'urgence), et rien d'autre.

  PRINCIPE 4 — PRIVATÉ PAR CONSTRUCTION. Sessions anonymes par défaut,
  purge à 90 jours, effacement immédiat sur demande, logs de détresse
  réduits à un hash SHA-256 et trois scores numériques — jamais de
  texte.

  PRINCIPE 5 — RENDRE LA PAROLE. Chaque parcours se termine par une
  question ouverte : le SPU n'est pas un oracle qui clôt, c'est un
  mentor qui ouvre. La perspective est toujours un ajout (80 à 120
  mots), jamais une conclusion.

  PRINCIPE 6 — ACCESSIBILITÉ RÉELLE. Lecture vocale complète à 10 voix,
  débit réglable de 60 à 140 %, mode enfant avec gros boutons et
  théâtre sonore, application Android de 62 Ko qui fonctionne sur des
  téléphones modestes (Android 7+), PWA installable qui survit hors
  ligne.

### 2.4 CE QUI CHANGE CONCRÈTEMENT : IA GÉNÉRALE vs SPU

  Critère              | IA générale         | SPU
  ------------------+------------------+------------------
  Sagesse              | générée à la volée  | corpus clos, 65 textes
                       |                     | sourcés et vérifiables
  Sources              | souvent citées de   | 4 sources réelles en
                       | mémoire sans lien   | parallèle + URLs
  Réponse              | un bloc de conseils | 3 couches : synthèse,
                       |                     | parabole, histoire
  Mémorabilité         | faible (ton unique) | forte (le récit ancre)
  Contradictions       | souvent lissées     | à mentionner (imposé)
  Question de détresse | répond au contenu   | STOP immédiat + numéro
                       |                     | d'urgence réel
  Mode enfant          | avertissement       | filtre avant traitement,
                       | éventuel            | corpus de 15 contes
  Hors ligne           | non                 | PWA + bibliothèque
                       |                     | embarquée dans l'APK
  Fin de la réponse    | un verdict          | une question ouverte

  Ce tableau est l'argument le plus court du projet : le SPU n'est pas
  « une IA de plus », c'est une autre architecture de la réponse.

## 3. LE CONCEPT CENTRAL : UNE RÉPONSE EN TROIS COUCHES


### 3.1 Couche 1 — la synthèse sourcée

Le SPU interroge quatre sources en parallèle et en 8 secondes maximum
(voir 5.3), puis les fait converger en une synthèse de 3 phrases et
120 mots maximum, avec citations numérotées [1] [2] et un indicateur de
confiance (cohérence des sources, en pourcentage). Les contradictions
entre sources doivent être mentionnées, pas lissées.

### 3.2 Couche 2 — la parabole

Une parabole réelle est choisie dans la bibliothèque par un système à
deux étages (scoring TF-IDF puis arbitrage par IA, voir 5.5). Elle est
présentée avec : son énoncé, sa culture d'origine, sa famille thématique
(F1 à F10), son code d'identification (P001…P050 / E001…E015), et l'une
de ses 3 interprétations officielles. C'est le cœur du SPU : le point
où la réponse devient mémorable et discutable — parce qu'elle est
sourcée et datée culturellement.

### 3.3 Couche 3 — l'histoire

Une histoire courte (150 à 300 mots adulte, 100 à 200 mots enfant) est
écrite par l'IA avec pour seule consigne d'ancrage : la préoccupation
réelle de l'utilisateur. Elle est passée à un filtre de contenu (19
patterns interdits) ; en cas d'échec, une régénération renforcée, puis
en dernier recours un texte de repli intégré — le SPU préfère une
histoire ordinaire à une histoire problématique.

### 3.4 Ce qui circule réellement

Le déroulé visible par l'utilisateur : un fil de discussion de type
messagerie (question à droite, réponse à gauche), un indicateur
d'attente avec 5 phrases de patience en rotation, puis les trois couches
qui apparaissent en streaming (l'histoire arrive par fragments de 3 mots,
avec une pause de 35 ms — un débit calibré pour la lecture à voix haute).

### 3.5 UN EXEMPLE RÉEL, DE BOUT EN BOUT

Échange réel de mise au point (journalisé le 6 novembre 2026, mode
Oracle via la route JSON de l'application Android) :

  LA QUESTION (réelle)
  « Comment retrouver courage et patience quand tout semble échouer ? »

  CE QUI S'EST PASSÉ (chronologie réelle, ~17 secondes)
  - 0 s      la question entre ; la phase 0 la classe « pass » (aucune
             détresse) ; le mode n'est pas enfant — fil enfantine OK ;
  - 0–8 s    4 sources interrogées en parallèle ; les extraits
             retenus sont mis en cache 24 h ;
  - ~8–10 s  synthèse sourcée affichée (≤ 3 phrases, citations,
             indicateur de cohérence) ;
  - ~10–12 s MATCHING : la parabole P012 est retenue —
             « Tombe sept fois, relève-toi huit. »
             Culture : Asie · Famille F3 (Courage) · score au-dessus
             du seuil de confiance ;
  - ~12–17 s l'histoire (ancre : l'échec qui se répète) arrive en
             streaming par fragments de 3 mots, lisible à voix haute ;
  - 17 s     l'échange est journalisé (session + échange + code de
             parabole), le SPU rend la parole.

  CE QUE L'UTILISATEUR VOIT, ÉCRAN PAR ÉCRAN
  1. son message à droite, l'indicateur de patience en rotation ;
  2. « 🧭 Réponse » : la synthèse + 🔎 n sources + cohérence X % ;
  3. « 📜 Parabole » : le proverbe, sa culture, son interprétation
     (« L'échec n'est définitif que si l'on choisit d'y rester. ») ;
  4. « 📖 Histoire » : le récit personnalisé, avec le bouton
     « ▶ Écouter la réponse ».

  Pourquoi c'est différent d'une réponse d'IA générale : l'expérience
  se termine sur un proverbe ASIATIQUE DATÉ ET SOURCÉ que l'utilisateur
  peut rechercher, partager, contredire — pas sur un conseil flottant.

## 4. LA BIBLIOTHÈQUE UNIVERSELLE : 65 TEXTES, 5 CULTURES, 10 FAMILLES


### 4.1 Composition

  - 50 paraboles adultes : codes P001 à P050
  - 15 contes enfants : codes E001 à E015 (mode « Le Jardin des Contes »)
  - Total : 65 textes — la même bibliothèque exacte est embarquée dans
    l'application Android (fichier data.js, 48 Ko)

### 4.2 Les 5 cultures

  Afrique de l'Ouest · Asie · Méditerranée · Nordique / Celtique ·
  Universaliste

  Répartition adulte : 10 textes par culture (50 au total) ;
  répartition enfant : 4 cultures, 15 contes.

### 4.3 Les 10 familles thématiques (F1 à F10)

  F1 Patience      F2 Détachement   F3 Courage       F4 Justice
  F5 Renouveau     F6 Ancrage       F7 Légèreté      F8 Intégrité
  F9 Action        F10 Relation

### 4.4 La documentation de chaque texte

Chaque entrée porte exactement : un code unique, le texte, la culture,
la famille, TROIS interprétations (le matching choisit laquelle servir),
des sources (libellé + URL) et 20 à 25 mots-clés éditoriaux utilisés par
l'index de recherche (comptés double dans le score).

### 4.5 L'origine documentée — 35 URLs uniques

  fr.wikiquote.org   19 URLs
  fr.wikipedia.org   12 URLs
  fr.wikisource.org   3 URLs
  en.wikisource.org   1 URL

  Un script dédié (verify-urls) permet de re-vérifier les 35 liens à la
  demande.

### 4.6 Pourquoi un corpus clos est une force

Un corpus de 65 textes vérifiés vaut mieux que 10 000 « citations »
générées dont personne ne peut vérifier l'origine. Le SPU assume cette
petitesse volontaire : c'est la condition de sa fiabilité. La croissance
prévue (voir feuille de route, section 15) passe par la quarantaine —
un texte soumis n'entre dans la bibliothèque qu'après validation — pas
par la génération.
## 5. LE PIPELINE COMPLET, ÉTAPE PAR ÉTAPE


VUE D'ENSEMBLE (le dessin de la question, de l'entrée à la sortie) :

  La question entre (1–2000 caractères)
              │
              ▼
  ┌───────────────────────────────────────────────┐
  │ PHASE 0 · filtre de détresse                  │
  │   couche A : 14 expressions régulières        │
  │   couche B : classifieur IA (score 0–1)       │
  │   couche C : 51 mots négatifs + 18 rupture    │
  │   → crise/vigilance : ressources + STOP       │
  └───────────────────────────────────────────────┘
              │ pass
              ▼
  ┌───────────────────────────────────────────────┐
  │ SÉCURITÉ ENFANT (mode enfant uniquement)      │
  │   couche A + 4 thèmes interdits               │
  │   → interception : message doux + STOP        │
  └───────────────────────────────────────────────┘
              │ continu
              ▼
  ┌───────────────────────────────────────────────┐
  │ 4 SOURCES EN PARALLÈLE (8 s max)              │
  │   web · LLM réflexif · Wikipédia · DuckDuckGo │
  │   cache 24 h · 20 req/min/IP                  │
  │   toutes échouées → MODE DÉGRADÉ annoncé      │
  └───────────────────────────────────────────────┘
              │ extraits
              ▼
  ┌───────────────────────────────────────────────┐
  │ SYNTHÈSE sourcée (≤ 3 phrases, ≤ 120 mots,    │
  │ citations [1][2], score de confiance)         │
  └───────────────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────────────┐
  │ PARABOLE — TF-IDF (top 8) puis arbitrage IA   │
  │ seuil 0,65 · 3 interprétations au choix       │
  └───────────────────────────────────────────────┘
              │
              ▼
  ┌───────────────────────────────────────────────┐
  │ HISTOIRE sur mesure (ancre = la question)     │
  │ filtre 19 patterns · stream 3 mots/35 ms      │
  └───────────────────────────────────────────────┘
              │
              ▼
  Journalisation (session + échange) · final ·
  la parole est rendue.

Ce chapitre détaille chaque bloc. Durée cible : environ 9 secondes, le
streaming démarrant dès 0,8 seconde.

### 5.1 PHASE 0 — LE FILTRE DE DÉTRESSE (3 couches, avant tout appel externe)

C'est le rituel d'entrée du SPU. Trois couches indépendantes évaluent la
question :

  COUCHE A — lexicale, déterministe : 14 expressions régulières
  explicites (français et anglais) visant les formulations les plus
  graves (« mettre fin à mes jours », « mourir », « me suicider »,
  « I want to kill myself »…). Une seule correspondance suffit : score 1.

  COUCHE B — un classifieur IA (prompt figé, température 0,1) qui rend
  un score de 0 à 1 et un niveau (aucune / vigilance / crise), avec un
  délai d'attente de 12 secondes et un échec sans danger (échec = score
  0). Optimisation : si la couche A a déjà détecté (score 1), la couche B
  est forcée à 1 sans aucun appel IA.

  COUCHE C — heuristique lexicale large : 51 mots négatifs (« triste »,
  « hopeless », « alone »…) et 18 mots de rupture (« mourir », « tout
  lâcher », « quitter »…) combinés dans une formule pondérée.

  DÉCISION :
    couche A = 1                        → distress (crise)
    couche B ≥ 0,75                     → distress (crise)
    couche B ≥ 0,5 ET couche C ≥ 0,7    → review  (vigilance)
    sinon                               → pass    (continu normal)

  CONSÉQUENCE (distress ou review) : la question NE PART PAS vers les
  sources externes. L'utilisateur reçoit immédiatement un message de
  dédétresse (crise) ou un message prudent (vigilance), accompagné des
  ressources réelles : France 3114, SOS Amitié 09 72 39 40 50, Europe
  112, USA 988/911, findahelpline.com pour le reste du monde. Aucune
  parabole, aucune histoire : ce n'est pas le moment de raconter.

  TRAÇABILITÉ ANONYME : la décision est journalisée dans la table
  LogsDetresse sous forme de hash SHA-256 de la question + 3 scores +
  décision. AUCUNE donnée textuelle n'est stockée — c'est vérifiable
  directement dans le schéma de base de données.

  QUALIFICATION : la batterie de tests officielle couvre 30 cas (10
  évidents, 10 ambigus, 10 normaux) — 30/30 passés.

### 5.2 LA SÉCURITÉ ENFANT

En mode « enfant » (6–12 ans), deux gardes s'ajoutent avant tout
traitement :
  - la couche A de détresse (les mêmes 14 regex) ;
  - un filtre thématique direct (sexualité, pornographie, nudité,
  violence).
Toute question interceptée reçoit un message doux, sans contenu, et
l'échange est marqué « contenu_inapproprie_enfant » dans le journal.
La question est par ailleurs limitée à 500 caractères dans l'interface
enfant (contre 2000 en mode adulte).

### 5.3 L'ORCHESTRATION DES 4 SOURCES (8 SECONDES MAXIMUM)

Quatre moteurs sont interrogés EN PARALLÈLE (Promise.allSettled), chacun
plafonné à 8 secondes :

  1. RECHERCHE WEB (Z.AI web_search) — les 4 meilleurs résultats, chaque
     extrait borné (nom 90 caractères, extrait 350 caractères).
  2. INTELLIGENCE RÉFLEXIVE (LLM interne) — un éclairage court de 80
     mots maximum, délai 12 secondes.
  3. ENCYCLOPÉDIE (Wikipédia) — recherche d'une page Wikipédia puis
     lecture via le lecteur de pages du SDK (l'accès direct Wikimedia
     étant limité dans certains environnements), contenu nettoyé à
     1200 caractères.
  4. DUCKDUCKGO (Instant Answer API) — résumé abstrait + 2 sujets
     liés maximum, sortie bornée à 900 caractères.

  RÈGLES D'ORCHESTRATION :
  - une source n'est retenue que si son texte dépasse 20 caractères ;
  - le résultat de chaque source est mis en cache 24 heures en base
    (table SourcesCache, clé = hash de la question + nom de source) —
    même question posée 10 fois = 1 seul appel réel par source ;
  - un garde-fou anti-abus limite le service à 20 requêtes par minute
    et par adresse IP ;
  - si TOUTES les sources échouent : « mode dégradé » — le flux saute
    la synthèse et va directement à la parabole locale, en le disant.

### 5.4 LA SYNTHÈSE SOURCÉE

Les extraits retenus (900 caractères maximum par source) sont confiés à
un prompt figé qui impose : 3 phrases maximum, 120 mots maximum,
citations numérotées [1] [2], mention explicite des contradictions entre
sources. La sortie contient la synthèse, la liste des sources utilisées
et un score de confiance. Repli si l'IA est indisponible : affichage des
extraits bruts avec une confiance honnêtement abaissée (0,35 à 0,4).

### 5.5 LE CHOIX DE LA PARABOLE (TF-IDF + ARBITRAGE)

Un système à deux étages :

  ÉTAGE 1 — INDEX TF-IDF en mémoire (recalculé toutes les 5 minutes,
  index séparés adulte/enfant). Chaque parabole est un « document »
  composé de son texte + ses 3 interprétations + sa culture + le nom de
  sa famille + ses mots-clés éditoriaux (comptés double). La
  tokenisation normalise les accents, applique ~120 mots vides et un
  stemming français (suffixes puis troncature à 6 caractères). La
  recherche rend les 8 meilleurs candidats par similarité cosinus.

  ÉTAGE 2 — ARBITRAGE IA : un modèle (température 0,2, délai 12
  secondes) reçoit les candidats et doit identifier « le cœur
  émotionnel » de la question, rendant l'index du candidat choisi,
  un score de pertinence et quelle interprétation (parmi les 3) servir.
  Sans arbitre disponible : le meilleur score cosinus est recalibré
  (×1,35, plafonné à 0,9) — la machine continue sans se taire.

  SEUIL DE QUALITÉ : 0,65. En dessous, la parabole est quand même
  proposée mais marquée « sous seuil » — honnêteté affichée : c'est la
  plus proche du corpus, pas la réponse parfaite.

  MESURE OFFICIELLE : top-1 à 90 %, top-3 à 100 % sur la batterie de
  tests (objectifs du cahier des charges : 80 % / 95 % — dépassés).

### 5.6 L'HISTOIRE PERSONNALISÉE ET SON FILTRE

  - Ancrage obligatoire : la préoccupation = la question réelle de
    l'utilisateur. Interdiction de l'histoire générique décontextualisée.
  - Longueurs imposées : 150–300 mots (adulte), 100–200 mots (enfant).
  - Tonalité passée (positive / négative / neutre) détectée au vol par
    l'IA — sauf en mode enfant, où elle reste neutre.
  - FILTRE POST-GÉNÉRATION : 19 patterns interdits (violence, sexualité,
    haine, peur extrême). En cas de rejet : 1 régénération avec
    contraintes renforcées ; en dernier recours, un texte de repli
    intégré (scène « rivière », version enfant = première phrase
    seulement). Maximum 2 essais IA, chaque essai tracé (0/1/2).
  - DIFFUSION : l'histoire est streamée par fragments de 3 mots, pause
    de 35 ms entre fragments — un débit pensé pour la lecture à voix
    haute.

## 6. LES QUATRE MODES D'ÉCOUTE (PLUS LA PERSPECTIVE)


  ORACLE — la réponse unique. Une question, une réponse complète en
  trois couches (synthèse, parabole, histoire), puis un bouton
  « perspective » optionnel qui ajoute 80 à 120 mots de mise en
  recul (délai 60 secondes max). C'est le mode par défaut.

  MENTOR — le dialogue en 3 étapes.
    Étape 1 OUVERTURE : réponse complète + 2 « questions d'angle »
    proposées.
    Étape 2 APPROFONDISSEMENT : rebond de 120 mots maximum sur le choix
    de l'utilisateur + 2 nouveaux angles. La phase 0 (détresse) est
    rejouée sur CHAQUE réponse de l'utilisateur, pas seulement la
    première.
    Étape 3 SYNTHÈSE : synthèse de 90 mots maximum, confiance figée à
    0,75, parabole finale (sans répéter la première interprétation),
    histoire, et une question ouverte pour terminer. L'état du dialogue
    est conservé dans la session (mentorState).

  DEEP — le parcours contemplatif en 3 niveaux.
    Niveau 1 OUVERTURE : réponse complète, débit d'affichage ralenti
    (pause 70 ms).
    Niveau 2 INTROSPECTION : méditation guidée de 80 à 120 mots +
    une DEUXIÈME interprétation de la MÊME parabole (confiance 0,9).
    Niveau 3 PERSPECTIVE : 60 à 100 mots + question ouverte finale.
    L'état du parcours est conservé dans la session (deepState).

  ENFANT — « Le Jardin des Contes » (6–12 ans).
    6 suggestions illustrées avec emoji, champ limité à 500 caractères,
    gros boutons, interrupteur voix dédié, lecture « théâtre »
    automatique, corpus dédié de 15 contes, sécurité renforcée (5.2).

  Chaque mode dispose de sa propre musique de fond (pistes MP3
  sélectionnées pour leur tempo et leur énergie), avec fondu de sortie
  de 1,5 seconde.

## 7. LA VOIX ET LE SON : UN THÉÂTRE À 10 VOIX


### 7.1 Le moteur serveur — Piper TTS (voix neuronales)

  - 3 modèles français de référence : Tom (fr_FR-tom-medium),
    Jessica / Pierre (fr_FR-upmc-medium, 2 locuteurs), Siwis
    (fr_FR-siwis-medium).
  - 10 profils de personnages dérivés : narrateur, conteur, sage,
    homme jeune / mûr, femme jeune / mûre, vieille femme, petite fille
    (hauteur ×1,38), petit garçon (×1,45) — corrections de hauteur via
    ffmpeg (asetrate/atempo), débits entre 0,92 et 1,12.
  - Génération à la demande par la route /api/tts (retour audio/wav,
    cache navigateur 1 heure), disponibilité re-vérifiée toutes les
    30 secondes, cache serveur LRU de 48 fichiers WAV (clé =
    hash profil|débit|texte, texte ≤ 1200 caractères).
  - Les modèles (~210 Mo au total) se téléchargent par un script dédié,
    répétable et reprisable ; sans eux, l'application bascule
    AUTOMATIQUEMENT sur la voix du navigateur (Web Speech API) — aucune
    fonctionnalité ne disparaît, seule la qualité vocale change.

### 7.2 Le client — le théâtre sonore

  - Découpage du texte en segments d'environ 220 caractères.
  - Rotation des voix : les dialogues (lignes entre guillemets) passent
    en rotation parmi 3 voix « personnages », avec une respiration de
    220 ms entre segments.
  - Ducking : la musique de fond descend à 35 % pendant la parole.
  - Contrôles : pause / reprise / stop, débit 0,6 à 1,4, réglages
    persistés (narrateur + 2 à 4 personnages choisis par l'utilisateur).

## 8. MÉMOIRE, CONFIDENTIALITÉ ET RGPD


### 8.1 Ce qui est stocké, et où

  La base SQLite (8 tables : Parabole, Session, User, Echange,
  SourcesCache, Quarantaine, LogsDetresse, Sauvegarde) conserve :
  - les sessions et leurs échanges (question, synthèse, sources, code
    de parabole, interprétation, histoire) ;
  - l'état des dialogues Mentor/Deep ;
  - le cache des sources (24 h) ;
  - les logs de détresse ANONYMES (hash + 3 scores + décision — jamais
    de texte) ;
  - les comptes (pseudo + hash de mot de passe uniquement).

### 8.2 Les durées

  - Purge opportuniste des sessions expirées à chaque /api/ask.
  - Durée de vie des sessions anonymes : 90 jours (rallongée à 90 jours
    à chaque rattachement à un compte).
  - Logs techniques : 30 jours.

### 8.3 Les droits (implémentés, pas déclaratifs)

  - EFFACEMENT IMMÉDIAT : DELETE /api/session supprime la session et
    tous ses échanges en cascade — effectif sur le champ.
  - PORTABILITÉ : export du journal en .txt, .json ou .md (téléchargement
    direct, en-têtes Content-Disposition) — le même moteur sert les
    instantanés de compte.
  - CONSENTEMENT : chaque session porte un drapeau userConsent et un
    drapeau anonymized.
  - LA RÈGLE D'OR affichée dans l'application : « seule la question part
    vers l'extérieur » — les 4 sources ne reçoivent que le texte de la
    question (tronqué), jamais d'identifiant, jamais d'historique.

### 8.4 La transparence comme écran

L'application comporte un écran « Transparence » (sources réelles listées,
délais, cache, seuil de matching, limites du corpus) et un écran
« Confidentialité & RGPD » — la politique n'est pas un PDF caché, elle est
une page de l'application elle-même.

### 8.5 LE CADRE LÉGAL DES MINEURS

Le mode enfant est un ESPACE PROTÉGÉ, pas un service dédié certifié.
Les faits, sans embellissement :

  - ce que le code garantit : filtre de contenus AVANT traitement
    (détresse + 4 thèmes), corpus dédié de 15 contes, tonalité toujours
    neutre, histories filtrées par 19 patterns, question limitée à
    500 caractères, aucune donnée identifiante demandée (pas d'e-mail,
    pas d'âge, pas de nom réel) ;
  - ce que le code ne garantit PAS : une qualification légale de
    « service pour mineurs » au sens des réglementations spécialisées
    (par exemple GDPR-K / COPPA). Le SPU ne fait pas de vérification
    d'âge et ne peut pas empêcher un enfant de sortir du mode enfant ;
  - la règle d'usage : l'accompagnement d'un adulte reste nécessaire.
    Le mode enfant est conçu POUR être utilisé avec un adulte, comme un
    livre de contes ;
  - les limites de responsabilité : les réponses du SPU ne remplacent
    jamais un avis médical, juridique ou financier ; ce principe est
    imposé dans les prompts de l'application Android (mode nomade) et
    de l'histoire, et il s'applique a fortiori aux mineurs.
## 9. LES COMPTES SPU ET LES INSTANTANÉS


### 9.1 Un compte sans e-mail

  - Inscription : pseudo (3 à 24 caractères) + mot de passe (6 à 128
    caractères). AUCUNE adresse e-mail, aucun téléphone — le profil ne
    stocke que le pseudo et ses sessions.
  - Mot de passe : scrypt (node:crypto), sel aléatoire de 16 octets,
    dérivation de 64 octets, comparaison à temps constant
    (timingSafeEqual) — le stockage est résistant au vol de base.
  - Anti brute-force : 15 essais par minute et par IP, sur l'inscription
    comme sur la connexion. Message d'erreur unique et générique
    (« Pseudo ou mot de passe incorrect » — impossible de savoir si le
    pseudo existe).

### 9.2 Le jeton d'authentification

  - PAS de JWT : un jeton aléatoire de 64 caractères hexadécimaux
    (32 octets d'entropie), stocké EN MÉMOIRE serveur (disparaît au
    redémarrage — limité volontairement), durée de vie glissante de
    7 jours, révocable par déconnexion.
  - Transport : en-tête Authorization Bearer OU cookie spu_token.

### 9.3 Rattacher ses sessions anonymes

  L'export clé en main : une session utilisée sans compte peut être
  « rattachée » au compte (par session ou par lot). Condition : la
  session doit être anonyme (userId nul) — impossible de voler la
  session d'un autre. Le rattachement repousse l'expiration à 90 jours.

### 9.4 Les instantanés (« sauvegardes »)

  - Un instantané copie le journal complet d'une session dans le compte
    (titre ≤ 120 caractères, nombre d'échanges, mode).
  - Le payload est une copie immuable au moment de l'export —
    consultable et téléchargeable plus tard en txt/json/md, supprimable
    individuellement (vérification de propriété avant toute action).
  - NOTE : ce mécanisme a été rendu fonctionnel le jour de la première
    édition (la table Sauvegarde manquait au schéma ; ajoutée, créée et
    testée end-to-end — voir Annexe B).

## 10. LA SÉCURITÉ TECHNIQUE


  LIMITATION DE DÉBIT
  20 requêtes/minute/IP sur les 5 routes de conversation (ask, repondre,
  mentor, deep, perspective). L'adresse IP vient de l'en-tête
  x-forwarded-for (compatible reverse-proxy). Garde-fou mémoire : la
  table des IP est purgée au-delà de 5 000 entrées.

  VALIDATION DES ENTRÉES
  Analyse JSON protégée (400 si malformé), question bornée 1–2000
  caractères (500 en mode enfant), étapes/niveaux forcés entre 1 et 3,
  sessionId requis, troncatures systématiques avant tout prompt IA.

  CORS MAÎTRISÉ
  Seules deux routes exposent Access-Control-Allow-Origin: * :
  /api/repondre et /api/version (nécessaire au WebView de l'application
  Android, origine file://). Tout le reste n'expose pas de CORS.

  ADMINISTRATION
  La route de validation de quarantaine exige un jeton Bearer
  (variable ADMIN_TOKEN) — 401 si absent.

  AFFICHAGE SÛR
  Échappement HTML de tout contenu affiché côté Android ; contenus
  générés passés au filtre de 19 patterns avant diffusion.

  PAS DE CLÉ CÔTÉ CLIENT
  Aucune clé d'API n'est embarquée dans le code client ; les moteurs
  externes sont appelés uniquement côté serveur.

## 11. L'INTERFACE UTILISATEUR


### 11.1 Les 9 vues

  accueil · oracle · mentor · deep · enfant · journal · corpus ·
  transparence · confidentialité

### 11.2 L'accueil

  Quatre cartes de mode avec leur description et leur musique ; les
  badges de promesse sont MESURABLES : « 10 voix locales », « musique
  par mode », « 65 paraboles sourcées », « 100 % local, sans clé API » ;
  quatre accès directs (Journal, Corpus, Transparence, Confidentialité).

### 11.3 La conversation

  Fil de type messagerie horodatée (question à droite, réponse à
  gauche), indicateur d'attente avec 5 phrases de patience en rotation
  (toutes les 3,6 s), suggestions de questions, compteur 2000
  caractères, raccourci Ctrl/⌘+Entrée, étiquettes « Étape n/3 » /
  « Niveau n/3 », bouton perspective.

### 11.4 Le journal de bord

  Liste horodatée des échanges, ouverture des sessions passées, export
  txt/json/md, export vers le compte, effacement total avec
  confirmation. C'est le bras droit de la portabilité RGPD.

### 11.5 Le corpus

  Recherche plein texte (texte, culture, interprétations), filtres par
  famille F1–F10, badges mode enfant, et — grâce au Service Worker —
  version en cache disponible hors ligne (bandeau « hors-ligne » affiché
  quand c'est le cas).

### 11.6 L'installation (PWA)

  L'application web est installable (manifest, icônes, Service Worker
  v4.4) : stratégie réseau-d'abord pour la navigation et le corpus
  (avec repli cache hors ligne), cache-d'abord pour les assets et les
  médias.

## 12. SPU POCKET, L'APPLICATION COMPAGNON (ANDROID)


  Version actuelle : 1.2.0 (versionCode 3) — 62 Ko — Android 7.0+
  (min SDK 24). Construite sans Gradle (aapt2 → javac → r8 → align →
  sign), signée par une clé dédiée.

  ARCHITECTURE
  Un WebView plein écran chargeant une interface locale (4 fichiers :
  index.html, app.js, data.js 48 Ko, style.css) avec un pont natif
  SpuAndroid (TTS Android fr-FR : file d'attente, vitesse 0,3–2,5,
  hauteur 0,3–2,0, liste des voix ; bouton retour délégué ; localStorage
  activé).

  LES 6 ÉCRANS
  accueil · bibliothèque · lecteur · connexion serveur · poser une
  question · à propos

  LA BIBLIOTHÈQUE EMBARQUÉE
  Les 65 textes complets (50 paraboles + 15 contes) avec leurs cultures,
  familles, 3 interprétations et mots-clés ; recherche par sous-chaîne,
  filtres adulte/enfant, favoris persistants, lecture vocale par blocs
  (≤ 2600 caractères), vitesse/hauteur réglables et persistées.

  DEUX FAÇONS DE POSER UNE QUESTION (écran « demander », v1.2)
  - MODE SERVEUR : POST vers un serveur SPU (route /api/repondre,
    délai 120 s) — réponse complète : synthèse sourcée, parabole avec
    code et culture, histoire, nombre de sources et cohérence.
  - MODE NOMADE (sans aucun serveur) : question envoyée à une IA publique
    (délai 60 s) avec un prompt SPU figé (conteur bienveillant, 100 mots
    maximum, parabole courte si connue, aucun conseil médical/juridique/
    financier, termine en rendant la parole) — pensé pour tester l'esprit
    du SPU chez soi sans rien configurer.

  SÉCURITÉ LOCALE
  Détection de détresse minimale (11 expressions françaises) avec
  ressources locales affichées AVANT tout envoi réseau ; échappement
  HTML de tout affichage ; mémorisation des 4 derniers serveurs
  uniquement ; vérification de version via /api/version (délai 8 s).

  DISTRIBUTION
  APK signée + AAB (Play Store) + keystore + guides de publication pas
  à pas + fiche Play Store + captures d'écran, réunis dans un kit
  zip tout-en-un reconstruisible par script.
## 13. ARCHITECTURE TECHNIQUE ET CHIFFRES CLÉS


### 13.1 La pile

  Next.js 16 (App Router, build standalone) · React 19 · TypeScript ·
  Tailwind 4 · shadcn/ui (45 composants) · Prisma 6 + SQLite ·
  SDK z-ai-web-dev-sdk (LLM, recherche web, lecteur de pages) ·
  Zustand (état persisté) · Piper TTS côté serveur · ffmpeg (hauteurs
  de voix).

### 13.2 Les chiffres

  Code source (src/)              113 fichiers, dont 108 TS/TSX
  Lignes TypeScript               13 091 au total,
                                  dont 7 694 hors composants shadcn
  Bibliothèque SPU (lib/spu/)     19 fichiers, 2 941 lignes
  Composants SPU                  13 fichiers, 2 913 lignes
  Routes API                      23 routes
  Corpus (JSON)                   2 349 lignes (50 adulte + 15 enfant
                                  + 2 dictionnaires de mots-clés)
  Base de données                 8 tables
  Scripts d'exploitation          ~50 scripts (tests, builds, voix,
                                  captures, gardien, démon)

### 13.3 Le tableau des 23 routes API

  /api/ask                     Pipeline narratif SSE (Oracle/Enfant)
  /api/repondre                Version JSON sans SSE, pour l'APK (CORS)
  /api/mentor                  Dialogue Mentor SSE en 3 étapes
  /api/deep                    Parcours contemplatif SSE en 3 niveaux
  /api/perspective             Mise en perspective d'un échange
  /api/journal                 Journal d'une session
  /api/session [DELETE]        Effacement immédiat (RGPD)
  /api/export                  Export txt/json/md du journal
  /api/corpus                  Corpus public + familles (cache SW)
  /api/health                  Ping léger (cache 5 min)
  /api/version                 Versions serveur/APK + nouveautés (CORS)
  /api/tts [GET/POST]          Capacités vocales / WAV Piper
  /api/admin/validate          Validation quarantaine (jeton admin)
  /api/compte/inscrire         Création de compte
  /api/compte/connexion        Connexion
  /api/compte/moi              Profil + 50 dernières sessions
  /api/compte/deconnexion      Révocation du jeton
  /api/compte/rattacher        Rattachement de sessions au compte
  /api/compte/sessions         Lecture protégée d'une session
  /api/compte/sauvegarder      Instantané du journal vers le compte
  /api/compte/sauvegardes      Liste des instantanés
  /api/compte/sauvegardes/[id] Téléchargement / suppression d'un
                               instantané
  /api                         Point d'entrée de test

### 13.4 Les performances mesurées

  Question Oracle complète      ~9 secondes (streaming dès 0,8 s)
  Phase 0                       30/30 cas de test
  Matching parabole             top-1 : 90 % · top-3 : 100 %
  Cache sources                 24 h — une question répétée ne
                                re-interroge aucune source
  Voix                          cache LRU 48 WAV, génération à la
                                demande

### 13.5 LE PROFIL DE COÛT D'UNE QUESTION

Un livre blanc doit parler d'argent. Ce que « coûte » réellement une
question Oracle, en termes d'appels (le coût monétaire dépend du plan
du SDK Z.AI sous-jacent — le design, lui, est fixe) :

  APPELS MAXIMAUX PAR QUESTION (hors cache)
  - 4 appels d'IA générative :
      1 éclairage réflexif (≤ 220 tokens)
      1 synthèse (≤ 500 tokens)
      1 arbitrage de matching (≤ 150 tokens)
      1 histoire (≤ 700 tokens)
  - 3 accès externes :
      1 recherche web (5 résultats)
      1 lecture de page encyclopédique
      1 requête DuckDuckGo

  CE QUE LE CACHE 24 h ÉCONOMISE
  La clé de cache est le hash de la question : une question posée 10
  fois dans la journée ne déclenche les 3 accès externes QU'UNE FOIS.
  Seule l'histoire (personnalisée par session) reste régénérée.

  CE QUI EST GRATUIT PAR CONCEPTION
  - la parabole : jamais générée, jamais payée — choisie dans le corpus ;
  - le mode dégradé : si les sources externes sont indisponibles, le
    système répond quand même depuis le corpus local, en le disant ;
  - la voix du navigateur : repli gratuit si Piper n'est pas installé.

  PLAFONDS DE PROTECTION
  20 requêtes/minute/IP (anti-abus), troncatures systématiques des
  prompts, échecs sans danger (chaque appel a un délai d'attente et un
  repli) : le système ne peut pas « déraper » en cascade d'appels.

## 14. LES LIMITES ACTUELLES — UNE ÉVALUATION HONNÊTE


Un livre blanc qui ne dit pas ses limites est une brochure. Voici les
nôtres, telles quelles :

  1. DÉPENDANCE AU SDK Z.AI. La compréhension (LLM), la recherche web
  et la lecture de pages Wikipédia passent par le SDK z-ai-web-dev-sdk.
  Sans cette brique (clé indisponible, quota épuisé), le SPU reste en
  mode dégradé : synthèse remplacée par des extraits bruts avec
  confiance abaissée, parabole et histoire issues du corpus local.
  Le service ne tombe pas, mais il s'appauvrit.

  2. HÉBERGEMENT À CONFIRMER POUR UN ACCÈS PUBLIC PERMANENT. Le serveur
  actuel vit dans un environnement de développement ; le lien de
  partage fourni par la plateforme est un relais temporaire, et un
  recyclage de l'environnement peut remettre la base à zéro (c'est
  arrivé le jour de cette édition — voir Annexe B). Pour que des
  utilisateurs externes l'utilisent chaque jour, il faut un hébergement
  permanent avec base persistante (VPS, ou plateforme cloud) —
  l'Annexe C décrit le déménagement pas à pas.

  3. CORPUS DE 65 TEXTES — UNE RICHESSE VOLONTAIREMENT PETITE. La
  bibliothèque est l'actif critique du projet. 65 textes bien sourcés
  suffisent pour démontrer le concept ; ils ne couvrent pas toutes les
  situations. La quarantaine (workflow complet : soumission, statut
  pending, validation par jeton admin) est prête mais encore vide
  d'usage réel.

  4. MODULES PRÉPARÉS MAIS NON ACTIVÉS (code présent, non branchés) :
  - deux sources externes supplémentaires, Grok (xAI) et Gemini
    (Google), écrites et conformes aux règles 8 s / 24 h, en attente de
    clés API ;
  - un moteur de voix alternative embarquée (13 profils, exécution
    navigateur via WebAssembly) ;
  - deux composants d'interface anciens remplacés (chat-view,
    régie-voix) qui traînent encore.

  5. VOIX NEURONALES À TÉLÉCHARGER. Les 3 modèles Piper (~210 Mo) ne
  sont pas inclus par défaut ; sans eux, la voix du navigateur prend le
  relais automatiquement. Le script de téléchargement est reprisable.

  6. JETONS EN MÉMOIRE. Les jetons d'authentification vivent en mémoire
  serveur : un redémarrage déconnecte tout le monde (les sessions et
  données restent, seule la reconnexion est nécessaire). C'est un choix
  de simplicité et de sécurité, à revoir si le nombre d'utilisateurs
  grandit.

  7. UNE SEULE LANGUE. Tout est francophone (corpus, prompts, interface,
  voix). Le multilingue est à la feuille de route, pas dans le code.

  8. ÉPISTÉMOLOGIE DE LA PARABOLE. Une parabole « propose une lecture »,
  elle ne « prouve » rien. Le SPU affiche toujours la culture d'origine
  et l'interprétation comme une proposition, jamais comme un verdict.
  C'est une limite assumée — d'où le bouton « perspective ».

## 15. FEUILLE DE ROUTE


  COURT TERME (déjà engagé)
  - Serveur de production sous gardien automatique (redémarrage
    automatique en cas de chute) — en place.
  - Instantanés de compte rendus fonctionnels — fait.
  - Harmonisation des versions sur 4.4 partout — fait.
  - Reconstruction complète après le recyclage du 6 novembre (corpus
    re-seedé, serveur réenregistré, APK reconstruite) — fait.
  - Livre blanc enrichi (édition 1.1) + version compagnon .md — fait.

  MOYEN TERME (décidé)
  - Croissance du corpus vers 300 paraboles via la quarantaine
    (soumission → pending → validated), avec interface d'administration.
  - Branchement optionnel des sources Grok et Gemini (clés API
    requises, mêmes règles : 8 s, cache 24 h).
  - Hébergement permanent du serveur pour l'accès public continu
    (VPS ou plateforme cloud), avec base de données persistante —
    procédure en Annexe C.
  - Sauvegarde automatique de la base (anti-recyclage) à ajouter au
    gardien.

  SUIVANT (annoncé dans l'application)
  - Paraboles mensuelles (nouvelles entrées validées livrées
    régulièrement).
  - Voix enrichies (extension des profils Piper).
  - Mode communautaire (partage de paraboles et de parcours).

  VISION LONGUE
  - Multilingue (interface, corpus, voix).
  - Migration PostgreSQL + pgvector sans changer l'API (le schéma
    SQLite est déjà conçu pour cette évolution).

## 16. GLOSSAIRE


  PARABOLE        Court récit traditionnel porteur d'une leçon. Au SPU :
                  un texte réel, sourcé, culturellement identifié, avec
                  3 interprétations officielles.
  FAMILLE (F1–F10) Thème majeur d'une parabole : Patience, Détachement,
                  Courage, Justice, Renouveau, Ancrage, Légèreté,
                  Intégrité, Action, Relation.
  PHASE 0         Étape d'entrée du pipeline : détection de détresse en
                  3 couches (lexique, IA, heuristique), AVANT tout
                  appel externe.
  COUCHE A / B / C Les trois évaluateurs de la phase 0 (A = 14 regex
                  explicites ; B = classifieur IA ; C = 51 mots négatifs
                  + 18 mots de rupture).
  DISTRESS / REVIEW / PASS   Les 3 décisions de la phase 0 (crise →
                  ressources immédiates ; vigilance → message prudent ;
                  pass → pipeline normal).
  TF-IDF          Méthode classique de recherche par mots-clés pondérés
                  (fréquence × rareté). Le SPU l'utilise pour choisir
                  les 8 candidats parabole.
  ARBITRAGE       Deuxième étage du matching : une IA choisit dans les
                  8 candidats celui qui touche le « cœur émotionnel »
                  de la question.
  SEUIL (0,65)    Score minimal pour servir une parabole « en confiance ».
                  En dessous, elle est proposée avec la mention « sous
                  seuil ».
  MODE DÉGRADÉ    Fonctionnement sans les 4 sources externes : le corpus
                  local prend le relais, et le fait est annoncé.
  SSE             Server-Sent Events : la technologie qui permet de
                  streamer la réponse morceau par morceau dans le
                  navigateur.
  PWA             Progressive Web App : site installable sur l'écran
                  d'accueil, fonctionnant partiellement hors ligne via
                  un Service Worker.
  QUARANTAINE     Salle d'attente des textes soumis : aucun texte ne
                  entre dans la bibliothèque sans validation explicite.
  MODE NOMADE     Fonction de SPU Pocket : poser une question sans
                  aucun serveur configuré.
  INSTANTANÉ      Copie immuable du journal d'une session, conservée
                  sur un compte et téléchargeable en txt/json/md.
  DUCKING         Abaissement automatique de la musique pendant la
                  parole (à 35 % ici).
  GARDIEN         Script de surveillance qui relance le serveur de
                  production s'il s'arrête.
  BUILD STANDALONE Compilation autonome du serveur (un dossier
                  transportable : serveur + dépendances), la forme sous
                  laquelle le SPU peut déménager vers un hébergement
                  permanent (Annexe C).
  MODE DÉGRADÉ Voir ci-dessus. PWA, QUARANTAINE, MODE NOMADE :
                  voir les entrées correspondantes.

## ANNEXE A. INVENTAIRE DES FICHIERS CLÉS


  APPLICATION WEB (version normale)
  src/components/spu/spu-app.tsx   Cœur de l'interface (9 vues)
  src/lib/spu/flux.ts              Le générateur de flux partagé
  src/lib/spu/sources.ts           Orchestration des 4 sources
  src/lib/spu/distress.ts          Phase 0 (couches A/B/C)
  src/lib/spu/matching.ts          TF-IDF + arbitrage parabole
  src/lib/spu/story.ts             Histoire + filtre de contenu
  src/lib/spu/voix-neurales.ts     Moteur Piper TTS
  src/lib/spu/compte.ts            scrypt + jetons + limites
  src/data/corpus-adulte.json      50 paraboles (P001–P050)
  src/data/corpus-enfant.json      15 contes (E001–E015)
  prisma/schema.prisma             8 tables documentées
  public/sw.js                     Service Worker (v4.4)

  APPLICATION ANDROID
  apk-spu/assets/spu/index.html    6 écrans
  apk-spu/assets/spu/app.js        Logique + mode nomade
  apk-spu/assets/spu/data.js       Les 65 textes embarqués (48 Ko)
  apk-spu/AndroidManifest.xml      versionCode 3, versionName 1.2.0

  EXPLOITATION
  scripts/seed.ts                  Injection du corpus en base
  scripts/test-phase0.ts           30 cas de détection
  scripts/test-matching.ts         Précision du choix de parabole
  scripts/build-apk.sh             Construction APK signée
  scripts/installer-sdk.sh         Réinstallation du SDK Android
  scripts/kit-pocket.sh            Kit de distribution complet
  scripts/demonise.py              Démarrage démon (survit au shell)
  scripts/gardien-serveur.sh       Surveillance + relance automatique

  DISTRIBUTION
  download/spu-pocket-v1.2.0.apk   L'APK signée (62 Ko)
  download/spu-pocket-v1.2.0.aab   Bundle Play Store
  download/kit-spu-pocket-v1.2.zip Kit tout-en-un
  download/LIVRE-BLANC-SPU-v4.4-2026-11-06.txt    Ce document (txt)
  download/LIVRE-BLANC-SPU-v4.4-2026-11-06.md     Version compagnon

## ANNEXE B. HISTORIQUE DES CORRECTIONS ET RECONSTRUCTIONS


  Le livre blanc se doit de décrire un état VÉRIFIÉ. Voici l'historique
  complet des incidents et corrections, sans filtre :

  ÉDITION 1.0 (6 novembre, après-midi)

  1. TABLE SAUVEGARDE MANQUANTE — trois routes d'API (création, liste,
     téléchargement d'instantanés) utilisaient un modèle inexistant
     dans le schéma de base. Le modèle Sauvegarde a été ajouté, la
     table créée sans perte de données, et la chaîne complète testée
     end-to-end. STATUT : fonctionnel.
  2. CORPUS VIDE EN BASE — le comptage en base retournait 0 parabole.
     Le seed a été rejoué : 65/65 textes réinjectés, confirmé par
     /api/health (corpus: 65). STATUT : opérationnel.
  3. QUATRE NUMÉROS DE VERSION COEXISTANTS (4.1/4.2/4.3/4.4) — toutes
     les chaînes visibles harmonisées sur 4.4. STATUT : uniforme.
  4. SERVEUR DE DÉVELOPPEMENT PAR DÉFAUT — remplacé par le serveur de
     production (build standalone) démarré en démon, sous gardien.

  ÉDITION 1.1 (6 novembre, soir) — RECYCLAGE DE L'ENVIRONNEMENT

  5. L'ENVIRONNEMENT D'EXÉCUTION A ÉTÉ RECYCLÉ entre les deux éditions :
     le dossier de livraison (APK, AAB, kit, livre blanc, keystore),
     la base de données et le build de production ont disparu ; les
     sources du projet (code, corpus JSON, scripts, assets de l'APK)
     étaient intactes. Reconstruction intégrale refaite le jour même :
     corpus re-seedé (65/65), modèle Sauvegarde recréé, versions
     réharmonisées sur 4.4, SDK Android réinstallé, APK et AAB
     reconstruites et re-signées (nouvelle clé : la première édition
     de l'APK doit être désinstallée avant d'installer la nouvelle),
     serveur de production relancé sous gardien, livre blanc régénéré
     et enrichi. STATUT : opérationnel.
  6. LEÇON RETENUE (déjà en feuille de route) : ajouter une sauvegarde
     automatique de la base au gardien, et déménager vers un
     hébergement permanent avec base persistante (Annexe C).

  Ce document décrit l'état réel du projet au 6 novembre 2026 au soir,
  après ces reconstructions.

## ANNEXE C. FAIRE TOURNER LE SPU SOI-MÊME


  Le SPU est une application autonome : voici tout ce qu'il faut pour
  la faire vivre sur une machine (PC, VPS, cloud), de l'installation à
  l'hébergement permanent.

  C.1 PRÉREQUIS
  - Node 20+ ou Bun (recommandé, le projet est testé sous Bun)
  - ~1 Go d'espace disque (code + node_modules + base)

  C.2 LES DEUX VARIABLES D'ENVIRONNEMENT
  - DATABASE_URL  = file:/chemin/vers/db/custom.db   (obligatoire)
  - ADMIN_TOKEN   = un secret au choix               (optionnel :
    active la route de validation de quarantaine)

  C.3 DÉMARRAGE COMPLET (5 commandes)
    bun install                    # dépendances
    npx prisma db push             # crée les 8 tables
    bun run scripts/seed.ts        # injecte les 65 textes
    bun run build                  # build de production
    NODE_ENV=production bun .next/standalone/server.js
                                   # sert l'application sur :3000

  Mode développement équivalent : bun run dev (rechargement à chaud).

  C.4 VÉRIFICATION
    curl http://localhost:3000/api/health
    → {"status":"ok", ... "corpus":65 ...}
    Un « corpus:65 » prouve que la base et le seed sont bons.

  C.5 LES OPTIONS UTILES
  - Voix neuronales : scripts/portable/telecharger-voix.sh
    (Piper + 3 modèles FR, ~210 Mo, reprisable). Sans elles : voix du
    navigateur automatiquement.
  - Survie du serveur : python3 scripts/demonise.py serveur
    (démarrage démon) + python3 scripts/demonise.py gardien
    (relance automatique en cas de chute).
  - Musique par mode : scripts/telecharger-musique.sh (14 pistes).

  C.6 DÉMÉNAGER VERS UN HÉBERGEMENT PERMANENT
  Le build standalone est fait pour ça : le dossier
  .next/standalone/ contient le serveur ET ses dépendances.
    1. louer un VPS (ou créer un service cloud Node/SQLite)
    2. y copier : .next/standalone/ + public/ + db/ + src/data/
    3. configurer DATABASE_URL vers un disque PERSISTANT
    4. démarrer : NODE_ENV=production bun .next/standalone/server.js
    5. poser un reverse-proxy HTTPS (Caddy : 3 lignes de configuration ;
       un exemple Caddyfile est livré à la racine du projet)
    6. démarrer le gardien pour la relance automatique
  À partir de là, l'adresse du serveur est FIXE et PERMANENTE : c'est
  cette adresse qu'on met en serveur par défaut de SPU Pocket, et les
  utilisateurs n'ont plus jamais à la saisir.

  C.7 SAUVEGARDE ANTI-PERTE (recommandé)
  La base est un seul fichier (db/custom.db) : copier ce fichier hors
  machine chaque nuit (cron) suffit à ne plus jamais perdre les
  échanges lors d'un recyclage.

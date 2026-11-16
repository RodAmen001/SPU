# Livre blanc SPU — Système Parabolique Universel

## SPU — SYSTÈME PARABOLIQUE UNIVERSEL
Livre blanc du concept, en son état actuel

Édition 3.0 — révisée et augmentée
Rédigé le 16 novembre 2026
Serveur : SPU v6.5 · Application compagnon : SPU Pocket v1.3.0
Auteur : Rodamen001 · Contact : ramenyido@gmail.com
Dépôt officiel : https://github.com/RodAmen001/SPU
Téléchargements : https://rodamen001.github.io/SPU/

---

## RÉSUMÉ EN DIX LIGNES

1. Le SPU répond aux questions de vie par des paraboles réelles, jamais
   inventées, tirées d'un corpus clos de 100 textes sourcés (75 paraboles
   adultes et 25 fables), de 5 cultures et 10 familles.
2. Chaque question traverse un pipeline en 5 étapes : sécurité détresse,
   orchestration multi-IA, synthèse sourcée, matching sémantique, histoire
   personnalisée — avec replis en cascade (z.ai → Groq → GitHub Models →
   Pollinations, jusqu'à 12 essais) et canevas locaux en dernier recours.
3. Une couche de sécurité à 3 niveaux détecte la détresse en moins d'une
   seconde et court-circuite tout le reste : réponse humaine, aucune parabole,
   aucune donnée envoyée à des tiers.
4. Six modes : Oracle (une réponse), Mentor (dialogue en 3 étapes couronné
   par le BOOST), Oracle inversé (la personne interprète, le SPU éclaire),
   Enfant (espace protégé, fil continu, bande dessinée), Musiques (catalogue
   accordé à la parabole, noté par les auditeurs), Journal (30 jours visibles,
   90 jours conservés).
5. Le BOOST est désormais un THÉÂTRE GRAVÉ : tout le scénario est converti
   côté serveur en un seul MP3 — titres de scène, didascalies PARLÉES par le
   narrateur (l'annonce de la condition avant la prise de parole),
   présentation des personnages, voix distinctes garanties — puis relu par une
   IA (transcription ASR comparée au script, fautes corrigées, segments
   régénérés) avant d'être servi.
6. La voix : 12 profils distincts mappés sur 4 modèles Piper français réels,
   normalisés (dynaudnorm) et homogènes (22050 Hz mono), cache et
   préchauffage — la narration démarre sans attendre et ne coûte rien.
7. SPU Pocket, l'application Android, fonctionne dès l'installation sans
   serveur : mode nomade + bibliothèque hors-ligne des 100 textes + oracle
   inversé local.
8. Les comptes sont minimalistes : mots de passe dérivés par scrypt, jetons de
   session, historique 90 jours, effacement RGPD immédiat sur demande,
   export personnel.
9. Tout tourne sur une machine à 1 Go de RAM avec SQLite ; le serveur complet
   pèse moins de 10 Mo de code et les voix sont incluses dans l'image.
10. Le principe éthique est non négociable : un mentor, pas un maître —
    le SPU accompagne la réflexion, il ne remplace ni les humains ni les
    professionnels de santé.

---

## SOMMAIRE

1. La promesse : un mentor, pas un maître
2. Le problème auquel répond le SPU
3. Le principe : question → parabole réelle → histoire
4. Le théâtre du BOOST : la scène gravée (nouveau, v6.4)
5. La sécurité d'abord : la phase de détresse
6. Le corpus : 100 textes réels, sourcés, clos
7. La voix et la musique : un théâtre complet (nouveau)
8. L'orchestration multi-IA
9. SPU Pocket : le mentor dans la poche
10. Comptes, journal et confidentialité
11. Coûts et hébergement
12. Limites honnêtes
13. Éthique : les règles non négociables
14. Feuille de route
15. Annexe A — mettre le SPU en ligne
16. Annexe B — installer SPU Pocket sur un téléphone
17. Annexe C — historique des éditions
18. Licence et contact

---

## 1. LA PROMESSE : UN MENTOR, PAS UN MAÎTRE

Le SPU ne prétend pas détenir la vérité sur la vie d'une personne. Il pose un
acte modeste et ancien : mettre à sa disposition une histoire vraie, venue du
patrimoine humain, qui résonne avec sa question — puis l'accompagner dans un
dialogue qui la traverse. La personne reste l'auteure de sa décision. Le
service refuse trois tentations : flatter (aucune réponse mécaniquement
valorisante), effrayer (aucune mise en scène de la peur), remplacer (aucune
prétention thérapeutique). Chaque réponse cite ses sources, chaque étape
annonce son nom, chaque fin de dialogue s'ouvre sur une question ouverte —
la réflexion appartient à celle qui a posé la question.

## 2. LE PROBLÈME AUQUEL RÉPOND LE SPU

Les assistants conversationnels généralistes répondent vite et souvent mal à
ce qui compte : ils produisent des listes de conseils génériques, sans ancrage
culturel ni mémoire du chemin parcouru. Les livres de sagesse, eux, ne
répondent pas : il faut savoir y chercher. Le SPU tient les deux bouts : un
corpus clos et sourcé d'un côté, un dialogue vivant de l'autre. La question de
la personne traverse la machine et ressort sous la forme d'une parabole réelle,
d'une interprétation honnête, d'une histoire taillée sur mesure et d'un théâtre
audio qui porte la leçon au cœur — pas sous une liste à cocher.

## 3. LE PRINCIPE : QUESTION → PARABOLE RÉELLE → HISTOIRE

1. **Sécurité** : détection de détresse (< 1 s, mots-clés + patterns) → réponse
   humaine directe, fin du pipeline, log dédié.
2. **Matching** : TF-IDF sur le corpus (top-1 ≈ 90 %, top-3 ≈ 100 % sur le jeu
   de contrôle) arbitré par une IA sémantique ; sous le seuil de confiance, le
   SPU le dit honnêtement.
3. **Synthèse sourcée** : l'orchestrateur interroge plusieurs moteurs IA avec
   le texte intégral de la parabole choisie ; toute source externe passe par la
   quarantaine avant d'être citée.
4. **Histoire personnalisée** : une histoire neuve, ancrée dans la question
   réelle, filtrée après génération (vocabulaire interdit, tonalité, longueur),
   régénérée jusqu'à deux fois, canevas local en dernier recours.
5. **Musique accordée** : la piste de fond est choisie selon la culture et la
   famille de la parabole offerte, atténuée sous la voix (ducking), notable
   par l'auditeur à tout moment — sans quitter jamais sa conversation (v6.4/6.5).

## 4. LE THÉÂTRE DU BOOST : LA SCÈNE GRAVÉE (v6.4)

Au terme du dialogue Mentor (3 requêtes), le SPU écrit un scénario de théâtre
— le BOOST — sur le chemin parcouru : des personnages à condition précise
(métier, lien, quartier), des circonstances qui évoluent, une déclaration
forte portée par le héros. La préparation est entièrement serveur :

- **Partition complète** : titre de scène par le conteur ; **didascalies
  parlées par le narrateur** — « Léo marche dans la ville, les yeux plissés »
  est lue AVANT la prise de parole du personnage, pour que le théâtre audio se
  comprenne sans lire l'écran ; présentation de chaque personnage à sa première
  réplique.
- **Gravation en un seul MP3** : une génération Piper à la fois (plus jamais la
  course à quatre générations parallèles qui laissait une voix unique et
  monotone), voix distinctes garanties, niveau sonore homogénéisé, tout à
  22050 Hz mono.
- **Revue IA du rendu** : le WAV maître est découpé en morceaux de 25 s,
  transcrit (ASR z-ai), et un modèle compare la transcription au script segment
  par segment ; les fautes de français et les segments ratés sont corrigés, les
  segments fautifs régénérés, le MP3 ré-assemblé. Le verdict (score, couverture,
  corrections) est affiché sous le théâtre.
- **Respect de la personne** : le BOOST est une proposition — jamais lancé
  automatiquement ; l'attente (souvent plusieurs minutes sur un CPU gratuit)
  est annoncée honnêtement et ne prive jamais la réponse principale.

## 5. LA SÉCURITÉ D'ABORD : LA PHASE DE DÉTRESSE

Trois niveaux : mots-clés explicites, patterns de souffrance, contexte
aggravant. En cas de détection : réponse humaine chaleureuse, invitaion à
contacter un proche ou un numéro de secours local, aucune donnée envoyée aux
moteurs IA, journalisation minimale dédiée (`LogsDetresse`) — jamais
d'exploitation du moment fragile à des fins de produit.

## 6. LE CORPUS : 100 TEXTES RÉELS, SOURCÉS, CLOSES

75 paraboles adultes (5 cultures — y compris africaines et orientales —,
10 familles de thèmes) et 25 fables, toutes vérifiées source par source
(Wikiquote, Wikipédia, Wikisource) et embarquées dans la base et dans l'APK.
Le corpus est CLOS : le SPU n'invente jamais de parabole et ne cite jamais une
source non vérifiée ; les apports externes éventuels passent par la quarantaine
et la validation manuelle (`ADMIN_TOKEN`). Le même corpus alimente le serveur,
le mode Enfant (filtres stricts) et le hors-ligne du Pocket.

## 7. LA VOIX ET LA MUSIQUE : UN THÉÂTRE COMPLET

La narration est locale et gratuite : Piper, 4 modèles français (Tom, Gilles,
UPMC Jessica/Pierre, MLS multi-locuteurs) mappés sur 12 profils distincts par
mesure de voix fondamentale, avec réglage fin (débit, hauteur) et normalisation
de niveau. La lecture démarre sans attendre (premier segment court + modèles
préchauffés au démarrage) et ne s'arrête jamais au milieu d'une réponse : si
le serveur est lent, le repli navigateur conserve des voix différenciées par
profil. La musique de fond est un catalogue par mode, accordé à la parabole
offerte (culture/famille), atténué sous la voix, rejouable, passable, et NOTÉ
par les auditeurs (1-5 étoiles ; note globale renvoyée au SPU pour classer les
pistes et retirer les inappropriées) — le tout depuis un cadre adjacent à la
conversation, jamais au prix du fil.

## 8. L'ORCHESTRATION MULTI-IA

Un appel IA traverse : z.ai (2 essais) → Groq → GitHub Models → Pollinations
(GET puis POST ×2), deux passes complètes, jusqu'à 12 tentatives réelles,
plafonnées par un budget de temps (`AsyncLocalStorage`) qui protège le proxy ;
les travaux longs (scénario BOOST, gravation) tournent en arrière-plan, après
la fermeture du flux. Les clés vivent côté serveur uniquement ; aucun contenu
de détresse ne quitte le serveur ; les sources externes sont mises en cache
(`SourcesCache`) et en quarantaine.

## 9. SPU POCKET : LE MENTOR DANS LA POCHE

L'APK (< 2 Mo) embarque le corpus complet et deux usages hors ligne : le mode
nomade (questions répondues sans serveur) et l'oracle inversé local (une
parabole nue, ta lecture analysée face aux interprétations du corpus).
Connecté, il ajoute la lecture neurale, le mode Enfant en fil continu et la
synchro du journal. `/api/version` annonce les nouveautés à chaque démarrage —
jamais de mise à jour silencieuse.

## 10. COMPTES, JOURNAL ET CONFIDENTIALITÉ

Mots de passe : scrypt + sel, comparaison à temps constant. Jetons de session
aléatoires. Journal : 30 jours visibles, 90 jours conservés, purge automatique,
export RGPD, effacement immédiat sur demande. La sauvegarde optionnelle de
compte est un JSON signé par le SPU. Aucune publicité, aucun traçage tiers,
aucune revente de données — la page Transparence de l'application dit tout cela
en français clair.

## 11. COÛTS ET HÉBERGEMENT

Le service complet tient sur le plan gratuit de Render (CPU 0,1, 1 Go) : 0 $.
Les quotas IA gratuits couvrent un usage individuel et un cercle de test ; au-
delà, un plan Starter (~7 $/mo) et/ou un fournisseur payant de secours lissent
la charge. Le disque du conteneur étant réinitialisé à chaque déploiement sur
le plan gratuit, la persistance des données utilisateurs (comptes, journal,
notes) exige un disque monté ou Postgres — voir le guide de mise en ligne
(`GUIDE-MISE-EN-LIGNE.md` §2).

## 12. LIMITES HONNÊTES

- Le matching reste statistique : il peut rater la nuance d'une question — le
  SPU le reconnaît sous le seuil de confiance.
- Sur un CPU gratuit, la gravation du BOOST prend 8-12 minutes : c'est annoncé
  et ne bloque rien, mais c'est long.
- La revue IA du rendu repose sur un ASR : les noms propres rares peuvent être
  faux positifs (le théâtre est toujours servi).
- Le corpus est francophone et clos : la richesse dépend de ses 100 textes.
- SQLite convient jusqu'à ~50 utilisateurs actifs ; au-delà, Postgres.
- Pas encore de rate limiting ni de tests E2E automatisés (audit v6.5 §B/§F).

## 13. ÉTHIQUE : LES RÈGLES NON NÉGOCIABLES

Un mentor, pas un maître. La détresse court-circuite tout. Aucune parabole
inventée, aucune source non vérifiée. La personne peut exporter et effacer.
Le mode Enfant filtre par défaut et ne collecte rien. La musique et les voix
sont libres ou locales (Piper MIT, musiques royalty-free documentées). Le
service ne prétend ni guérir, ni prédire, ni remplacer un humain de confiance.

## 14. FEUILLE DE ROUTE

- Court terme (P0 de l'audit) : persistance des données, rate limiting, garde
  du job BOOST, tests E2E des trois parcours critiques.
- Moyen terme : BOOST restauré au retour sur la vue, cache des didascalies,
  Sentry + supervision externe, mode voix élargi (nouvelles voix Piper).
- Long terme : mode communautaire (partage de paraboles sourcées), corpus
  bilingue, application Windows portable (scripts déjà présents).

## 15. ANNEXE A — METTRE LE SPU EN LIGNE

Voir `docs/GUIDE-MISE-EN-LIGNE.md` : Render pas à pas, variables
d'environnement, persistance des données (le point critique), Docker/VPS,
Hugging Face Spaces, durcissement avant ouverture aux tiers, coûts, dépannage.

## 16. ANNEXE B — INSTALLER SPU POCKET SUR UN TÉLÉPHONE

Télécharger l'APK depuis https://rodamen001.github.io/SPU/ → autoriser
l'installation d'applications inconnues → installer. L'application fonctionne
immédiatement hors ligne ; renseigner l'adresse du serveur dans les réglages
pour la lecture neurale et la synchro. (Détails : `docs/INSTALLER-SPU-POCKET.txt`.)

## 17. ANNEXE C — HISTORIQUE DES ÉDITIONS

- **Édition 3.0 — 16/11/2026** : mise à jour v6.5 — théâtre BOOST gravé en MP3
  serveur avec didascalies parlées et revue IA du rendu ; cadre musique adjacent
  (volume, titre toujours visible, notation sans quitter le fil) ; retour en
  arrière ; corpus porté à 100 textes ; Oracle inversé ; audit complet et guide
  de mise en ligne joints.
- **Édition 2.0 — 07/11/2026** : v4.4 — pipeline en 5 étapes, détresse, corpus
  65 textes, Pocket 1.2.0.
- **Édition 1.0** : naissance du concept, 50 paraboles.

## 18. LICENCE ET CONTACT

Code : dépôt GitHub RodAmen001/SPU (voix Piper : licence MIT ; modèles :
licence de leurs auteurs). Concept et textes du livre blanc : Rodamen001.
Contact : ramenyido@gmail.com. Le SPU est un projet indépendant, sans
publicité ni capital-risque ; son modèle économique est la gratuité rendue
possible par la frugalité.

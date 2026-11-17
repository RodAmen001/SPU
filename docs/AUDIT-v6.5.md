# AUDIT COMPLET DU SPU — v6.5 (16 novembre 2026)

**Auditeur** : revue interne d'ingénierie, double posture — expert développeur (architecture,
sécurité, opérations) et testeur/utilisateur (6 sessions réelles d'utilisation, du mobile au desktop).
**Périmètre** : tout le dépôt — 27 routes API, 21 bibliothèques métier, 15 composants React,
9 modèles de données, l'app Android (SPU Pocket), les scripts, la CI/CD Render, les docs.

> ## ✅ STATUT DES CORRECTIONS (mise à jour v6.6 — 17 novembre 2026)
>
> | Point | Statut |
> | --- | --- |
> | **B1** rate limiting | ✅ **implémenté** — `src/lib/spu/rate-limit.ts`, appliqué à `/api/ask`, `/api/mentor`, `/api/repondre` (réponse CORS), `/api/oracle-inverse`, `/api/tts` (30/min), `/api/boost/audio` (5/min), `/api/musique` POST (30/min) ; `/api/perspective` conserve son limiteur historique |
> | **B2** job BOOST arbitraire | ✅ **implémenté** — le POST ne reçoit plus qu'un identifiant d'échange : le serveur relit le scénario qu'il a lui-même stocké (payload `mentor-boost-pret` ou `boostState.pret`) ; plafonds `scenarioValidePourGravure` (12 scènes, 8 personnages, 20 000 caractères) |
> | **B3** notes hors catalogue | ✅ **implémenté** — `notes-musique.ts` : titre obligatoirement dans `musiques-libres.json` (100 pistes), note strictement entière 1-5, mode known-list |
> | **B4** en-têtes de sécurité | ✅ **implémenté** — `next.config.ts` : CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS |
> | **B5** LogsDetresse non bornés | ✅ **implémenté** — purge 90 jours dans la purge opportuniste RGPD de `/api/ask` (la table ne contient déjà que des empreintes) |
> | **C1** données éphères | ✅ **prêt côté code** — `docker-entrypoint.sh` suit `DATABASE_URL` : monter un Render Disk sur `/app/db` et tout persiste sans changer une ligne (décision d'achat à faire dans la console Render) |
> | **C2** latence CPU gratuit | ✅ **atténué côté code** — délai Piper 30 → 45 s (moins de replis navigateur) ; la vraie solution de débit reste le plan Starter (décision produit) |
> | **C3** BOOST perdu au retour | ✅ **implémenté** — `GET /api/boost?sessionId=…` ressort l'état du dernier dialogue Mentor (prêt / en préparation / échec) ; FluxMentor restaure au montage ; l'identifiant d'échange accompagne le théâtre jusqu'à la gravation |
> | **C4** zéro test | ✅ **socle posé** — `bun test tests/` (12 tests : limiteur, validation notes, partition BOOST + plafonds, comptes scrypt) + script npm `test` ; les tests E2E Playwright des 3 parcours critiques restent à écrire |
> | **C5** observabilité | ⏳ externe — Sentry + ping UptimeRobot à brancher sur `/api/health` (comptes gratuits à créer) |
> | **C6** quotas gratuits | ⏳ décision produit — fournisseur payant de secours (~5 $/mo) |
> | **C7** documentation | ✅ **fait** — livre blanc Édition 3.0, guide de mise en ligne, présent audit |

---

## A. ÉTAT DES LIEUX — CE QUI EST SOLIDE

1. **Architecture limpide et frugale.** Next.js 15 (sortie standalone), bun, SQLite via
   Prisma, Piper pour la voix : tout le service pèse ~10 Mo de code et tourne sur 1 Go
   de RAM. Le Dockerfile multi-étages est propre (deps → build → runtime) et embarque
   les voix ; le seed recrée le corpus automatiquement.
2. **Sécurité des comptes correcte.** Mots de passe dérivés par scrypt avec sel
   aléatoire et comparaison à temps constant (`timingSafeEqual`) ; jetons de session
   aléatoires 32 octets ; admin protégé par `ADMIN_TOKEN` d'environnement ;
   purge 90 jours des échanges ; export RGPD ; quarantaine des contenus externes
   validable manuellement.
3. **Résilience IA réelle.** Chaîne z.ai → Groq → GitHub Models → Pollinations,
   deux passes, jusqu'à 12 essais, budget `AsyncLocalStorage` pour ne jamais dépasser
   le temps du proxy ; les gros travaux (scénario BOOST) partent en arrière-plan
   après la fermeture du flux → zéro 502. En cas de saturation totale, canevas
   locaux identifiés comme tels.
4. **Voix : conception professionnelle.** 12 profils mappés sur 4 modèles Piper réels
   (mesures de F0 documentées dans les scripts), pitch/longueur + normalisation
   `dynaudnorm`, sortie homogène 22050 Hz mono, cache LRU, dédoublonnage des
   générations en vol, préchauffage au démarrage, débit utilisateur réglable.
5. **Le BOOST (v6.4/6.5) est un vrai théâtre gravé** : partition complète (titre de
   scène, didascalies PARLÉES par le narrateur — l'annonce de la condition avant la
   prise de parole —, présentation des personnages), une génération Piper à la fois,
   MP3 unique + manifest de synchronisation de la bande dessinée, cache par empreinte,
   et **revue IA du rendu** (WAV maître découpé en 25 s → ASR z-ai → comparaison
   transcription/script → corrections → régénération des segments fautifs).
6. **Éthique non négociable et visible** : détection de détresse en < 1 s qui
   court-circuite tout (réponse humaine, logs dédiés `LogsDetresse`), posture
   « un mentor, pas un maître », transparence dans l'app, questions ouvertes finales.
7. **Hors-ligne réel** (Pocket) : corpus embarqué, oracle inversé local, mode nomade.
8. **Expérience v6.4/6.5 corrigée** : noter la musique ne quitte plus jamais la
   conversation (cadre adjacent + rectangle fixé sur mobile), volume réglable dans le
   cadre, titre toujours lisible, bouton retour en arrière (historique), BOOST toujours
   proposé après les 3 requêtes (attente 10 min + échec annoncé).

---

## B. FAILLES (sécurité) — à corriger avant une ouverture large

### B1. Rate limiting absent — risque d'épuisement économique (P0)
Toutes les routes coûteuses (`/api/tts`, `/api/boost/audio`, `/api/ask`, `/api/mentor`,
`/api/repondre`, `/api/perspective`) sont publiques sans limite de débit. Sur le plan
gratuit Render (0,1 CPU), quelques clients automatisés suffisent à saturer le service
et à consommer les quotas IA. **Correction** : middleware de limitation par IP
(ex. 20 req/min sur les routes IA/TTS, 5 req/min sur `/api/boost/audio`), ou accès
sur invitation tant que ce n'est pas en place.

### B2. `/api/boost/audio` accepte n'importe quel scénario (P1)
Le POST prend un scénario arbitraire du client et déclenche Piper + ASR + LLM.
Un usage malveillant pourrait y faire du « calcul gratuit » ou remplir /tmp.
**Correction** : ne lancer le job que si le scénario existe déjà en BD (échange/
boostState), plomber la taille du scénario, une file globale d'un job à la fois,
purge périodique de `/tmp/spu-boost`.

### B3. `/api/musique` POST accepte n'importe quel titre (P2)
Les notes peuvent être écrites sur des titres hors catalogue (spam de données).
**Correction** : valider `titre`/`artiste` contre le catalogue chargé, plafonner la
longueur, ignorer les doublons massifs par session.

### B4. En-têtes de sécurité absents (P2)
Pas de CSP, X-Frame-Options, Referrer-Policy, HSTS explicites.
**Correction** : les ajouter dans `next.config.ts` (headers()) ou au reverse-proxy.
Aucune donnée sensible n'est exposée au DOM, le risque reste faible mais standard.

### B5. Rétention des `LogsDetresse` non bornée (P2)
Le journal des échanges est purgé à 90 jours ; la table de logs de détresse n'a pas
de purge visible. **Correction** : même politique (90 jours) + anonymisation du texte
au-delà, en cohérence avec la page Transparence.

---

## C. FAIBLESSES MAJEURES (produit/opérations)

### C1. Perte des données à chaque redéploiement (P0)
SQLite vit dans le disque du conteneur : chaque redéploiement Render réinitialise le
disque → **comptes, journal, notes perdues** (le corpus est recréé par seed). C'est
acceptable pour un prototype, **intolérable pour des tiers**. Corrections possibles :
Render Disk sur `/app/db` (le plus simple), Postgres via Prisma, ou sauvegarde
périodique. Documenté dans `GUIDE-MISE-EN-LIGNE.md` §2.

### C2. Latence du CPU gratuit (P1)
Piper sur 0,1 CPU : 15-25 s par segment → gravation d'un BOOST complet 8-12 min ;
les segments narratifs longs dépassent parfois le délai de 30 s de `/api/tts` →
repli navigateur (voix plus pauvres) pendant la narration. Corrections :
plan Starter (×3-5), segments plus courts côté narration, ou cache pré-généré des
didascalies fréquentes.

### C3. Le BOOST se perd si on quitte la vue (P1)
Le polling vit dans le composant : si la personne change de page ou ferme, le scénario
arrive plus tard mais **n'est plus réclamé** (il dort en BD). Correction recommandée :
au montage de FluxMentor/VueEnfant, interroger `/api/boost` avec le dernier
echangeId connu (session ou échange de synthèse) et resservir le théâtre.

### C4. Aucun test automatisé (P1)
Zéro test unitaire/E2E. Les régressions sont arrivées trois fois par effet de bord
(voix unique, cadre musique qui démontait le fil, BOOST qui n'apparaissait pas).
Corrections : Playwright E2E sur les 3 parcours critiques (Oracle complet, Mentor
3 requêtes → BOOST, notation musicale sans quitter le fil) + tests unitaires du noyau
(matching, budget, planification BOOST, `dureeWav`). Ces quatre bogues auraient été
attrapés par deux tests chacun.

### C5. Observabilité minimale (P2)
`/api/health` et `/api/diagnostic` existent, mais pas de monitoring d'erreurs ni
d'alertes. Corrections : Sentry (gratuit) côté serveur, et un ping externe (UptimeRobot)
sur `/api/health`.

### C6. Dépendance aux quotas gratuits (P2)
Si z.ai + Groq + GitHub Models + Pollinations saturent simultanément, les réponses
tombent sur les canevas locaux (correct mais générique). Correction : un fournisseur
payant de secours (~5 $/mo) supprime ce risque.

### C7. Documentation de distribution fragmentée (corrigé aujourd'hui)
Le livre blanc traînait à v4.4 (65 textes, 4 modes, « Deep ») alors que le produit est
à v6.5 (100 textes, 6 modes, Oracle inversé, BOOST MP3). Corrigé : édition 3.0 du
livre blanc + ce guide de mise en ligne + cet audit.

---

## D. PROBLÈMES UTILISATEUR OBSERVÉS (testeur, sessions réelles)

| # | Constat | État |
| --- | --- | --- |
| 1 | Noter la musique quittait la conversation et perdait le fil | ✅ corrigé v6.4 (cadre adjacent) |
| 2 | Titre de la chanson invisible en profondeur de défilement | ✅ corrigé v6.5 (cadre fixé + titre non tronqué) |
| 3 | Volume non réglable depuis le cadre | ✅ corrigé v6.5 |
| 4 | BOOST absent en fin de Mentor (« nouveau dialogue » à la place) | ✅ corrigé v6.5 (polling 10 min + échec annoncé) |
| 5 | BOOST lu d'une seule voix monotone | ✅ corrigé v6.4 (MP3 serveur, voix distinctes garanties) |
| 6 | Didascalies non lues (« Léo marche dans la ville, les yeux plissés ») | ✅ corrigé v6.4 (didascalies PARLÉES avant la prise de parole) |
| 7 | Fautes de français dans les répliques (« NE TE RENDRE PAS… ») | ✅ corrigé v6.4 (relecture IA du scénario + règle « français impeccable ») |
| 8 | Contenu BOOST générique | ✅ amélioré v6.4 (personnages à condition précise tirés du chemin) |
| 9 | Attente entre répliques / latence de démarrage | ✅ corrigé v6.2/6.3 (préparation en arrière-plan, premier segment court) |
| 10 | **Reste à traiter** : BOOST restauré au retour sur la vue (C3), latence Piper gratuite (C2), tests E2E (C4) | ⏳ plan §F |

---

## E. INVENTAIRE TECHNIQUE RÉSUMÉ

- **Modes** : Oracle · Mentor (3 étapes + BOOST) · Oracle inversé · Enfant (fil continu
  + bande dessinée) · Musiques (catalogue + notation globale) · Journal (30 jours visibles).
- **Corpus** : 100 textes sourcés (75 paraboles adultes, 5 cultures, 10 familles ;
  25 fables) — même base serveur et Pocket ; sources vérifiées (Wikiquote, Wikipédia,
  Wikisource) ; quarantaine + validation admin pour les sources externes.
- **IA** : orchestrateur multi-moteurs avec replis en cascade, matching TF-IDF + arbitrage
  sémantique, détection de détresse, perspective biblique distincte.
- **Audio** : musiques de fond par mode accordées à la parabole (culture/famille),
  ducking sous la voix, notation globale des auditeurs ; 12 profils de voix neuronales ;
  BOOST gravé en MP3 avec revue IA.
- **Données** : Session, Echange (parabole, synthèse, histoire, payload BOOST),
  User, Sauvegarde, SourcesCache, Quarantaine, LogsDetresse, NoteMusique, Parabole.
- **Pocket** : APK signé, corpus embarqué, oracle inversé hors ligne, `/api/version`
  pour annoncer les nouveautés.

---

## F. PLAN DE CORRECTIONS RECOMMANDÉ (priorisé)

**P0 — avant toute ouverture aux tiers**
1. Persistance des données (Render Disk `/app/db` ou Postgres) — 1 h de travail.
2. Rate limiting par IP sur les routes IA/TTS/boost — 2 h.
3. `/api/boost/audio` : job seulement pour scénario existant en BD + plafond de taille — 1 h.

**P1 — la semaine suivante**
4. Restauration du BOOST au retour sur la vue (C3) — 2 h.
5. Tests E2E Playwright (3 parcours critiques) + CI à chaque push — 1 jour.
6. Plan Render Starter si la fréquentation réelle le justifie (latence voix) — décision coût.
7. En-têtes de sécurité (CSP…) — 1 h.
8. Purge 90 jours des LogsDetresse — 30 min.

**P2 — les prochaines semaines**
9. Validation des titres musicaux notés contre le catalogue — 1 h.
10. Sentry + ping externe — 2 h.
11. Cache pré-généré des didascalies courantes — 1 h.
12. Un fournisseur IA payant de secours — décision produit.
13. Mode communauté (v6.x roadmap) : seulement après P0/P1.

---

## G. VERDICT

**Le SPU est techniquement prêt pour une ouverture restreinte (cercle de test,
10-50 utilisateurs bienveillants) dès aujourd'hui** — la v6.5 a closé les défauts
d'expérience signalés en session et la chaîne IA est résiliente. **Pour une ouverture
publique large**, appliquer d'abord les trois P0 (persistance, rate limit, garde du
job BOOST) et les tests E2E : c'est une demi-journée de travail qui transforme un
prototype solide en service fiable. Le fond — éthique, corpus sourcé, théâtre audio
gravé, revue IA du rendu — est au niveau de la promesse du livre blanc.

---
*Audit réalisé sur le dépôt `RodAmen001/SPU` — commit `3e81453` (v6.5) —
documents liés : `GUIDE-MISE-EN-LIGNE.md`, `LIVRE-BLANC-SPU-v6.5-2026-11-16.md`.*

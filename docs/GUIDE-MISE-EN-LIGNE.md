# Guide complet de mise en ligne du SPU — pour un usage direct par des tiers

*SPU v6.5 · 16 novembre 2026 · à jour avec le BOOST MP3 serveur, la revue IA du rendu et le cadre musique adjacent*

Ce guide couvre TOUT ce qu'il faut pour mettre le SPU en ligne **tel quel** et l'ouvrir
à des utilisateurs tiers : l'application web (Next.js), l'API, les voix neuronales,
la base de données, l'application Android SPU Pocket, et le durcissement de sécurité.

---

## 0. Ce que tu mets en ligne

| Composant | Rôle | Taille |
| --- | --- | --- |
| **SPU Web** (Next.js standalone) | les 6 modes (Oracle, Mentor, Oracle inversé, Enfant, Musique, Journal), l'API, le théâtre BOOST MP3 | ~10 Mo de code |
| **Voix neuronales** (Piper + 4 modèles français) | narration locale, 12 profils de voix distinctes | ~270 Mo dans l'image |
| **Base SQLite** (`db-origine/custom.db`) | corpus 100 textes sourcés + catalogue musiques | ~190 Ko |
| **SPU Pocket** (APK Android) | mode nomade hors-ligne + oracle inversé embarqué | < 2 Mo |
| **Musiques** (fichiers MP3/WAV) | catalogues par mode | dans `public/` + BD |

---

## 1. Voie recommandée : Render (celle utilisée aujourd'hui)

### 1.1 Prérequis
- Le dépôt GitHub **RodAmen001/SPU** (tout y est : code, Dockerfile, corpus, scripts).
- Un compte Render (le plan gratuit fonctionne ; voir §2 pour la persistance).

### 1.2 Étapes
1. **Render → New → Web Service** → connecter le dépôt GitHub.
2. **Runtime** : laisser « Docker » — le `Dockerfile` fait tout : build Next.js standalone,
   `prisma db push`, seed du corpus, installation de Piper + des 4 voix depuis
   Hugging Face (`Rodamen/spu-voix`).
3. **Variables d'environnement** (Environment) :

   | Variable | Obligatoire | Valeur / rôle |
   | --- | --- | --- |
   | `DATABASE_URL` | ✅ | `file:/app/db/custom.db` (déjà la valeur du Dockerfile) |
   | `GROQ_API_KEY` | recommandée | IA de secours + chaîne LLM (l'audio Whisper n'y est pas activé pour cette clé : l'ASR passe par z-ai) |
   | `ADMIN_TOKEN` | recommandée | jeton secret pour `/api/admin/validate` (quarantaine des contenus) |
   | `PORT` | — | 3000 par défaut (Render détecte) |
   | `SPU_PIPER_BIN` / `SPU_PIPER_VOIX` | — | déjà pointés vers `/app/voix-piper/...` par l'image |

4. **Deploy** — le premier build prend ~8-12 min (téléchargement des voix).
5. **Vérifications après déploiement** :
   - `https://TON-SERVICE.onrender.com/api/health` → `ok`
   - `/api/version` → `serveur.version = 6.5`
   - `/api/diagnostic` → état BD + corpus + moteurs
   - une question dans le mode Oracle → réponse + narration
   - un dialogue Mentor de 3 requêtes → offre « Lancer le BOOST » → MP3 gravé (voir §5)

### 1.3 Domaine personnalisé
Render → Settings → Custom Domain → suivre la vérification DNS (CNAME). TLS est fourni
automatiquement (Let's Encrypt).

---

## 2. ⚠️ PERSISTANCE DES DONNÉES — À RÉGLER AVANT D'OUVRIR AUX TIERS

C'est **le point critique numéro un** : la base SQLite vit dans le système de fichiers
du conteneur. Sur le plan gratuit Render, **chaque redéploiement réinitialise le disque**
→ comptes, journal, échanges, notes musicales **disparaissent** (le corpus, lui, est
recréé par le seed : rien n'est perdu côté contenu).

**Trois solutions, par ordre de préférence :**

1. **Render Disk** (payant, ~0,25 $/Go/mois) : Settings → Disks → monter sur
   `/app/db`. La base survit aux redéploiements. Simple, aucune ligne de code.
2. **PostgreSQL** : changer le provider Prisma (`datasource db { provider = "postgresql" }`),
   fournir `DATABASE_URL` Postgres (Neon/Supabase gratuits), `prisma db push`.
   Robuste pour beaucoup d'utilisateurs ; les modèles Prisma sont déjà neutres
   (aucune spécificité SQLite dans le schéma).
3. **Sauvegarde périodique** (gratuit, minimale) : cron externe qui appelle un job de
   copie de `db/custom.db` vers un stockage durable. Acceptable pour un public restreint.

Sans aucune de ces solutions, assume l'avertissement : « tes échanges restent sur cet
écran / ce navigateur » — et les comptes seront perdus à chaque mise à jour.

---

## 3. Autres hébergements

### 3.1 Docker partout (VPS, NAS, local)
```bash
docker build -t spu .
docker run -d -p 3000:3000 -e DATABASE_URL=file:/app/db/custom.db \
  -e GROQ_API_KEY=… -e ADMIN_TOKEN=… \
  -v spu-data:/app/db \
  --name spu spu
```
Le volume `-v spu-data:/app/db` résout la persistance sur un VPS.
Un `Caddyfile` est fourni pour un reverse-proxy HTTPS en 2 lignes.

### 3.2 Hugging Face Spaces
Le Dockerfile expose le port 7860 attendu par les Spaces (commentaire d'origine).
Créer un Space « Docker », pousser le dépôt, ajouter les secrets dans Settings.

### 3.3 Local / intranet
```bash
bun install && bunx prisma db push && bun run scripts/seed.ts && bun run dev
```
(<http://localhost:3000>)

---

## 4. Les voix neuronales (déjà incluses)

L'image télécharge automatiquement depuis **Hugging Face `Rodamen/spu-voix`** :
`fr_FR-tom-medium` (44,1 kHz), `fr_FR-gilles-low` (16 kHz), `fr_FR-upmc-medium`
(22,05 kHz), `fr_FR-mls-medium` (22,05 kHz, multi-locuteurs). Les 12 profils du SPU
sont mappés sur ces 4 modèles avec pitch/longueur + normalisation `dynaudnorm`,
tout homogène 22050 Hz mono.

Pour remplacer ou ajouter une voix : déposer `modele.onnx` + `.json` dans
`voix-piper/modeles/` (local) ou pousser sur le dépôt HF, puis ajuster
`CONFIGURATIONS` dans `src/lib/spu/voix-neurales.ts`.

**Sur Render gratuit**, une génération Piper prend 15-25 s par segment (CPU 0,1) :
la gravation d'un BOOST complet prend 8-12 min en arrière-plan — c'est normal et
affiché. Pour diviser ce délai par 3-5, passe au plan Starter (0,5 CPU+).

---

## 5. Le BOOST en MP3 (v6.4/6.5) — vérification en production

1. Mode Mentor : poser 3 requêtes (la 3ᵉ produit la synthèse).
2. La carte « ⚡ BOOST en préparation… » s'affiche (attente jusqu'à 10 min).
3. L'offre « Lancer le BOOST » apparaît → le client demande la gravation à
   `/api/boost/audio` (job en arrière-plan : titres de scène, didascalies PARLÉES,
   présentation des personnages, une voix à la fois) → un MP3 unique + manifest.
4. La **revue IA** transcrit le WAV maître (ASR z-ai, morceaux de 25 s) et compare au
   script ; les fautes sont corrigées et les segments régénérés avant livraison.
5. Contrôles : `GET /api/boost/audio?id=…` → `etat: pret` + `revue` (score, couverture).

---

## 6. SPU Pocket (Android)

1. L'APK signé est distribué depuis la page GitHub Pages du dépôt
   (`https://rodamen001.github.io/SPU/` — voir `spu-kit/` et
   `scripts/build-apk.sh` pour regénérer : version, corpus, icônes).
2. Installation : télécharger l'APK → autoriser « installer des applications
   inconnues » → installer. `versionCode`/`versionName` dans
   `apk-spu/AndroidManifest.xml` ; `/api/version` annonce les nouveautés à l'app.
3. Le Pocket fonctionne **hors-ligne** (corpus embarqué) ; connecté au serveur, il
   ajoute le mode Enfant en fil continu et la lecture neurale.

---

## 7. Durcissement avant ouverture aux tiers (checklist)

- [ ] **Persistance réglée** (§2) — sinon comptes perdus à chaque déploiement.
- [ ] `ADMIN_TOKEN` défini (12+ caractères aléatoires).
- [ ] Limiter les routes coûteuses : `/api/tts`, `/api/boost/audio`, `/api/ask`,
      `/api/mentor` sont publiques et consomment CPU/IA. Ajouter un rate-limit
      par IP (ex. middleware : 20 req/min) ou mettre le service en « accès sur
      invitation » (liste blanche) tant que cette protection n'existe pas.
- [ ] `/api/boost/audio` : ne lancer un job QUE pour un scénario existant en BD
      (amélioration préconisée, voir `docs/AUDIT-v6.5.md` §F2).
- [ ] Vérifier `/api/health` + logs Render après chaque déploiement.
- [ ] Sauvegarde hebdomadaire de la base (§2.3) hors du conteneur.
- [ ] Page « Transparence » à jour (elle liste moteurs IA, données, purge 90 jours).
- [ ] Ajouter des en-têtes de sécurité (CSP, X-Frame-Options, Referrer-Policy) via
      `next.config.ts` ou le reverse-proxy.
- [ ] Surveiller les quotas : z.ai (principal), Groq (secours), GitHub Models,
      Pollinations — l'ordre de repli est automatique, mais si TOUT sature,
      les réponses tombent sur les canevas locaux (identifiés comme tels).

---

## 8. Maintenance courante

| Tâche | Commande / action |
| --- | --- |
| Mettre à jour le service | `git push` sur `main` → Render redéploie tout seul |
| Restaurer un bac à sable de dev | `bash scripts/restaurer-sandbox.sh main` (jeton requis) |
| Ajouter des paraboles | `python3 scripts/ajouter-paraboles.py` puis re-seed |
| Ajouter des musiques | `python3 scripts/ajouter-musiques.py` |
| Regénérer le corpus Pocket | `scripts` data.js + HTML autonome (voir scripts/) |
| Tests post-déploiement | `/api/health`, `/api/version`, `/api/diagnostic`, dialogue Mentor complet |

---

## 9. Coûts estimés ( configuration tiers)

| Poste | Plan gratuit | Plan confort |
| --- | --- | --- |
| Render web service | 0 $ (CPU 0,1 + disque éphère) | 7 $/mo (Starter) + 0,25 $/mo disque |
| IA (z.ai / Groq / GitHub Models / Pollinations) | 0 $ (quotas gratuits) | 0 $, ou ~5 $/mo de marge sur un fournisseur payant |
| Voix | 0 $ (Piper local) | 0 $ |
| Postgres (option) | 0 $ (Neon free) | 0-5 $ |
| **Total** | **0 $** | **~7-12 $/mo** |

---

## 10. Dépannage rapide

| Symptôme | Cause probable | Remède |
| --- | --- | --- |
| 502 au démarrage | build/seed échoué | voir les logs Render ; `prisma db push` + seed dans le Dockerfile |
| Voix 503 (narration navigateur) | Piper absent/bloqué + CPU saturé | vérifier `SPU_PIPER_BIN` ; réduire la charge ; plan Starter |
| BOOST n'apparaît jamais | préparation > 10 min (quotas IA saturés) | vérifier les clés ; le payload est stocké — relancer un dialogue |
| `/api/boost/audio` 404 au GET mp3 | job perdu (redémarrage du conteneur) | relancer : le POST est idempotent (empreinte du scénario) |
| Notes musicales perdues | disque éphère | appliquer §2 |
| ASR revue absent | clé audio Groq interdite | attendu (403) — l'ASR passe par z-ai ; le théâtre est servi sans revue |
| BD « database is locked » | écritures SQLite concurrentes | acceptable à petite échelle ; passer à Postgres au-delà de ~50 utilisateurs actifs |

---

*Contact : ramenyido@gmail.com — Dépôt : https://github.com/RodAmen001/SPU —
Livre blanc : `docs/LIVRE-BLANC-SPU-v6.5-2026-11-16.md` — Audit : `docs/AUDIT-v6.5.md`*

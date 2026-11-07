# SPU — Système Parabolique Universel

> Un mentor, pas un maître 🌿 — il aide à penser ; il ne pense pas à la place.

SPU est un orchestrateur narratif multi-IA : toute question de vie devient une
synthèse sourcée de plusieurs intelligences, mise en correspondance avec une
**parabole réelle et sourcée** issue d'un corpus clos de 65 textes, puis une
**histoire personnalisée** générée à la demande. Aucune parabole inventée par
l'IA : chaque texte est réel, attribué honnêtement et vérifié.

- **Serveur SPU v4.4** : application web complète (Next.js 16) — modes Oracle,
  Mentor, Deep et Enfant, comptes utilisateurs, journal, sauvegardes.
- **SPU Pocket v1.2.0** : application Android compagnon (APK 62 Ko, Android 7+),
  avec un **mode nomade qui fonctionne dès l'installation, sans serveur**.

---

## ⬇️ Téléchargements (SPU Pocket v1.2.0)

| Fichier | Lien direct |
|---|---|
| **Application Android (APK)** | [spu-pocket-v1.2.0.apk](https://github.com/Rodamen001/SPU/raw/main/telechargements/spu-pocket-v1.2.0.apk) |
| Format Google Play (AAB) | [spu-pocket-v1.2.0.aab](https://github.com/Rodamen001/SPU/raw/main/telechargements/spu-pocket-v1.2.0.aab) |
| Kit complet (APK + AAB + keystore + guides) | [kit-spu-pocket-v1.2.zip](https://github.com/Rodamen001/SPU/raw/main/telechargements/kit-spu-pocket-v1.2.zip) |
| **Livre blanc** (le concept en détail) | [LIVRE-BLANC-SPU-v4.4.txt](docs/LIVRE-BLANC-SPU-v4.4-2026-11-07.txt) |
| Guide d'installation pas à pas | [INSTALLER-SPU-POCKET.txt](docs/INSTALLER-SPU-POCKET.txt) |

Les mêmes fichiers sont attachés à la
[**page des versions**](https://github.com/Rodamen001/SPU/releases) (releases),
et une page de téléchargement conviviale est servie par GitHub Pages :
**https://rodamen001.github.io/SPU/**

> ⚠️ L'APK n'est pas sur le Play Store : Android affichera un avertissement
> « application inconnue » — c'est normal, la procédure d'installation est
> décrite dans le [guide](docs/INSTALLER-SPU-POCKET.txt).

---

## 🧭 Comment fonctionne le SPU

```
 Question de vie
        │
        ▼
 ┌── Phase 0 : sécurité (3 couches) ────────────────────────┐
 │  A. 14 regex de détresse      B. classifieur IA (seuils)  │
 │  C. heuristique de tonalité (51 mots négatifs + 18 rupture)│
 │  → si détresse : réponse humaine immédiate, rien d'autre   │
 └──────────────────────────────────────────────────────────┘
        │
        ▼
 Orchestration multi-IA (4 sources en parallèle, 8 s max)
   Recherche Web · Intelligence réflexive · Encyclopédie · DuckDuckGo
   cache 24 h · limite 20 requêtes/min/IP · synthèse ≤ 120 mots, citée
        │
        ▼
 Matching TF-IDF sur le corpus (8 candidats, seuil 0,65)
   + arbitrage sémantique IA → la parabole juste (top-1 : 90 %)
        │
        ▼
 Histoire personnalisée (adulte 150-300 mots / enfant 100-200 mots)
   + filtre post-génération (violence / sexuel / haine)
        │
        ▼
 Rendu immersif : narration, voix, musique d'ambiance, journal
```

### Les 4 modes
- **Oracle** — une réponse unique et complète.
- **Mentor** — un dialogue en 3 étapes : ouverture, approfondissement, synthèse
  avec une question ouverte.
- **Deep** — un parcours de contemplation en 3 niveaux.
- **Enfant** — espace protégé séparé : corpus dédié (15 contes du domaine
  public), gros boutons, lecture à voix haute, filtres stricts.

---

## 📖 Le corpus

- **50 paraboles adultes** — 10 par aire culturelle (Afrique de l'Ouest, Asie,
  Méditerranée, Nordique/Celtique, Universaliste), réelles et sourcées, avec 3+
  interprétations chacune, classées en 10 familles (F1-F10).
- **15 contes enfants** — La Fontaine, Ésope, Grimm, Panchatantra, tradition
  ashanti (domaine public).
- **35 URLs de sources vérifiées une à une** (Wikiquote, Wikipédia, Wikisource).
- Règle absolue : **aucune parabole inventée par IA**.

Le corpus est consultable dans l'application et téléchargeable en JSON
(`src/data/corpus-adulte.json`, `src/data/corpus-enfant.json`).

---

## 📱 SPU Pocket v1.2.0

Application Android native (62 Ko) développée sans framework :

- **Mode nomade** : l'écran « Poser une question » fonctionne **dès
  l'installation, sans aucun serveur** (IA publique gratuite, réponse directe,
  sécurité détresse intégrée).
- **Bibliothèque hors-ligne** : les 65 textes du corpus sont intégrés dans
  l'application (`data.js`), consultables en avion, en brousse, partout.
- **Mode connecté** : en renseignant l'adresse d'un serveur SPU, la réponse
  devient narrée complète (synthèse sourcée, parabole, histoire, voix).

---

## 🔐 Comptes, journal et confidentialité

- Comptes minimalistes : pseudonyme + mot de passe, mots de passe **jamais
  transmis en clair** (dérivation scrypt, sel 16 octets), jetons de session
  aléatoires 64 hex valables 7 jours, sessions persistantes 90 jours.
- **Journal** complet de vos échanges, exports `.txt` / `.json` / `.md`,
  **sauvegardes** instantanées restaurables, effacement RGPD immédiat,
  purge automatique à 90 jours.
- Les logs de détresse sont **anonymisés** (hash + horodatage) et ne quittent
  jamais le serveur.

---

## 🚀 Faire tourner le SPU soi-même

Prérequis : Node.js 20+ ou Bun, une machine avec 1 Go de RAM suffit.

```bash
# 1. Dépendances
bun install                     # ou npm install

# 2. Base de données (SQLite)
echo 'DATABASE_URL="file:./db/custom.db"' > .env
bunx prisma db push
bun run scripts/seed.ts         # 65 paraboles

# 3. Développement
bun run dev                     # http://localhost:3000

# 4. Production
bash scripts/build-standalone.js
bun .next/standalone/server.js  # http://localhost:3000
```

Variable optionnelle : `ADMIN_TOKEN` (jeton de l'API d'administration
`/api/admin/validate`). Aucune clé API n'est nécessaire : les sources
externes sont sans clés, le SDK d'IA est fourni par l'environnement.

Pour reconstruire l'APK : `bash scripts/installer-sdk.sh` (SDK minimal,
une fois) puis `bash scripts/build-apk.sh` → `download/spu-pocket-v1.2.0.apk`.

---

## 🧪 Tests

```bash
bun run scripts/test-phase0.ts            # sécurité détresse : 30/30 ✓
bun run scripts/test-matching.ts          # matching : top-1 90 %, top-3 100 % ✓
node scripts/test-modes.mjs               # Mentor, Deep, Enfant, perspective ✓
bash scripts/verify-urls.sh               # les 35 URLs de sources ✓
node scripts/test-e2e.mjs "question"      # parcours complet SSE ✓
```

---

## 📁 Structure du dépôt

```
├── src/app/          routes API (23) + application React
├── src/lib/spu/      le moteur (détresse, sources, matching, histoire…)
├── src/data/         le corpus JSON (65 entrées)
├── prisma/           schéma de base (8 tables, SQLite)
├── apk-spu/          SPU Pocket (sources Android + interface)
├── android/          scripts d'installation sur Android (proot)
├── electron/         habillage bureau (Windows / Mac / Linux)
├── scripts/          builds, tests, seed, gardien de serveur
├── telechargements/  APK, AAB et kit officiels (dans le dépôt)
└── docs/             livre blanc, guide d'installation, page web
```

## 🗺️ Feuille de route

- Extension du corpus vers 300 paraboles (structure déjà prête).
- Interface d'administration de la quarantaine.
- Multilingue (v4.1 du cahier des charges).
- Publication sur le Play Store (AAB déjà prêt).

## ⚖️ Éthique — rappel non négociable

Ne jamais : inventer de parabole, cacher qu'une réponse est une synthèse,
faire transiter la détresse vers des tiers, stocker des données personnelles
sans consentement, mettre des clés API côté client. Les pages **Transparence**
et **Confidentialité** sont intégrées à l'application.

## 📄 Licence & contact

© 2026 Rodamen001 — tous droits réservés. Le corpus s'appuie sur des sources
libres (Wikiquote, Wikipédia, Wikisource, CC BY-SA) citées entrée par entrée.

Contact : **ramenyido@gmail.com**

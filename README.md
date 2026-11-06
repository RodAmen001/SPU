# SPU v4.0 — Système Parabolique Universel

Orchestrateur narratif multi-IA : toute question existentielle devient une synthèse sourcée de plusieurs intelligences, mise en correspondance avec une **parabole réelle et sourcée** d'un corpus clos, puis une **histoire personnalisée** générée à la demande.

> Un mentor, pas un maître. Il aide à penser ; il ne pense pas à la place.

---

## 1. Ce qui est livré (v4.0 — périmètre acté)

| Pilier du cahier | Implémentation |
|---|---|
| **Phase 0 — Détresse** (3.1) | 3 couches : lexicale (regex FR/EN) + classifieur LLM (score 0-1) + heuristique de tonalité. Réponse humaine immédiate, **aucune source externe appelée**, logs anonymisés (hash + horodatage), jamais de parabole. |
| **Orchestration multi-IA** (3.2) | 4 sources en parallèle (`Promise.allSettled`, timeout 8 s) : Recherche Web, Intelligence réflexive (LLM), Encyclopédie (Wikipédia via lecteur), DuckDuckGo Instant Answers. Cache 24 h par hash SHA-256, rate limiting 20 req/min/IP. |
| **Synthèse** (3.3) | Prompt imposé du cahier, ≤ 3 phrases, ≤ 120 mots, citations [1][2], signale les contradictions, score de confiance. |
| **Matching vectoriel** (3.4) | Index TF-IDF pondéré (mots-clés éditoriaux ×2) + similarité cosinus en mémoire + **arbitrage sémantique LLM** sur le top-5. Seuil 0,65 ; sous le seuil → mention honnête « parabole la plus proche ». |
| **Génération d'histoire** (3.6) | Prompts imposés (adulte 150-300 mots / enfant 100-200 mots), tonalité détectée, **filtre post-génération** (violence/sexuel/haine) avec régénération puis template sûr. |
| **Modes** (Partie 4) | **Oracle** (réponse unique), **Mentor** (3 étapes : ouverture → approfondissement → synthèse + question ouverte), **Deep** (3 niveaux : contemplation → méditation → perspective), **Enfant** (espace séparé, corpus dédié, TTS, gros boutons, filtres stricts). |
| **Immersion sonore** (Partie 5) | Web Audio API procédurale : 3 paliers (introspectif / narratif / conclusif), fondus 1,5 s, progressions imposées (Lam-Rem-Mim-Lam / DoM-FaM-SolM-DoM), volume 30 % par défaut. TTS natif (Web Speech API). |
| **Journal & export** (Partie 6) | Journal complet, export .txt / .json / .md, effacement RGPD immédiat, purge automatique 90 jours. |
| **Sécurité / RGPD** (7.3, 7.6) | HTTPS (preview), rate limiting, validation des entrées, sessions anonymes, aucune clé côté client, aucune donnée de détresse vers des tiers. |
| **PWA** (7.5) | `manifest.webmanifest` + Service Worker : installable sur mobile, **corpus consultable hors-ligne**. |
| **Quarantaine** (3.5) | Table + API `/api/admin/validate` prêtes (interface admin en lot 4). |

## 2. Le corpus

- **50 paraboles adultes** (10 par aire : Afrique de l'Ouest, Asie, Méditerranée, Nordique/Celtique, Universaliste) — réelles, attribuées honnêtement (« attribué à », « tradition orale » quand c'est le cas), 3+ interprétations chacune, familles F1-F10.
- **15 contes enfants** (La Fontaine, Ésope, Grimm, Panchatantra, tradition ashanti — domaine public).
- **35 URLs de sources vérifiées une à une** (Wikiquote, Wikisource, Wikipédia). Règle absolue respectée : **aucune parabole inventée par IA**.
- Mots-clés de pré-indexation éditoriaux par entrée (`corpus-*-*.json`).

Extension vers 300 : ajouter les entrées dans `src/data/corpus-adulte.json` (avec mots-clés), puis `bun run scripts/seed.ts`. L'index se reconstruit seul (TTL 5 min).

## 3. Architecture

```
Next.js 16 (App Router, single route)
├── src/app/page.tsx                → application complète (accueil, modes, journal, corpus…)
├── src/app/api/
│   ├── ask/        POST → SSE (Phase 0 → sources → synthèse → matching → histoire)
│   ├── mentor/     POST → SSE (dialogue 3 étapes)
│   ├── deep/       POST → SSE (parcours 3 niveaux)
│   ├── perspective/ POST (mise en perspective d'un échange)
│   ├── export/     POST (.txt / .json / .md)
│   ├── journal/    GET  (journal de la session)
│   ├── session/    DELETE (droit à l'effacement RGPD)
│   ├── corpus/     GET  (public, mis en cache SW pour l'hors-ligne)
│   ├── health/     GET  (état des sources)
│   └── admin/validate/ POST (token ADMIN_TOKEN)
├── src/lib/spu/
│   ├── constants.ts    messages & prompts imposés du cahier
│   ├── distress.ts     Phase 0 (3 couches)
│   ├── sources.ts      orchestrateur + cache + rate limit + synthèse
│   ├── vector-index.ts TF-IDF + cosinus (migrable pgvector)
│   ├── matching.ts     top-5 + arbitrage LLM + tonalité
│   ├── story.ts        génération + filtre post-génération + template sûr
│   ├── flux.ts         pipeline SSE partagé
│   ├── llm.ts          wrapper SDK (timeout, retry 429)
│   ├── audio-engine.ts moteur audio procédural (3 paliers)
│   └── tts.ts          Web Speech API
├── src/data/corpus-*.json   le corpus (cloud dédié = base du projet, exportable)
├── prisma/schema.prisma     Partie 14 du cahier (SQLite → pgvector sans changer l'API)
└── public/sw.js             Service Worker (hors-ligne corpus)
```

### Migrabilité PostgreSQL + pgvector
Le schéma Prisma suit la Partie 14. Passage à PostgreSQL : changer `datasource db`, remplacer le champ `vec`/index en mémoire par `embedding VECTOR(1024)` + requête `<=>` — les routes et l'API restent identiques.

## 4. Tests (critères du cahier 17.1)

```bash
bun run scripts/test-phase0.ts          # 30 cas : 30/30 ✓ (100 % des évidentes, critère clé)
bun run scripts/test-phase0.ts --live   # + couche B LLM en direct : 3/3 ✓
bun run scripts/test-matching.ts        # top-1 : 90 % ✓ (≥80) — top-3 : 100 % ✓ (≥95)
node scripts/test-e2e.mjs "question" [mode]   # parcours Oracle/Enfant complet via SSE
node scripts/test-modes.mjs             # Mentor 3 étapes + Deep 3 niveaux + Enfant + perspective
bash scripts/verify-urls.sh             # vérification des URLs de sources
```

Résultats vérifiés en conditions réelles : détresse → 0,1 s sans appel externe ; Oracle complet → ~9 s (streaming dès 0,8 s) ; Mentor 3 étapes ✓ ; Deep 3 niveaux ✓ ; enfant ✓ ; export .md ✓ ; journal ✓ ; PWA 200 ✓ ; 0 erreur console.

## 5. Utilisation

Ouvrir la preview → choisir un mode → poser sa question.
- **Journal** : tous les échanges, exports, effacement total.
- **Corpus** : consultation + recherche + filtres par famille (fonctionne hors-ligne après première visite).
- **Audio** : interrupteur dans l'en-tête (3 paliers automatiques, volume réglable).

## 6. Variables d'environnement

```
DATABASE_URL=file:/home/z/my-project/db/custom.db   # → PostgreSQL en production
ADMIN_TOKEN=<jeton>                                  # API admin (optionnel)
```

Aucune clé API n'est nécessaire en v1 (sources sans clés). Le SDK z-ai est configuré par l'environnement.

## 7. Limites connues & suite (feuille de route)

- L'accès direct à l'API Wikimedia est limité depuis l'environnement de prévisualisation (429) : la source Encyclopédie passe par le lecteur du SDK, équivalent fonctionnel.
- En cas de quota temporaire de la plateforme IA, le système **dégrade honnêtement** (synthèse brute sourcée, template narratif sûr) au lieu d'inventer.
- Lot 4 (après validation) : corpus 300 paraboles, interface d'administration de la quarantaine, enrichissements PWA, multilingue (v4.1 du cahier).

## 8. Éthique — rappel non négociable

Ne jamais : inventer de parabole, cacher qu'une réponse est une synthèse, faire transiter la détresse vers des tiers, stocker des données personnelles sans consentement, mettre des clés API côté frontend. Voir page **Transparence** et **Confidentialité** intégrées à l'application.

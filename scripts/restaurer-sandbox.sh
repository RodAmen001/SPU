#!/bin/bash
# ═════════════════════════════════════════════════════════════════════════════
# v6.4 — RESTAURATION DU BAC À SABLE SPU DEPUIS LE LIEU SÛR (GitHub, hors ZAI)
# Le bac à sable ZCode peut être recyclé ENTRE LES MESSAGES (déjà arrivé : la
# v6.2 a disparu du disque local). La source de vérité est le dépôt GitHub
# RodAmen001/SPU — ce script rétablit un environnement de travail complet :
#   1. dernier état du dépôt (branche main, ou le tag sandbox-… demandé)
#   2. dépendances + client Prisma + base (schéma + corpus)
#   3. Piper + les 4 voix françaises (lecture du BOOST / narration — optionnel)
# Usage :
#   bash scripts/restaurer-sandbox.sh                 # main, dans ./SPU
#   TOKEN_GITHUB=ghp_… bash scripts/restaurer-sandbox.sh sandbox-v6.4 ~/SPU
# Le jeton vient de l'environnement (TOKEN_GITHUB ou GITHUB_TOKEN) — JAMAIS
# stocké dans le dépôt.
# ═════════════════════════════════════════════════════════════════════════════
set -e
REF="${1:-main}"
CIBLE="${2:-$HOME/my-project-restaure}"
TOKEN="${TOKEN_GITHUB:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo "⚠️  TOKEN_GITHUB absent : le clonage privé nécessite le jeton du concepteur."
  echo "   export TOKEN_GITHUB=ghp_…  puis relance."
  exit 1
fi

echo "[restauration] 1/4 — clonage du dépôt (réf : $REF)…"
rm -rf "$CIBLE"
git clone --branch "$REF" "https://RodAmen001:$TOKEN@github.com/RodAmen001/SPU.git" "$CIBLE"
cd "$CIBLE"

echo "[restauration] 2/4 — dépendances + Prisma…"
bun install
bunx prisma generate
DATABASE_URL="${DATABASE_URL:-file:$(pwd)/db/custom.db}" bunx prisma db push --skip-generate || true

echo "[restauration] 3/4 — base de données…"
mkdir -p db
if [ -d db-origine ] && [ -f db-origine/custom.db ]; then
  cp -n db-origine/custom.db db/custom.db || true
  echo "[restauration]    base restaurée depuis db-origine (corpus complet)."
fi
DATABASE_URL="file:$(pwd)/db/custom.db" node scripts/verifier-bd.js 2>/dev/null || \
  echo "[restauration]    (vérification de base sautée — le serveur la refait au démarrage)"

echo "[restauration] 4/4 — Piper + voix (lecture audio)…"
HF_TOKEN="${HF_TOKEN:-}" bash scripts/installer-piper-local.sh || echo "   (Piper local manqué — les voix restent disponibles en production Docker)"

echo
echo "✅ BAC À SABLE RESTAURÉ : $CIBLE"
echo "   Serveur de dev : cd $CIBLE && DATABASE_URL=file:$(pwd)/db/custom.db bun run dev"
echo "   Secrets à redonner à l'environnement (jamais dans le dépôt) :"
echo "     GROQ_API_KEY (IA + ASR) · TOKEN_GITHUB · HF_TOKEN · RENDER_TOKEN · z.ai (config SDK)"
echo "   Test BOOST MP3 : DÉMARRE le serveur puis POST /api/boost/audio {scenario}."

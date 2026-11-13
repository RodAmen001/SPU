#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Restaure et lance le SPU complet depuis ce dépôt GitHub — UNE COMMANDE.
# Usage : bash scripts/restaurer.sh
# Prérequis : Bun (curl -fsSL https://bun.sh/install | bash)
#
# Elle réinstalle les dépendances, installe la base du corpus (65 paraboles)
# depuis db-origine/custom.db (ou la reconstruit depuis src/data/*.json si
# absente), compile la production et démarre le serveur en démon.
# ─────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")/.."

# Chemin de base ABSOLU (évite toute ambiguïté Prisma selon le dossier courant)
export DATABASE_URL="file:$(pwd)/db/custom.db"

command -v bun >/dev/null 2>&1 || {
  echo "Bun est absent. Installe-le d'abord :"
  echo "  curl -fsSL https://bun.sh/install | bash"
  exit 1
}

echo "── 1/6 · Dépendances ──────────────────────────────"
bun install

echo "── 2/6 · Client Prisma ────────────────────────────"
bunx prisma generate

echo "── 3/6 · Base de données (corpus 65 paraboles) ────"
mkdir -p db
if [ -f db-origine/custom.db ]; then
  cp db-origine/custom.db db/custom.db
  echo "base copiée depuis db-origine/custom.db (prête à l'emploi)"
else
  bunx prisma db push --skip-generate
  bun run scripts/seed.ts
  echo "base neuve créée puis corpus inséré depuis src/data/"
fi

echo "── 4/6 · Build de production ──────────────────────"
bun run build

echo "── 5/6 · Démarrage en démon (survit au shell) ─────"
# arrête une éventuelle instance précédente
pkill -f "standalone/server.js" 2>/dev/null || true
sleep 1
python3 scripts/demonise.py serveur || {
  echo "démon indisponible — démarrage direct en arrière-plan"
  NODE_ENV=production bun .next/standalone/server.js >> server.log 2>&1 &
}

echo "── 6/6 · Vérification ─────────────────────────────"
sleep 6
if curl -s -m 10 http://localhost:3000/api/health; then
  echo ""
  echo "✅ SPU prêt sur http://localhost:3000 (journal : server.log)"
else
  echo ""
  echo "⚠️ le serveur met du temps à répondre — regarde server.log"
fi

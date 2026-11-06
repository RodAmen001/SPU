#!/bin/bash
# SPU v4.1 — démarrage Mac / Linux
cd "$(dirname "$0")"

echo "═══════════════════════════════════════════════════"
echo "  SPU v4.1 — démarrage…"
echo "═══════════════════════════════════════════════════"

if command -v bun >/dev/null 2>&1; then
  echo "[1/3] Installation des dépendances (bun)…"
  bun install || exit 1
  echo "[2/3] Génération du client Prisma…"
  bunx prisma generate
  echo "[3/3] Démarrage du serveur : http://localhost:3000"
  echo ">>> Ouvre ton navigateur à l'adresse : http://localhost:3000"
  echo ">>> Pour arrêter : Ctrl+C"
  exec bun run dev
else
  echo "[1/3] Installation des dépendances (npm)…"
  npm install || exit 1
  echo "[2/3] Génération du client Prisma…"
  npx prisma generate
  echo "[3/3] Démarrage du serveur : http://localhost:3000"
  echo ">>> Ouvre ton navigateur à l'adresse : http://localhost:3000"
  echo ">>> Pour arrêter : Ctrl+C"
  exec npm run dev
fi

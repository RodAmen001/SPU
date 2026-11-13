#!/usr/bin/env bash
# Installe, prépare et lance SPU en production depuis n'importe quel dossier.
# Usage : bash scripts/restaurer.sh
set -Eeuo pipefail

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT_SPU="${PORT_SPU:-3000}"
export PORT="$PORT_SPU"
export DATABASE_URL="${DATABASE_URL:-file:${ROOT}/db/custom.db}"
HEALTH_URL="http://127.0.0.1:${PORT_SPU}/api/health"

fail() {
  echo "❌ $*" >&2
  exit 1
}

for cmd in bun python3 curl; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Prérequis manquant : $cmd. Installez-le puis relancez ce script."
done

[[ "$PORT_SPU" =~ ^[0-9]+$ ]] && (( PORT_SPU >= 1 && PORT_SPU <= 65535 )) \
  || fail "PORT_SPU doit être un port numérique entre 1 et 65535 (valeur reçue : '$PORT_SPU')."

[[ -f "$ROOT/package.json" ]] || fail "package.json introuvable dans $ROOT : le dépôt semble incomplet."
[[ -f "$ROOT/prisma/schema.prisma" ]] || fail "Schéma Prisma introuvable : prisma/schema.prisma."

# Ne jamais arrêter une application inconnue ni remplacer une base existante.
if curl -fsS --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
  fail "Un serveur répond déjà sur le port $PORT_SPU ($HEALTH_URL). Arrêtez-le explicitement avant de relancer la restauration."
fi
if ! python3 - "$PORT_SPU" <<'PY'
import socket, sys
port = int(sys.argv[1])
with socket.socket() as sock:
    sock.bind(("127.0.0.1", port))
PY
then
  fail "Le port $PORT_SPU est déjà utilisé. Libérez-le ou relancez avec PORT_SPU=<port libre>."
fi

printf '── 1/6 · Dépendances ──────────────────────────────\n'
bun install

printf '── 2/6 · Client Prisma ────────────────────────────\n'
bunx prisma generate

printf '── 3/6 · Base de données ──────────────────────────\n'
mkdir -p "$ROOT/db"
if [[ -f "$ROOT/db/custom.db" ]]; then
  echo "Base existante conservée : db/custom.db (aucune donnée remplacée)."
elif [[ -f "$ROOT/db-origine/custom.db" ]]; then
  cp "$ROOT/db-origine/custom.db" "$ROOT/db/custom.db"
  echo "Base initialisée depuis db-origine/custom.db."
else
  echo "Instantané absent : création du schéma puis import du corpus."
  bunx prisma db push --skip-generate
  bun run scripts/seed.ts
fi
[[ -f "$ROOT/db/custom.db" ]] || fail "La base attendue n'a pas été créée : $ROOT/db/custom.db"

printf '── 4/6 · Build de production ──────────────────────\n'
bun run build
[[ -f "$ROOT/.next/standalone/server.js" ]] \
  || fail "Le build n'a pas produit .next/standalone/server.js. Consultez les erreurs ci-dessus."

printf '── 5/6 · Démarrage en démon ───────────────────────\n'
# DATABASE_URL et PORT sont transmis au démon par l'environnement.
python3 "$ROOT/scripts/demonise.py" serveur \
  || fail "Impossible de lancer le démon. Vérifiez Python, Bun et les permissions du dossier."

printf '── 6/6 · Vérification de santé ────────────────────\n'
health=""
for _ in {1..30}; do
  if health="$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null)"; then
    printf '%s\n' "$health"
    printf '\n✅ SPU répond sur http://localhost:%s (journal : %s/server.log)\n' "$PORT_SPU" "$ROOT"
    exit 0
  fi
  sleep 2
done

echo "❌ Le serveur n'a pas répondu après 60 secondes à $HEALTH_URL." >&2
if [[ -f "$ROOT/server.log" ]]; then
  echo "Dernières lignes de server.log :" >&2
  tail -n 40 "$ROOT/server.log" >&2
fi
exit 1

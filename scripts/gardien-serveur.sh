#!/bin/bash
# Gardien : relance le serveur SPU (standalone production) s'il s'arrête.
set -e

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
PORT_SPU="${PORT_SPU:-3000}"
DATABASE_URL="${DATABASE_URL:-file:${ROOT}/db/custom.db}"

while true; do
  if ! curl -s -o /dev/null --max-time 3 "http://localhost:${PORT_SPU}/api/health"; then
    cd "$ROOT"
    pkill -f "standalone/server.js" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    sleep 1
    setsid env NODE_ENV=production DATABASE_URL="$DATABASE_URL" PORT="$PORT_SPU" \
      bun "$ROOT/.next/standalone/server.js" < /dev/null >> "$ROOT/server.log" 2>&1 &
    echo "[gardien] serveur relancé à $(date +%H:%M:%S)" >> "$ROOT/gardien.log"
    sleep 8
  fi
  sleep 5
done

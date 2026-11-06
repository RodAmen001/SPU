#!/bin/bash
# Régression : serveur + phase0 (30 cas) + matching
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 1
setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health --max-time 2 2>/dev/null || true)
  [ "$code" = "200" ] && { echo "serveur prêt (${i}s)"; break; }
  sleep 1
done
[ "$code" = "200" ] || { echo "serveur KO"; exit 1; }

echo "═══ PHASE 0 — 30 cas ═══"
bun scripts/test-phase0.ts 2>&1 | tail -12

echo ""
echo "═══ MATCHING ═══"
bun scripts/test-matching.ts 2>&1 | tail -12
echo "RÉGRESSION TERMINÉE ✓"

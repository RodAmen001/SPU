#!/usr/bin/env bash
# Test v6.2 — conversation Mentor complète (étapes 1→2→3) + polling du BOOST.
# Usage : bash scripts/test-mentor-boost.sh [port]
set -uo pipefail
PORT=${1:-3000}
BASE="http://localhost:$PORT"
MAXTIME=170

etiqueter() { grep "event:" "$1" | awk '{print $2}' | sort | uniq -c | tr '\n' ' '; }
extraire() { grep -A1 "^event: $2" "$1" | grep "^data:" | tail -1 | sed 's/^data: //'; }

echo "═══ ÉTAPE 1 : question initiale ═══"
curl -sN -X POST "$BASE/api/mentor" -H "Content-Type: application/json" \
  -d '{"question":"J hesite a quitter mon poste pour me lancer a mon compte","etape":1}' \
  --max-time $MAXTIME > /tmp/m1.txt
echo "événements: $(etiqueter /tmp/m1.txt)"
SID=$(extraire /tmp/m1.txt final | python3 -c "import json,sys; print(json.load(sys.stdin).get('sessionId',''))" 2>/dev/null)
echo "sessionId: $SID"

echo "═══ ÉTAPE 2 : partage ═══"
curl -sN -X POST "$BASE/api/mentor" -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SID\",\"reponse\":\"Ce qui me retient : la peur de perdre mon salaire regulier et de decevoir ma famille. Mais je ressens que je m ennuis et que je ne progresse plus.\",\"etape\":2}" \
  --max-time $MAXTIME > /tmp/m2.txt
echo "événements: $(etiqueter /tmp/m2.txt)"

echo "═══ ÉTAPE 3 : synthèse (le BOOST part en préparation) ═══"
curl -sN -X POST "$BASE/api/mentor" -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SID\",\"reponse\":\"Je crois que ce qui me bloque c est surtout la confiance. Un ami qui a saute le pas me dit que le plus dur c est les six premiers mois, apres on respire. Je veux oser.\",\"etape\":3}" \
  --max-time $MAXTIME > /tmp/m3.txt
echo "événements: $(etiqueter /tmp/m3.txt)"
EID=$(extraire /tmp/m3.txt final | python3 -c "
import json,sys
d = json.load(sys.stdin)
print(d.get('echangeId',''), '| boostEnPreparation:', d.get('boostEnPreparation'))
" 2>/dev/null)
echo "final: $EID"
EID=$(echo "$EID" | cut -d' ' -f1)

echo "═══ POLLING /api/boost (jusqu'à 150 s) ═══"
for i in $(seq 1 30); do
  sleep 5
  R=$(curl -s --max-time 20 "$BASE/api/boost?echangeId=$EID")
  PRET=$(echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('pret'), '|', ('scenario: ' + d['scenario'].get('titre','?') if d.get('pret') else ('echec' if d.get('echec') else 'en cours')))" 2>/dev/null)
  echo "  [$(($(i*5)) s)] $PRET"
  if echo "$PRET" | grep -qE "True|echec"; then break; fi
done
echo "═══ Dernière réponse brute ═══"
echo "$R" | head -c 600

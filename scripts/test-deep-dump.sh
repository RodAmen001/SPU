#!/bin/bash
# Dump complet des événements SSE du mode Deep niveau 1
set -e
B=http://localhost:3000
curl -s --max-time 110 -N -X POST $B/api/deep -H 'Content-Type: application/json' \
  -d '{"question":"comment faire la paix avec mes souvenirs ?","niveau":1}' \
  | python3 -c "
import json, sys
compte = {}
for ligne in sys.stdin:
    ligne = ligne.strip()
    if ligne.startswith('event: '):
        ev = ligne[7:].strip()
        compte[ev] = compte.get(ev, 0) + 1
print('ÉVÉNEMENTS REÇUS:', json.dumps(compte, ensure_ascii=False))
" 
tail -30 /home/z/my-project/dev.log | rg -A 3 "api/deep|erreur|error" | head -20

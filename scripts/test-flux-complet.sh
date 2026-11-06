#!/bin/bash
# Vérifie les MP3 servis, les endpoints, et lance les 3 modes en e2e rapide.
set -e
B=http://localhost:3000

echo "══ MP3 servis par Next ══"
for f in fond-oracle fond-mentor fond-deep fond-enfant jingle-reponse; do
  code=$(curl -s -o /dev/null -w "%{http_code} %{size_download}" --max-time 10 $B/audio/$f.mp3 -r 0-2000)
  echo "$f.mp3 → $code"
done

echo ""
echo "══ e2e Mentor (étape 1) ══"
curl -s --max-time 110 -N -X POST $B/api/mentor -H 'Content-Type: application/json' \
  -d '{"question":"je doute de mes choix professionnels","etape":1}' \
  | python3 -c "
import json, sys
for ligne in sys.stdin:
    ligne = ligne.strip()
    if ligne.startswith('data: '):
        try: d = json.loads(ligne[6:])
        except Exception: continue
        if 'step' in d: print('STATUS:', d['step'])
        elif d.get('code'): print('PARABOLE:', d['code'], '| score', d.get('score'))
        elif 'questions' in d: print('ANGLES:', len(d['questions']), 'questions')
        elif d.get('etape'): print('FINAL: étape', d['etape'], '| sessionId ok')
"

echo ""
echo "══ e2e Deep (niveau 1) ══"
curl -s --max-time 110 -N -X POST $B/api/deep -H 'Content-Type: application/json' \
  -d '{"question":"comment faire la paix avec mes souvenirs ?","niveau":1}' \
  | python3 -c "
import json, sys
for ligne in sys.stdin:
    ligne = ligne.strip()
    if ligne.startswith('data: '):
        try: d = json.loads(ligne[6:])
        except Exception: continue
        if 'step' in d: print('STATUS:', d['step'])
        elif d.get('code'): print('PARABOLE:', d['code'], '| score', d.get('score'))
        elif d.get('niveau'): print('FINAL: niveau', d['niveau'], '| suite:', d.get('suiteDisponible'))
"

echo ""
echo "══ Phase 0 détresse (doit bloquer) ══"
curl -s --max-time 30 -N -X POST $B/api/ask -H 'Content-Type: application/json' \
  -d '{"question":"je veux en finir avec la vie","mode":"oracle"}' \
  | python3 -c "
import json, sys
vue = []
for ligne in sys.stdin:
    ligne = ligne.strip()
    if ligne.startswith('data: '):
        try: d = json.loads(ligne[6:])
        except Exception: continue
        if d.get('message') and not d.get('step'): vue.append(('DETRESSE', d['message'][:60]))
        if d.get('echangeId'): vue.append(('FINAL', 'bloqué sans parabole ✓'))
for t, m in vue: print(t, ':', m)
"

echo ""
echo "══ Santé + corpus ══"
curl -s --max-time 10 $B/api/health | head -c 200; echo ""

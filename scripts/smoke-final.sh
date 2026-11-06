#!/bin/bash
# Test de fumée final de l'app principale
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

echo "── flux Oracle complet ──"
curl -s --max-time 110 -N -X POST http://localhost:3000/api/ask -H 'Content-Type: application/json' \
  -d '{"question":"comment rester serein quand tout sente accéléré ?","mode":"oracle"}' \
  | python3 -c "
import json, sys
ev = {}
histoire = ''
parabole = None
for ligne in sys.stdin:
    ligne = ligne.strip()
    if ligne.startswith('event: '):
        cur = ligne[7:].strip()
        ev[cur] = ev.get(cur, 0) + 1
    if ligne.startswith('data: '):
        try: d = json.loads(ligne[6:])
        except Exception: continue
        if 'chunk' in d: histoire += d['chunk']
        if d.get('code'): parabole = d
print('ÉVÉNEMENTS:', json.dumps(ev, ensure_ascii=False))
if parabole: print('PARABOLE:', parabole['code'], '| score', parabole.get('score'), '| sous-seuil', parabole.get('sousSeuil'))
print('HISTOIRE (%d mots):' % len(histoire.split()), histoire[:130].replace(chr(10), ' '), '…')
"

echo ""
echo "── page d'accueil + MP3 + SW ──"
curl -s -o /dev/null -w "accueil: %{http_code}\n" http://localhost:3000/ --max-time 20
curl -s -o /dev/null -w "sw.js: %{http_code}\n" http://localhost:3000/sw.js --max-time 10
curl -s -o /dev/null -w "fond-mentor.mp3: %{http_code}\n" http://localhost:3000/audio/fond-mentor.mp3 --max-time 10 -r 0-1000
echo "SMOKE TEST TERMINÉ ✓"

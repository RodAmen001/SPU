#!/bin/bash
# Test complet : question en étant connecté → session rattachée au compte →
# profil mis à jour → lecture protégée de la session du compte.
set -e
B=http://localhost:3000

echo "══ 0. Connexion (token frais pour ce serveur) ══"
TOKEN=$(curl -s --max-time 20 -X POST $B/api/compte/connexion -H 'Content-Type: application/json' \
  -d '{"pseudo":"testeur_spu","motDePasse":"secret123"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin).get('token',''))")
[ -n "$TOKEN" ] && echo "✓ token: ${TOKEN:0:12}..." || { echo "✗ ÉCHEC connexion"; exit 1; }

echo "══ 1. Question Oracle connecté (session rattachée automatiquement) ══"
SID=$(curl -s --max-time 90 -N -X POST $B/api/ask \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"comment rester patient quand tout va trop lentement ?","mode":"oracle"}' \
  | python3 -c "
import json, sys
sid = ''
for ligne in sys.stdin:
    ligne = ligne.strip()
    if ligne.startswith('data: '):
        try:
            d = json.loads(ligne[6:])
        except Exception:
            continue
        if d.get('sessionId'):
            sid = d['sessionId']
print(sid)
")
echo "sessionId: $SID"
echo "$SID" > /tmp/spu-sid.txt
[ -n "$SID" ] && echo "✓ session créée" || { echo "✗ ÉCHEC"; exit 1; }

echo "══ 2. Profil du compte (1 session attendue) ══"
curl -s --max-time 20 $B/api/compte/moi -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo "══ 3. Lecture de la session via /api/compte/sessions ══"
curl -s --max-time 20 "$B/api/compte/sessions?sessionId=$SID" -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import json,sys
d = json.load(sys.stdin)
print('mode:', d.get('mode'), '| échanges:', len(d.get('echanges', [])))
if d.get('echanges'):
    e = d['echanges'][0]
    print('question:', (e.get('question') or '')[:60])
    print('histoire:', (e.get('histoire') or '')[:80].replace(chr(10), ' '), '...')
"

echo "══ 4. Accès SANS token (401 attendu) ══"
curl -s -w " [%{http_code}]\n" --max-time 20 "$B/api/compte/sessions?sessionId=$SID"

echo "══ 5. Journal anonyme classique toujours OK ══"
curl -s --max-time 20 "$B/api/journal?sessionId=$SID" | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ échanges dans le journal:', len(d.get('echanges', [])))"

echo "══ 6. Export .md toujours OK ══"
curl -s --max-time 30 -X POST $B/api/export -H 'Content-Type: application/json' \
  -d "{\"sessionId\":\"$SID\",\"format\":\"md\"}" -o /tmp/export-test.md -w "http %{http_code}, %{size_download} octets\n"
head -4 /tmp/export-test.md

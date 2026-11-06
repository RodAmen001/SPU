#!/bin/bash
# Tests du compte SPU : inscription, profil, connexion, mauvais mot de passe,
# rattachement de session, export vers compte, lecture protégée.
set -e
B=http://localhost:3000

echo "══ 1. Inscription ══"
REP=$(curl -s --max-time 30 -X POST $B/api/compte/inscrire -H 'Content-Type: application/json' \
  -d '{"pseudo":"testeur_spu","motDePasse":"secret123"}')
echo "${REP:0:120}"
TOKEN=$(echo "$REP" | python3 -c "import json,sys; print(json.load(sys.stdin).get('token',''))")
[ -n "$TOKEN" ] && echo "✓ token reçu" || { echo "✗ ÉCHEC inscription"; exit 1; }

echo "══ 2. Profil (sessions vides attendues) ══"
curl -s --max-time 20 $B/api/compte/moi -H "Authorization: Bearer $TOKEN"
echo ""

echo "══ 3. Connexion avec le bon mot de passe ══"
curl -s --max-time 20 -X POST $B/api/compte/connexion -H 'Content-Type: application/json' \
  -d '{"pseudo":"testeur_spu","motDePasse":"secret123"}' | python3 -c "import json,sys; d=json.load(sys.stdin); print('✓ connexion OK, token:', d['token'][:12]+'...')"

echo "══ 4. Mauvais mot de passe (401 attendu) ══"
curl -s -w " [%{http_code}]\n" --max-time 20 -X POST $B/api/compte/connexion -H 'Content-Type: application/json' \
  -d '{"pseudo":"testeur_spu","motDePasse":"faux"}'

echo "══ 5. Pseudo invalide (400 attendu) ══"
curl -s -w " [%{http_code}]\n" --max-time 20 -X POST $B/api/compte/inscrire -H 'Content-Type: application/json' \
  -d '{"pseudo":"a","motDePasse":"secret123"}'

echo "══ 6. Sans token (401 attendu sur /moi) ══"
curl -s -w " [%{http_code}]\n" --max-time 20 $B/api/compte/moi

echo "══ TOKEN ══"
echo "$TOKEN" > /tmp/spu-token.txt
echo "token sauvegardé dans /tmp/spu-token.txt"

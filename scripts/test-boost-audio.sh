#!/bin/bash
# v6.4 — Test END-TO-END de la conversion BOOST → MP3 (comme en production)
set -e
cd /home/z/my-project

PORT="${PORT:-3111}"
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
export GROQ_API_KEY="${GROQ_API_KEY:-}" # jamais de clé dans le dépôt (protection de secrets GitHub)
export NODE_ENV=production
# le serveur standalone chdir dans .next/standalone → chemins Piper absolus
export SPU_PIPER_BIN="/home/z/my-project/voix-piper/piper/piper"
export SPU_PIPER_VOIX="/home/z/my-project/voix-piper/modeles"

# petit scénario de test : 2 scènes, 3 personnages, didascalies (comme TEST26/28)
cat > /tmp/boost-test.json <<'JSON'
{"titre":"Test de Scène Réelle","resume":"Vérification de l'assemblage MP3.","heros":"Léo",
"declaration":"JE MARCHE, ET JE NE ME RENDS PAS COMME UN CHIEN POUR LES AUTRES.",
"personnages":[{"nom":"Le Conteur","role":"narrateur de la scène","voix":"conteur"},
{"nom":"Léo","role":"apprenti cordonnier au quartier Ebene","voix":"homme-jeune"},
{"nom":"Maitre Jeremie","role":"maître cordonnier","voix":"sage"}],
"scenes":[
{"phase":"1.1","titre":"L'équilibre de Léo","image":"🌅","musique":"douce","lignes":[
{"perso":"Léo","voix":"homme-jeune","didascalie":"Léo marche dans la ville, les yeux plissés par le soleil de midi.","texte":"Je ne suis qu'un apprenti — pourquoi persévérer ?"},
{"perso":"Maitre Jeremie","voix":"sage","didascalie":"Le maître pose son alène et regarde Léo, calmement.","texte":"Parce que ta main apprend plus vite que ta peur."}]},
{"phase":"2","titre":"La déclaration","image":"🔥","musique":"declaration","lignes":[
{"perso":"Léo","voix":"homme-jeune","didascalie":"Léo se dresse, la voix qui ne tremble plus.","texte":"JE NE ME RENDS PAS COMME UN CHIEN POUR LES AUTRES. JE TRAVAILLE, ET JE PROGRESSE."}]}],
"dureeEstimeeSec":20}
JSON

# serveur standalone (cwd = racine du projet → voix-piper trouvé)
if ! curl -s --max-time 3 "http://localhost:$PORT/api/version" > /dev/null 2>&1; then
  (PORT=$PORT nohup bun .next/standalone/server.js > /tmp/spu-64.log 2>&1 &)
  for i in $(seq 1 30); do
    curl -s --max-time 3 "http://localhost:$PORT/api/version" > /dev/null 2>&1 && break
    sleep 1
  done
fi
echo "serveur : $(curl -s http://localhost:$PORT/api/version | python3 -c 'import json,sys; print(json.load(sys.stdin)["serveur"]["version"])')"

# 1) POST — conversion
REP=$(curl -s -X POST "http://localhost:$PORT/api/boost/audio" -H "Content-Type: application/json" -d "{\"scenario\": $(cat /tmp/boost-test.json)}")
ID=$(echo "$REP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')
echo "job : $ID"

# 2) polling jusqu'à pret (max ~6 min)
for i in $(seq 1 72); do
  sleep 5
  ETAT=$(curl -s "http://localhost:$PORT/api/boost/audio?id=$ID")
  S=$(echo "$ETAT" | python3 -c 'import json,sys; print(json.load(sys.stdin)["etat"])')
  PH=$(echo "$ETAT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("phase",""))' 2>/dev/null)
  echo "  [$i] $S — $PH"
  [ "$S" = "pret" ] || [ "$S" = "echec" ] && break
done
echo "$ETAT" | python3 -c '
import json,sys
j = json.load(sys.stdin)
print("état final :", j["etat"], "| erreur :", j.get("erreur"))
print("phase :", j.get("phase"))
if j.get("manifest"):
    print("segments :", len(j["manifest"]))
    for m in j["manifest"][:8]:
        print("  %6.2fs +%5.2fs %-10s %-15s [%s] %s" % (m["debut"], m["duree"], m["type"], m["perso"], m["voix"], m["texte"][:60]))
    vo = sorted(set(m["voix"] for m in j["manifest"]))
    print("voix distinctes utilisées :", vo)
if j.get("revue"): print("REVUE IA :", j["revue"])
'
[ "$S" = "pret" ] || { echo "❌ échec de la conversion"; tail -20 /tmp/spu-64.log; exit 1; }

# 3) MP3
curl -s "http://localhost:$PORT/api/boost/audio?id=$ID&format=mp3" -o /tmp/boost-test.mp3
echo "MP3 : $(stat -c%s /tmp/boost-test.mp3) octets — $(ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/boost-test.mp3)s"
echo "✅ test END-TO-END réussi"

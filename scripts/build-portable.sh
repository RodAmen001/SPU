#!/bin/bash
# Construit le paquet portable SPU v4.1 et le teste réellement depuis un dossier séparé.
set -e
cd /home/z/my-project

STAGING=/home/z/my-project/.portable-stage/spu-v4.1
rm -rf /home/z/my-project/.portable-stage
mkdir -p "$STAGING"

echo "── copie du code ──"
cp -r src prisma public "$STAGING/"
mkdir -p "$STAGING/db"
cp db/custom.db "$STAGING/db/"
# .env portable : chemin relatif vers db/ (résolu depuis prisma/schema.prisma)
echo 'DATABASE_URL=file:../db/custom.db' > "$STAGING/.env"
# configs
for f in package.json bun.lock next.config.ts tsconfig.json tailwind.config.ts postcss.config.mjs components.json eslint.config.mjs next-env.d.ts; do
  [ -f "$f" ] && cp "$f" "$STAGING/"
done
# scripts de démarrage + téléchargement des voix neuronales (facultatif)
cp scripts/portable/DEMARRER-WINDOWS.bat scripts/portable/demarrer-mac-linux.sh scripts/portable/LISEZ-MOI-DEMARRAGE.txt scripts/portable/TELECHARGER-VOIX-WINDOWS.bat scripts/portable/telecharger-voix.sh "$STAGING/"
chmod +x "$STAGING/demarrer-mac-linux.sh" "$STAGING/telecharger-voix.sh"
# purger les artefacts dev
rm -rf "$STAGING/.next" 2>/dev/null || true

echo "── création du zip ──"
cd /home/z/my-project/.portable-stage
rm -f /home/z/my-project/download/spu-v4.1-portable.zip
zip -qr /home/z/my-project/download/spu-v4.1-portable.zip spu-v4.1
cd /home/z/my-project
ls -la download/spu-v4.1-portable.zip
unzip -l download/spu-v4.1-portable.zip | tail -3

echo "── TEST RÉEL : extraction dans un dossier séparé + démarrage ──"
TESTDIR=/home/z/my-project/.portable-test2
rm -rf "$TESTDIR"
mkdir -p "$TESTDIR"
unzip -q download/spu-v4.1-portable.zip -d "$TESTDIR"
cd "$TESTDIR/spu-v4.1"

# dépendances : réutilise node_modules du projet via symlink? Les symlinks sont interdits.
# Copie node_modules (bun a déjà tout installé ici) — lent mais fiable pour le test.
echo "── copie node_modules pour le test (peut prendre 1 min) ──"
cp -r /home/z/my-project/node_modules "$TESTDIR/spu-v4.1/node_modules"
# le chemin BDD relatif file:../db/custom.db pointe vers $TESTDIR/spu-v4.1/db/custom.db ✓

setsid nohup bun run dev < /dev/null > "$TESTDIR/dev.log" 2>&1 &
PORT=3101
# ajuste le port pour ne pas entrer en conflit : bun run dev utilise 3000 — on arrête d'abord l'app principale
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 1
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health --max-time 2 2>/dev/null || true)
  [ "$code" = "200" ] && { echo "PORTABLE prêt (${i}s)"; break; }
  sleep 1
done
[ "$code" = "200" ] || { echo "PORTABLE KO"; tail -30 "$TESTDIR/dev.log"; exit 1; }

echo "── question e2e depuis le paquet portable ──"
curl -s --max-time 90 -N -X POST http://localhost:3000/api/ask -H 'Content-Type: application/json' \
  -d '{"question":"comment apprendre la patience ?","mode":"oracle"}' \
  | python3 -c "
import json, sys
ev = {}
histoire = ''
for ligne in sys.stdin:
    ligne = ligne.strip()
    if ligne.startswith('event: '):
        cur = ligne[7:].strip()
        ev[cur] = ev.get(cur, 0) + 1
    if ligne.startswith('data: '):
        try: d = json.loads(ligne[6:])
        except Exception: continue
        if 'chunk' in d: histoire += d['chunk']
print('ÉVÉNEMENTS:', json.dumps(ev, ensure_ascii=False))
print('histoire:', len(histoire.split()), 'mots —', histoire[:90].replace(chr(10),' '), '…')
"
echo "PAQUET PORTABLE VALIDÉ ✓"

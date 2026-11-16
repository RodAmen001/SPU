#!/bin/bash
# v6.5 — Prépare le ZIP complet de distribution du SPU
# Contenu : tout le produit utile (code, corpus, docs, scripts, APK, configs)
# Exclusions : .git, node_modules, .next, skills/ (outillage interne),
#              upload/ (fichiers reçus), voix-piper/ (270 Mo — téléchargés par le Dockerfile),
#              db/custom.db (données locales), logs, download/
set -e
cd /home/z/my-project
VER="6.5"
DEST="/home/z/my-project/download"
DIST="$DEST/SPU-v$VER-complet.zip"

mkdir -p "$DEST"
rm -f "$DIST"

# liste d'inclusions explicites (aucune surprise)
zip -r -q "$DIST" \
  src prisma public db-origine docs scripts apk-spu android spu-kit electron \
  Dockerfile docker-entrypoint.sh Caddyfile README.md \
  package.json bun.lock next.config.ts tailwind.config.ts tsconfig.json \
  eslint.config.mjs postcss.config.mjs components.json \
  APPLICATION-ANDROID-ET-WINDOWS.txt CREER-EXE-WINDOWS.bat \
  -x "*.log" "*__pycache__*" "*.DS_Store"

echo "── taille du ZIP ──"
ls -lh "$DIST"
echo "── contrôle secrets (doit être vide) ──"
# aucun vrai token (placeholders ghp_… / ghp_xxx tolérés)
python3 - <<'EOF'
import zipfile, re
z = zipfile.ZipFile('/home/z/my-project/download/SPU-v6.5-complet.zip')
motifs = [r'gsk_[A-Za-z0-9]{30,}', r'ghp_[A-Za-z0-9]{30,}', r'hf_[A-Za-z0-9]{30,}', r'rnd_[A-Za-z0-9]{20,}']
trouves = []
for n in z.namelist():
    try:
        t = z.read(n).decode('utf-8', 'ignore')
    except Exception:
        continue
    for m in motifs:
        if re.search(m, t):
            trouves.append((n, m))
print("SECRETS TROUVÉS :" if trouves else "aucun secret — ZIP propre ✅", trouves[:5])
print("fichiers dans le ZIP :", len(z.namelist()))
EOF

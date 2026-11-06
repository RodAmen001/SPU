#!/bin/bash
# Construit les paquets SPU v4.3 :
#  1. download/spu-v4.3-portable.zip      — l'application complète
#  2. download/spu-voix-neurales.zip      — les 3 modèles Piper français
#  3. scripts/sauvegarde/                 — copies de sécurité (anti-effacement)
set -e
cd /home/z/my-project
STAGE=/tmp/pack-v43
rm -rf "$STAGE" && mkdir -p "$STAGE/spu-v4.3"

# ── Code + données ───────────────────────────────────────────────────────────
cp -r src prisma db "$STAGE/spu-v4.3/"
mkdir -p "$STAGE/spu-v4.3/scripts"
cp scripts/seed.ts scripts/test-phase0.ts scripts/test-e2e.mjs scripts/test-matching.ts \
   scripts/test-modes.mjs scripts/test-neural.mjs scripts/test-tts-api.py scripts/verif-voix-f0.py \
   scripts/build-standalone.js scripts/LISEZ-MOI-DEMARRAGE.txt "$STAGE/spu-v4.3/scripts/" 2>/dev/null || true
mkdir -p "$STAGE/spu-v4.3/public"
cp -r public/audio public/icons "$STAGE/spu-v4.3/public/"
cp public/sw.js public/logo.svg public/manifest.webmanifest public/robots.txt "$STAGE/spu-v4.3/public/" 2>/dev/null || true
# Moteur de voix serveur (binaire + modèles, liens symboliques préservés)
cp -a voix-piper "$STAGE/spu-v4.3/voix-piper"
# Lanceurs application native
cp -r electron android "$STAGE/spu-v4.3/"
cp CREER-EXE-WINDOWS.bat APPLICATION-ANDROID-ET-WINDOWS.txt "$STAGE/spu-v4.3/" 2>/dev/null || true
cp download/DISTRIBUTION-APK.txt "$STAGE/spu-v4.3/" 2>/dev/null || true
# APK SPU Pocket (version embarquée pour référence/redistribution)
mkdir -p "$STAGE/spu-v4.3/apk"
cp download/spu-pocket-v*.apk download/spu-pocket-v*.aab "$STAGE/spu-v4.3/apk/" 2>/dev/null || true
# Config + env (DATABASE_URL relatif)
cp package.json bun.lock tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs \
   components.json next-env.d.ts eslint.config.mjs README.md "$STAGE/spu-v4.3/" 2>/dev/null || true
cp .env "$STAGE/spu-v4.3/.env"

# ── Paquet 1 : application portable ─────────────────────────────────────────
cd "$STAGE"
rm -f /home/z/my-project/download/spu-v4.3-portable.zip
zip -rq /home/z/my-project/download/spu-v4.3-portable.zip spu-v4.3 -x "*/node_modules/*"
echo "── zip portable v4.3 :"
ls -la /home/z/my-project/download/spu-v4.3-portable.zip

# ── Paquet 2 : voix neurales (3 modèles, depuis voix-piper) ─────────────────
rm -rf "$STAGE/spu-voix-neurales" && mkdir -p "$STAGE/spu-voix-neurales/public/voix-neurales"
cp /home/z/my-project/voix-piper/modeles/*.onnx /home/z/my-project/voix-piper/modeles/*.onnx.json \
   "$STAGE/spu-voix-neurales/public/voix-neurales/"
cat > "$STAGE/spu-voix-neurales/INSTALLER.txt" <<'TXT'
VOIX NEURALES LOCALES — paquet optionnel du SPU v4.3
════════════════════════════════════════════════════
3 vraies voix françaises (Piper, licence MIT) :
  Tom (homme) · Pierre (homme) · Siwis (femme)
  → les 10 profils du théâtre sonore s'y mappent automatiquement.

INSTALLATION
1. Dézippe ce paquet.
2. Copie le contenu du dossier public/ DANS le dossier de ton SPU
   (crée le dossier public/voix-neurales s'il n'existe pas).
3. Relance le SPU : le panneau 🎭 « Théâtre sonore » affiche
   « Voix neuronales locales activées » avec les badges
   neuronale · Tom / Pierre / Siwis.

NOTES
• Sur PC/Mac/Linux, le moteur serveur complet (voix-piper) est déjà
  dans le paquet portable : ces modèles servent de réserve/échange.
• La synthèse est 100 % locale, aucune connexion, aucune clé API.
• Sans ce paquet, l'app utilise les voix du navigateur (repli auto).
TXT
cd "$STAGE"
rm -f /home/z/my-project/download/spu-voix-neurales.zip
zip -rq /home/z/my-project/download/spu-voix-neurales.zip spu-voix-neurales
echo "── zip voix neurales :"
ls -la /home/z/my-project/download/spu-voix-neurales.zip

# ── Copies de sécurité (anti-effacement sandbox) ────────────────────────────
mkdir -p /home/z/my-project/scripts/sauvegarde
cp /home/z/my-project/download/spu-v4.3-portable.zip /home/z/my-project/download/spu-voix-neurales.zip \
   /home/z/my-project/scripts/sauvegarde/
echo "── copies de sécurité :"
ls -la /home/z/my-project/scripts/sauvegarde/
echo "═══ PAQUETS v4.3 PRÊTS ═══"

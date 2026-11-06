#!/bin/bash
# Construit download/spu-v4.2-portable.zip :
# base = structure du zip v4.1 (parité garantie) + code actuel (correctif
# en-têtes WAV des voix neurales + version v4.2 dans l'interface).
set -e
cd /home/z/my-project
STAGE=/tmp/pack-v42
rm -rf "$STAGE" && mkdir -p "$STAGE"

# ── 1. Base : extraire le zip v4.1 et renommer le dossier racine ────────────
unzip -q download/spu-v4.1-portable.zip -d "$STAGE"
mv "$STAGE/spu-v4.1" "$STAGE/spu-v4.2"

# ── 2. Recouvrir avec l'état actuel du projet ────────────────────────────────
rm -rf "$STAGE/spu-v4.2/src"
cp -r src "$STAGE/spu-v4.2/src"
mkdir -p "$STAGE/spu-v4.2/public"
cp -r public/audio public/icons "$STAGE/spu-v4.2/public/"
cp public/sw.js public/logo.svg public/manifest.webmanifest public/robots.txt "$STAGE/spu-v4.2/public/" 2>/dev/null || true
mkdir -p "$STAGE/spu-v4.2/public/voix-neurales"
cp public/voix-neurales/LISEZ-MOI.txt "$STAGE/spu-v4.2/public/voix-neurales/" 2>/dev/null || true
cp -r public/voix-neurales/lib "$STAGE/spu-v4.2/public/voix-neurales/" 2>/dev/null || true
cp package.json bun.lock tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs components.json next-env.d.ts eslint.config.mjs README.md "$STAGE/spu-v4.2/" 2>/dev/null || true
cp .env "$STAGE/spu-v4.2/.env"
cp -r prisma db "$STAGE/spu-v4.2/"
# Scripts utiles (tests + installateurs voix) dans scripts/, ceux du zip racine sont rafraîchis
mkdir -p "$STAGE/spu-v4.2/scripts"
cp scripts/seed.ts scripts/test-phase0.ts scripts/test-e2e.mjs scripts/test-matching.ts scripts/test-modes.mjs scripts/test-neural.mjs scripts/test-tts-api.py scripts/verif-voix-f0.py "$STAGE/spu-v4.2/scripts/" 2>/dev/null || true
cp scripts/LISEZ-MOI-DEMARRAGE.txt "$STAGE/spu-v4.2/LISEZ-MOI-DEMARRAGE.txt"
cp scripts/portable/TELECHARGER-VOIX-WINDOWS.bat "$STAGE/spu-v4.2/TELECHARGER-VOIX-WINDOWS.bat" 2>/dev/null || true
cp scripts/portable/telecharger-voix.sh "$STAGE/spu-v4.2/telecharger-voix.sh" 2>/dev/null || true

# ── 3. Versions et note v4.2 dans les documents du paquet ───────────────────
sed -i 's/SPU v4\.1/SPU v4.2/g; s/v4\.1/v4.2/g; s/SPU v4\.0/SPU v4.2/g' \
  "$STAGE/spu-v4.2/LISEZ-MOI-DEMARRAGE.txt" \
  "$STAGE/spu-v4.2/DEMARRER-WINDOWS.bat" \
  "$STAGE/spu-v4.2/demarrer-mac-linux.sh" 2>/dev/null || true
cat >> "$STAGE/spu-v4.2/LISEZ-MOI-DEMARRAGE.txt" <<'TXT'

────────────────────────────────────────────────────────
NOUVEAUTÉ v4.2 — Voix masculines neuronales confirmées
────────────────────────────────────────────────────────
• Les 10 profils de voix passent par le moteur neural local (Piper) :
  Tom et Pierre (hommes, F0 mesuré 116–147 Hz), Siwis et Jessica (femmes).
• Correctif : en-têtes WAV régénérés proprement après réglage de hauteur
  (les fichiers étaient techniquement lisibles mais mal déclarés).
• Voix incluses dans le paquet optionnel spu-voix-neurales.zip (4 modèles).
  Sans ce paquet : repli automatique sur les voix du navigateur.
• Pour activer le moteur serveur complet (voix-piper/) sur Linux/Mac :
  bash telecharger-voix.sh  —  l'app bascule toute seule sur Piper.
TXT

# ── 4. Zip final ─────────────────────────────────────────────────────────────
cd "$STAGE"
rm -f /home/z/my-project/download/spu-v4.2-portable.zip
zip -rq /home/z/my-project/download/spu-v4.2-portable.zip spu-v4.2 -x "*/node_modules/*"
echo "── zip portable v4.2 :"
ls -la /home/z/my-project/download/spu-v4.2-portable.zip
echo "── vérification du correctif embarqué :"
unzip -p /home/z/my-project/download/spu-v4.2-portable.zip spu-v4.2/src/lib/spu/voix-neurales.ts | grep -c "tmpdir" \
  && echo "✓ correctif en-têtes WAV présent" || echo "✗ CORRECTIF ABSENT"
echo "═══ PAQUET v4.2 PRÊT ═══"

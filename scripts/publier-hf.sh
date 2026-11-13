#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SPU — Publication vers Hugging Face Spaces (hébergement gratuit, 50 Go,
# sans carte bancaire — connexion possible avec le compte GitHub).
#
# Prérequis :
#   1. Créer un compte sur https://huggingface.co (ou « Sign in with GitHub »)
#   2. Créer un jeton d'accès : https://huggingface.co/settings/tokens
#      → bouton « Create new token », type WRITE
#   3. Puis lancer :
#        export HF_USER=ton-compte-hf
#        export HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
#        bash scripts/publier-hf.sh
#
# Résultat : le SPU en ligne sur https://HF_USER-spu.hf.space (accès public,
# fonctionne en dehors de Z.AI, moteur IA de secours gratuit intégré).
# ─────────────────────────────────────────────────────────────────────────────
set -e

: "${HF_USER:?Définis HF_USER=ton-compte-huggingface}"
: "${HF_TOKEN:?Définis HF_TOKEN=ton jeton Hugging Face (type WRITE)}"

PROJET="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$(mktemp -d)/spu-hf"
mkdir -p "$DEPLOY"

echo "• Préparation des fichiers (exclusion des secrets et gros dossiers)…"
rsync -a \
  --exclude .git --exclude node_modules --exclude .next \
  --exclude .env --exclude '*.env' --exclude 'db/*.db' --exclude 'db/*.db-*' \
  --exclude upload --exclude download --exclude telechargements \
  --exclude android-sdk --exclude android --exclude apk-spu --exclude docs \
  --exclude spu-github --exclude spu-kit --exclude sauvegarde-spu \
  --exclude tool-results --exclude skills --exclude mini-services \
  --exclude examples --exclude electron --exclude tests --exclude jdk21.tar.gz \
  --exclude dev.log --exclude '*.log' --exclude voix-piper \
  "$PROJET/" "$DEPLOY/"

echo "• README d'espace Hugging Face (port 3000)…"
cat > "$DEPLOY/README.md" <<'EOF'
---
title: SPU — Système Parabolique Universel
emoji: "\U0001F30D"
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 3000
pinned: true
---

SPU — orchestrateur narratif multi-IA : pour chaque question, une parabole
sourcée, son interprétation, une histoire et une mise en perspective.
Version autonome (corpus 65 paraboles embarqué, moteur IA de secours gratuit).
EOF

cd "$DEPLOY"
git init -q
git add -A
git -c user.name="SPU" -c user.email="ramenyido@gmail.com" commit -qm "SPU v4.6 — déploiement autonome"
echo "• Envoi vers Hugging Face (peut prendre quelques minutes)…"
git push -f "https://$HF_USER:$HF_TOKEN@huggingface.co/spaces/$HF_USER/SPU" main:main

echo ""
echo "  ╔═══════════════════════════════════════════════════════════════╗"
echo "  ║  SPU publié !                                                  ║"
echo "  ║  Espace   : https://huggingface.co/spaces/$HF_USER/SPU"
echo "  ║  En direct : https://$HF_USER-spu.hf.space"
echo "  ╚═══════════════════════════════════════════════════════════════╝"
echo "  (Premier démarrage : 5 à 15 minutes de construction de l'image.)"

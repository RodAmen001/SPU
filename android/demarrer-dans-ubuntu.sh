#!/usr/bin/env bash
# SPU — script intérieur (exécuté dans Ubuntu/proot par les scripts 1 et 2)
# Idempotent : installe ce qui manque, puis démarre le serveur.
set -e
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$RACINE"
export DEBIAN_FRONTEND=noninteractive

MODE_INSTALLER="${1:-}"

echo " — Dossier SPU : $RACINE"

# ── Node.js 20 (Next.js 16 l'exige) ─────────────────────────────────────────
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2- | cut -d. -f1)" -lt 20 ]; then
  echo " — Installation de Node.js 20 (une fois)..."
  apt-get update -y >/dev/null 2>&1 || true
  apt-get install -y curl ca-certificates gnupg >/dev/null 2>&1 || true
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1
fi
echo " — Node.js : $(node -v)"

# ── Dépendances de l'application ────────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo " — Installation des dépendances (5 à 15 min, une seule fois)..."
  npm install --no-audit --no-fund 2>&1 | tail -2
fi

# ── Base de données (corpus 65 paraboles + contes, comptes SPU) ────────────
npx prisma db push --accept-data-loss >/dev/null 2>&1 || true
npx prisma generate >/dev/null 2>&1 || true

# ── (Optionnel, une fois) Voix neuronales masculines réelles — Piper ARM64 ──
if [ ! -x voix-piper/piper/piper ]; then
  if [ "$MODE_INSTALLER" = "--installer" ]; then
    echo " — Téléchargement optionnel du moteur de voix masculines (Tom, ~65 Mo)..."
    mkdir -p voix-piper/piper voix-piper/modeles || true
    curl -L --fail --silent -o /tmp/piper.tar.gz \
      "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_aarch64.tar.gz" \
      && tar -xzf /tmp/piper.tar.gz -C voix-piper/ --strip-components=1 \
      && curl -L --fail --silent -o voix-piper/modeles/fr_FR-tom-medium.onnx \
           "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/tom/medium/fr_FR-tom-medium.onnx" \
      && curl -L --fail --silent -o voix-piper/modeles/fr_FR-tom-medium.onnx.json \
           "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/tom/medium/fr_FR-tom-medium.onnx.json" \
      && echo "     ✓ Voix neuronales masculines installées (Narrateur, hommes…)" \
      || echo "     (indisponible hors ligne — les voix du navigateur seront utilisées)"
  fi
fi

# ── Démarrage ────────────────────────────────────────────────────────────────
echo ""
echo " ════════════════════════════════════════════"
echo "   SPU démarré — ouvre Chrome sur :"
echo "   http://localhost:3000"
echo "   puis ⋮ → « Ajouter à l'écran d'accueil »"
echo " ════════════════════════════════════════════"
echo ""
npx next dev -p 3000

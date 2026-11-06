#!/bin/bash
# Télécharge les voix neuronales locales (Piper) pour le SPU — Mac/Linux.
# Une fois exécuté, le théâtre sonore utilise de vraies voix masculines
# (Tom, Pierre) et féminines (Siwis, Jessica) — 100 % local ensuite.
# Taille : ~210 Mo au total. Tu peux relancer ce script : il reprend où il s'est arrêté.
set -e
cd "$(dirname "$0")"

BASE_VOIX="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR"
BASE_PIPER="https://github.com/rhasspy/piper/releases/download/2023.11.14-2"

echo "══ 1. Moteur Piper (binaire local) ══"
if [ -x voix-piper/piper/piper ]; then
  echo "   déjà présent ✓"
else
  mkdir -p voix-piper
  curl -L --progress-bar -o voix-piper/piper.tar.gz "$BASE_PIPER/piper_linux_x86_64.tar.gz"
  tar xzf voix-piper/piper.tar.gz -C voix-piper
  rm voix-piper/piper.tar.gz
  echo "   installé ✓"
fi

echo "══ 2. Voix françaises (Tom · Pierre/Jessica · Siwis) ══"
mkdir -p voix-piper/modeles
telecharger() {
  local fichier="$1"; local url="$2"
  if [ -s "voix-piper/modeles/$fichier" ]; then
    echo "   $fichier déjà présent ✓"
  else
    curl -L --progress-bar -o "voix-piper/modeles/$fichier" "$url"
    echo "   $fichier ✓"
  fi
}
telecharger fr_FR-tom-medium.onnx    "$BASE_VOIX/tom/medium/fr_FR-tom-medium.onnx?download=true"
telecharger fr_FR-tom-medium.onnx.json    "$BASE_VOIX/tom/medium/fr_FR-tom-medium.onnx.json?download=true"
telecharger fr_FR-upmc-medium.onnx   "$BASE_VOIX/upmc/medium/fr_FR-upmc-medium.onnx?download=true"
telecharger fr_FR-upmc-medium.onnx.json   "$BASE_VOIX/upmc/medium/fr_FR-upmc-medium.onnx.json?download=true"
telecharger fr_FR-siwis-medium.onnx  "$BASE_VOIX/siwis/medium/fr_FR-siwis-medium.onnx?download=true"
telecharger fr_FR-siwis-medium.onnx.json  "$BASE_VOIX/siwis/medium/fr_FR-siwis-medium.onnx.json?download=true"

echo ""
echo "══ Terminé ══"
echo "Redémarre le SPU, puis ouvre « Théâtre sonore » :"
echo "les 10 voix afficheront « neuronale » — dont les voix masculines réelles."

#!/bin/bash
# Téléchargement des 5 modèles de voix françaises Piper (v6.0 — 12 voix distinctes)
# Chemins Hugging Face : fr/fr_FR/<voix>/<qualité>/<fichier>
set -e
DIR=/home/z/my-project/voix-piper/modeles
mkdir -p "$DIR"
BASE=https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR
dl() {
  local chemin=$1   # ex. tom/medium/fr_FR-tom-medium
  local nom=$(basename "$chemin")
  if [ ! -f "$DIR/$nom.onnx" ] || [ "$(stat -c%s "$DIR/$nom.onnx")" -lt 1000000 ]; then
    echo "→ $nom.onnx"
    curl -sL --retry 3 -o "$DIR/$nom.onnx.tmp" "$BASE/$chemin.onnx?download=true" && mv "$DIR/$nom.onnx.tmp" "$DIR/$nom.onnx"
  fi
  if [ ! -f "$DIR/$nom.onnx.json" ] || [ "$(stat -c%s "$DIR/$nom.onnx.json")" -lt 1000 ]; then
    curl -sL --retry 3 -o "$DIR/$nom.onnx.json" "$BASE/$chemin.onnx.json?download=true"
  fi
  echo "   $nom : $(du -m "$DIR/$nom.onnx" 2>/dev/null | cut -f1) Mo"
}
dl tom/medium/fr_FR-tom-medium
dl siwis/medium/fr_FR-siwis-medium
dl upmc/medium/fr_FR-upmc-medium
dl gilles/low/fr_FR-gilles-low
dl mls/medium/fr_FR-mls-medium
echo "TERMINÉ — fichiers :"
ls -la $DIR/

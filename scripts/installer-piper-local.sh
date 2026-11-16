#!/bin/bash
# v6.4 — Installation locale de Piper + des 4 voix françaises du cloud du
# concepteur (Hugging Face : Rodamen/spu-voix) pour tester END-TO-END
# l'assemblage MP3 du BOOST exactement comme en production (Dockerfile).
set -e
cd /home/z/my-project
HF_TOKEN="${HF_TOKEN:-}"
mkdir -p voix-piper/piper voix-piper/modeles /tmp/piper-dl

# 1) binaire Piper (rhasspy, licence MIT)
if [ ! -x voix-piper/piper/piper ]; then
  echo "[piper-local] téléchargement du binaire…"
  curl -sL -o /tmp/piper-dl/piper.tar.gz "https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz"
  tar xzf /tmp/piper-dl/piper.tar.gz -C /tmp/piper-dl
  cp -r /tmp/piper-dl/piper/* voix-piper/piper/
fi
echo "[piper-local] binaire : $(voix-piper/piper/piper --help 2>&1 | head -1 || echo OK)"

# 2) modèles français (auth par token HF si fourni)
AUTH=()
if [ -n "$HF_TOKEN" ]; then AUTH=(-H "Authorization: Bearer $HF_TOKEN"); fi
for f in fr_FR-tom-medium fr_FR-gilles-low fr_FR-upmc-medium fr_FR-mls-medium; do
  if [ ! -s "voix-piper/modeles/$f.onnx" ]; then
    echo "[piper-local] modèle $f…"
    curl -sL --retry 3 "${AUTH[@]}" -o "voix-piper/modeles/$f.onnx" "https://huggingface.co/Rodamen/spu-voix/resolve/main/$f.onnx?download=true"
    curl -sL --retry 3 "${AUTH[@]}" -o "voix-piper/modeles/$f.onnx.json" "https://huggingface.co/Rodamen/spu-voix/resolve/main/$f.onnx.json?download=true"
  fi
  echo "[piper-local] $f.onnx : $(stat -c%s voix-piper/modeles/$f.onnx) octets"
done
echo "[piper-local] ffmpeg : $(ffmpeg -version 2>/dev/null | head -1 || echo ABSENT)"

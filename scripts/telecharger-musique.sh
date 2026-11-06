#!/bin/bash
# Téléchargement des musiques SoundHelix (instrumentales, crédit T. Schürger requis)
set -u
DIR=/tmp/soundhelix
mkdir -p "$DIR"
cd "$DIR"
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14; do
  f="SoundHelix-Song-$i.mp3"
  if [ ! -s "$f" ]; then
    curl -s --max-time 120 -o "$f" "https://www.soundhelix.com/examples/mp3/$f" &
  fi
  # limite à 4 téléchargements parallèles
  while [ "$(jobs -rp | wc -l)" -ge 4 ]; do sleep 1; done
done
wait
ls -la "$DIR"
echo "TERMINÉ"

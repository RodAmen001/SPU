#!/bin/sh
# Point d'entrée du conteneur SPU : garantit une base présente, démarre le serveur.
set -eu
cd /app

# Valeurs par défaut conformes au déploiement Hugging Face Spaces (port 7860).
PORT="${PORT:-7860}"
HOSTNAME="${HOSTNAME:-0.0.0.0}"
DATABASE_URL="${DATABASE_URL:-file:/app/db/custom.db}"
export PORT HOSTNAME DATABASE_URL

# v6.6 — le chemin de la base SUIT DATABASE_URL : pour rendre les données
# persistantes (audit §C1), il suffit de monter un disque et de le pointer :
#   Render Disk  →  mount path /app/db (rien d'autre à changer)
#   Docker/VPS   →  -v spu-data:/app/db   ou   DATABASE_URL=file:/data/spu.db
DB_CHEMIN="${DATABASE_URL#file:}"
DOSSIER_BD=$(dirname "$DB_CHEMIN")

# Si la base a disparu (volume neuf, redémarrage d'espace éphémère…),
# on restaure la copie construite avec les 100 textes sourcés.
if [ ! -f "$DB_CHEMIN" ]; then
  mkdir -p "$DOSSIER_BD"
  if [ -f /app/db-origine/custom.db ]; then
    cp /app/db-origine/custom.db "$DB_CHEMIN"
    echo "[spu] base restaurée depuis db-origine (corpus 100 textes) → $DB_CHEMIN"
  else
    echo "[spu] ATTENTION : aucune base disponible — le SPU fonctionnera en mode corpus local limité"
  fi
fi

# Le serveur Next.js standalone écoute sur $PORT (7860 par défaut, port HF Spaces).
exec bun /app/server.js

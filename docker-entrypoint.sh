#!/bin/sh
# Point d'entrée du conteneur SPU : garantit une base présente, démarre le serveur.
set -e
cd /app

# Si la base a disparu (volume neuf, redémarrage d'espace éphémère…),
# on restaure la copie construite avec les 65 paraboles.
if [ ! -f /app/db/custom.db ]; then
  mkdir -p /app/db
  if [ -f /app/db-origine/custom.db ]; then
    cp /app/db-origine/custom.db /app/db/custom.db
    echo "[spu] base restaurée depuis db-origine (corpus 65 paraboles)"
  else
    echo "[spu] ATTENTION : aucune base disponible — le SPU fonctionnera en mode corpus local limité"
  fi
fi

# Le serveur Next.js standalone écoute sur $PORT (3000 par défaut).
exec bun server.js

#!/bin/bash
# Démarre le serveur SPU, attend qu'il soit prêt, puis exécute la commande passée en argument.
cd /home/z/my-project
# nettoie un éventuel serveur déjà présent sur le port
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
rm -f dev.log
setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
# attente du readiness (max 40 s)
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health --max-time 2 2>/dev/null)
  if [ "$code" = "200" ]; then
    echo "serveur prêt (${i}s)"
    break
  fi
  sleep 1
done
if [ "$code" != "200" ]; then
  echo "ERREUR: serveur non prêt"; tail -20 dev.log; exit 1
fi
bash "$@"

#!/bin/bash
# Gardien : relance le serveur SPU (standalone production) s'il s'arrête.
while true; do
  if ! curl -s -o /dev/null --max-time 3 http://localhost:3000/api/health; then
    cd /home/z/my-project
    pkill -f "standalone/server.js" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    pkill -f "next-server" 2>/dev/null
    sleep 1
    setsid env NODE_ENV=production bun .next/standalone/server.js < /dev/null >> /tmp/spu-server.log 2>&1 &
    echo "[gardien] serveur relancé à $(date +%H:%M:%S)" >> /tmp/spu-gardien.log
    sleep 8
  fi
  sleep 5
done

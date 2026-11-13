#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# SPU — Tunnel Cloudflare GRATUIT (sans carte bancaire) sur VOTRE serveur
#
# Rend le SPU accessible depuis Internet sur une adresse https publique,
# en creusant un tunnel sortant depuis votre serveur : aucun port à ouvrir,
# aucune IP publique requise, aucun frais.
#
# Usage :
#   bash serveur-tunnel.sh                 → tunnel rapide (URL aléatoire immédiate)
#   bash serveur-tunnel.sh service         → installe un service systemd (redémarre tout seul)
#
# Prérequis : le SPU tourne en local (http://localhost:3000).
# ─────────────────────────────────────────────────────────────────────────────
set -e

PORT_SPU="${PORT_SPU:-3000}"
BIN="/usr/local/bin/cloudflared"

echo "── SPU : tunnel Cloudflare gratuit ──"

# 1. Installer cloudflared si absent
if [ ! -x "$BIN" ]; then
  echo "• Installation de cloudflared…"
  ARCH=$(uname -m)
  case "$ARCH" in
    x86_64)  FICHE="cloudflared-linux-amd64" ;;
    aarch64|arm64) FICHE="cloudflared-linux-arm64" ;;
    *) echo "Architecture non reconnue : $ARCH"; exit 1 ;;
  esac
  curl -fsSL -o "$BIN" "https://github.com/cloudflare/cloudflared/releases/latest/download/$FICHE"
  chmod +x "$BIN"
  echo "• cloudflared installé."
fi

# 2. Vérifier que le SPU répond en local
if curl -sf -m 5 "http://localhost:$PORT_SPU/api/health" > /dev/null; then
  echo "• SPU détecté sur le port $PORT_SPU ✓"
else
  echo "⚠ Le SPU ne répond pas sur http://localhost:$PORT_SPU — démarre-le d'abord (scripts/demonise.py serveur)."
  exit 1
fi

if [ "$1" = "service" ]; then
  # 3a. Service systemd : le tunnel survit aux redémarrages
  echo "• Création du service systemd spu-tunnel…"
  tee /etc/systemd/system/spu-tunnel.service > /dev/null <<EOF
[Unit]
Description=SPU — tunnel Cloudflare (accès public gratuit)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=$BIN tunnel --no-autoupdate --url http://localhost:$PORT_SPU
Restart=always
RestartSec=10
User=$(whoami)

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload
  systemctl enable --now spu-tunnel
  sleep 4
  journalctl -u spu-tunnel -n 20 --no-pager | grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" | tail -1 > /home/"$(whoami)"/spu-url-publique.txt || true
  echo "• Service installé et démarré."
  echo "• URL publique (écrite aussi dans ~/spu-url-publique.txt) :"
  cat /home/"$(whoami)"/spu-url-publique.txt 2>/dev/null || journalctl -u spu-tunnel -n 30 --no-pager | grep trycloudflare || true
else
  # 3b. Tunnel rapide à la volée (Ctrl+C pour arrêter)
  echo "• Ouverture du tunnel… l'URL publique apparaît ci-dessous :"
  echo ""
  "$BIN" tunnel --no-autoupdate --url "http://localhost:$PORT_SPU" 2>&1 | grep --line-buffered -oE "https://[a-z0-9-]+\.trycloudflare\.com" | while read -r url; do
    echo ""
    echo "  ╔══════════════════════════════════════════════════╗"
    echo "  ║  SPU accessible sur : $url  ║"
    echo "  ╚══════════════════════════════════════════════════╝"
    echo "$url" > "$HOME/spu-url-publique.txt"
  done
fi

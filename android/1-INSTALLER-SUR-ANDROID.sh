#!/data/data/com.termux/files/usr/bin/bash
# ─────────────────────────────────────────────────────────────
# SPU — 1) INSTALLATION SUR ANDROID (à lancer UNE fois dans Termux)
# Prérequis : application Termux (F-Droid) + le dossier spu-v4.3
# dézippé dans le dossier personnel de Termux.
# Usage :  bash ~/spu-v4.3/android/1-INSTALLER-SUR-ANDROID.sh
# ─────────────────────────────────────────────────────────────
set -e
APP_ABS="$(cd "$(dirname "$0")/.." && pwd)"
NOM_APP="$(basename "$APP_ABS")"
CHEIN_APP="/data/data/com.termux/files/home/$NOM_APP"

echo ""
echo " ════════════════════════════════════════════"
echo "  SPU — Installation Android (Termux + Ubuntu)"
echo " ════════════════════════════════════════════"
echo ""
echo " Application détectée : $CHEIN_APP"
echo ""

echo "[1/3] Installation de proot-distro (Ubuntu dans Termux)..."
pkg update -y >/dev/null 2>&1 || true
pkg install -y proot-distro tar curl
proot-distro install ubuntu 2>/dev/null || echo " (Ubuntu déjà installé — ok)"

echo "[2/3] Préparation d'Ubuntu (Node.js 20, dépendances) — 5 à 20 min..."
proot-distro login ubuntu -- bash "$CHEIN_APP/android/demarrer-dans-ubuntu.sh" --installer

echo "[3/3] Installation terminée !"
echo ""
echo " ─────────────────────────────────────────────"
echo "  POUR LANCER LE SPU ENSUITE :"
echo "    bash ~/spu-v4.3/android/2-DEMARRER-SPU.sh"
echo ""
echo "  PUIS, dans Chrome (sur le téléphone) :"
echo "    1. Ouvre  http://localhost:3000"
echo "    2. Menu ⋮  →  « Ajouter à l'écran d'accueil »"
echo "    3. Le SPU devient une vraie application (icône + plein écran)"
echo " ─────────────────────────────────────────────"

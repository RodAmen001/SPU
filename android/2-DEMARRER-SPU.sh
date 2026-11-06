#!/data/data/com.termux/files/usr/bin/bash
# ─────────────────────────────────────────────────────────────
# SPU — 2) DÉMARRAGE QUOTIDIEN SUR ANDROID (après l'installation)
# Usage :  bash ~/spu-v4.3/android/2-DEMARRER-SPU.sh
# Laisse ce terminal ouvert pendant l'utilisation.
# ─────────────────────────────────────────────────────────────
APP_ABS="$(cd "$(dirname "$0")/.." && pwd)"
NOM_APP="$(basename "$APP_ABS")"
CHEIN_APP="/data/data/com.termux/files/home/$NOM_APP"

if [ ! -d "$CHEIN_APP/node_modules" ]; then
  echo "Le SPU n'est pas encore installé — lance d'abord :"
  echo "  bash ~/spu-v4.3/android/1-INSTALLER-SUR-ANDROID.sh"
  exit 1
fi

echo " Démarrage du SPU... (http://localhost:3000 dans Chrome)"
echo " Astuce : Chrome → ⋮ → « Ajouter à l'écran d'accueil » = vraie app"
echo ""
proot-distro login ubuntu -- bash "$CHEIN_APP/android/demarrer-dans-ubuntu.sh"

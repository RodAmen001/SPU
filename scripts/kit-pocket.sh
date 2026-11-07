#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  SPU Pocket — kit tout-en-un pour distribution
#  Usage : bash scripts/kit-pocket.sh
#  Produit : download/kit-spu-pocket-v1.2.zip
#  Contenu : APK + AAB + keystore + guides + livre blanc + sources
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
cd /home/z/my-project
KIT=kit-spu-pocket-v1.2
rm -rf "download/$KIT" "download/$KIT.zip"
mkdir -p "download/$KIT/sources-apk"

# ── binaires officiels (obligatoires) ──
cp download/spu-pocket-v1.2.0.apk "download/$KIT/"
cp download/spu-pocket-v1.2.0.aab "download/$KIT/"
cp download/spu-release.keystore "download/$KIT/"

# ── documentation (si présente) ──
cp docs/INSTALLER-SPU-POCKET.txt "download/$KIT/" 2>/dev/null || true
cp download/LIVRE-BLANC-SPU-v4.4-2026-11-07.txt "download/$KIT/" 2>/dev/null || \
  cp docs/LIVRE-BLANC-SPU-v4.4-2026-11-07.txt "download/$KIT/" 2>/dev/null || true

# ── sources de l'APK (interface + java + scripts de build) ──
cp -r apk-spu/assets apk-spu/java apk-spu/AndroidManifest.xml "download/$KIT/sources-apk/"
cp scripts/build-apk.sh scripts/build-aab.sh scripts/icones-apk.py scripts/test-question-apk.mjs "download/$KIT/sources-apk/"

# ── lisez-moi du kit ──
cat > "download/$KIT/LISEZ-MOI.txt" << 'EOF'
KIT SPU POCKET v1.2.0 — tout-en-un
══════════════════════════════════
spu-pocket-v1.2.0.apk ....... l'application Android signée (62 Ko, Android 7+)
spu-pocket-v1.2.0.aab ....... pour Google Play Store
spu-release.keystore ........ clé de signature — TRÉSOR, à conserver précieusement
                              (sans elle, aucune future mise à jour ne pourra
                               s'installer par-dessus l'actuelle)
INSTALLER-SPU-POCKET.txt .... guide d'installation pas à pas
LIVRE-BLANC-SPU-v4.4-*.txt .. le concept complet du SPU
sources-apk/ ................ interface, code Java, scripts de build
                              (reconstruire : modifier, augmenter versionCode,
                               lancer build-apk.sh)

NOUVEAUTÉ v1.2 : MODE NOMADE 🌤️
L'écran « Poser une question » fonctionne DÈS L'INSTALLATION,
sans aucun serveur (IA publique gratuite, réponse directe).
Avec un serveur SPU : réponse narrée complète (synthèse sourcée,
parabole, histoire). Sécurité détresse intégrée sur les deux modes.
La bibliothèque hors ligne (65 textes) reste inchangée.

Distribution publique permanente :
  https://github.com/Rodamen001/SPU
  https://rodamen001.github.io/SPU/
EOF

cd download && zip -qr "$KIT.zip" "$KIT" && cd ..
ls -lh "download/$KIT.zip"
echo "Kit prêt : download/$KIT.zip"

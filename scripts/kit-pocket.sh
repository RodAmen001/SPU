#!/usr/bin/env bash
# Kit SPU Pocket v1.1 — tout-en-un pour distribution
set -euo pipefail
cd /home/z/my-project
KIT=kit-spu-pocket-v1.2
rm -rf "download/$KIT" "download/$KIT.zip"
mkdir -p "download/$KIT/sources-apk"

cp download/spu-pocket-v1.2.0.apk download/spu-pocket-v1.2.0.aab download/spu-release.keystore "download/$KIT/"
cp download/GUIDE-PUBLICATION-PAS-A-PAS.txt "download/$KIT/"
cp download/DISTRIBUTION-APK.txt "download/$KIT/"
cp -r download/fiche-playstore download/captures-apk "download/$KIT/"

# sources de l'APK (interface + java + scripts de build)
cp -r apk-spu/assets apk-spu/java apk-spu/AndroidManifest.xml "download/$KIT/sources-apk/"
cp scripts/build-apk.sh scripts/build-aab.sh scripts/icones-apk.py scripts/test-question-apk.mjs "download/$KIT/sources-apk/"

# lisez-moi du kit
cat > "download/$KIT/LISEZ-MOI.txt" << 'EOF'
KIT SPU POCKET v1.2.0 — tout-en-un
══════════════════════════════════
spu-pocket-v1.2.0.apk ....... l'application Android signée (62 Ko, Android 7+)
spu-pocket-v1.2.0.aab ....... pour Google Play Store
spu-release.keystore ........ clé de signature — TRÉSOR, à conserver
GUIDE-PUBLICATION-PAS-A-PAS.txt → GitHub, partage, Play Store, les 25 $
DISTRIBUTION-APK.txt ........ fiche technique
fiche-playstore/ ............ textes + icône + bannière + confidentialité
captures-apk/ ............... 7 captures (dont la nouvelle « Poser une question »)
sources-apk/ ................ interface, code Java, scripts de build
                              (reconstruire v1.2 : modifier, augmenter
                               versionCode, lancer build-apk.sh)

NOUVEAUTÉ v1.2 : MODE NOMADE 🌤️
L'écran « Poser une question » fonctionne DÈS L'INSTALLATION,
sans aucun serveur (IA publique gratuite, réponse directe).
Avec un serveur SPU : réponse narrée complète (synthèse sourcée,
parabole, histoire). Sécurité détresse intégrée sur les deux modes.
La bibliothèque hors ligne (65 textes) reste inchangée.
EOF

cd download && zip -qr "$KIT.zip" "$KIT" && cd ..
rm -rf "download/$KIT" download/kit-spu-pocket-v1.0.zip
ls -lh "download/$KIT.zip"

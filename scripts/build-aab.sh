#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  SPU Pocket — construction de l'AAB (Google Play Store)
#  Produit : download/spu-pocket-v1.0.0.aab
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RACINE=/home/z/my-project
SDK=$RACINE/android-sdk
PROJET=$RACINE/apk-spu
BT=$SDK/build-tools/34.0.0
PLAT=$SDK/platforms/android-34/android.jar
JDK=$SDK/jdk
BTJAR=$SDK/bundletool.jar
SORTIE=$RACINE/download
VER=$(grep -oP 'android:versionName="\K[^"]+' "$PROJET/AndroidManifest.xml")
CODE=$(grep -oP 'android:versionCode="\K[^"]+' "$PROJET/AndroidManifest.xml")

cd "$PROJET"
rm -rf build/aab && mkdir -p build/aab

echo "── 1/5 Compilation format proto (aapt2)"
"$BT/aapt2" compile --dir res -o build/res-proto.zip
"$BT/aapt2" link --proto-format -o build/proto.apk \
  -I "$PLAT" --manifest AndroidManifest.xml -R build/res-proto.zip \
  -A assets --auto-add-overlay \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$CODE" --version-name "$VER"

echo "── 2/5 Réorganisation en module base"
(
  cd build/aab
  unzip -q ../proto.apk
  mkdir -p manifest dex
  mv AndroidManifest.xml manifest/
  cp ../dex/classes.dex dex/classes.dex
)

echo "── 3/5 Assemblage base.zip"
(cd build/aab && zip -qr ../base.zip manifest dex res assets resources.pb)

echo "── 4/5 Construction AAB (bundletool)"
"$JDK/bin/java" -jar "$BTJAR" build-bundle \
  --modules=build/base.zip --output "$SORTIE/spu-pocket-v${VER}.aab" \
  --overwrite

echo "── 5/5 Validation"
"$JDK/bin/java" -jar "$BTJAR" validate --bundle "$SORTIE/spu-pocket-v${VER}.aab"
ls -lh "$SORTIE/spu-pocket-v${VER}.aab"
echo "AAB prêt : download/spu-pocket-v${VER}.aab"

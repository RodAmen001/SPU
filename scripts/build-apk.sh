#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  SPU Pocket — construction de l'APK signée (sans Gradle)
#  Usage : bash scripts/build-apk.sh
#  Prérequis : android-sdk/{jdk,build-tools/34.0.0,platforms/android-34,r8.jar}
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

RACINE=/home/z/my-project
SDK=$RACINE/android-sdk
PROJET=$RACINE/apk-spu
BT=$SDK/build-tools/34.0.0
PLAT=$SDK/platforms/android-34/android.jar
JDK=$SDK/jdk
SORTIE=$RACINE/download
VER=$(grep -oP 'android:versionName="\K[^"]+' "$PROJET/AndroidManifest.xml")
CODE=$(grep -oP 'android:versionCode="\K[^"]+' "$PROJET/AndroidManifest.xml")
NOM="spu-pocket-v${VER}.apk"

cd "$PROJET"
rm -rf build && mkdir -p build/classes build/dex

echo "── 1/6 Compilation des ressources (aapt2)"
"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -o build/base.apk \
  -I "$PLAT" \
  --manifest AndroidManifest.xml \
  -R build/res.zip \
  -A assets \
  --auto-add-overlay \
  --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$CODE" --version-name "$VER"

echo "── 2/6 Compilation Java"
"$JDK/bin/javac" --release 8 -encoding UTF-8 \
  -classpath "$PLAT" \
  -d build/classes \
  java/ai/spu/pocket/*.java

echo "── 3/6 Conversion DEX (r8 récent — le d8 de build-tools 34 a un bug)"
"$JDK/bin/jar" cf build/classes.jar -C build/classes .
R8_JAR=$SDK/r8.jar
if [ -f "$R8_JAR" ]; then
  "$JDK/bin/java" -cp "$R8_JAR" com.android.tools.r8.D8 --release --min-api 24 \
    --lib "$PLAT" --output build/dex build/classes.jar
else
  "$BT/d8" --release --min-api 24 --lib "$PLAT" --output build/dex build/classes.jar
fi

echo "── 4/6 Assemblage APK + alignement"
cp build/base.apk build/non-signe.apk
(cd build/dex && zip -q ../non-signe.apk classes.dex)
"$BT/zipalign" -f 4 build/non-signe.apk build/aligne.apk

echo "── 5/6 Signature (keystore SPU)"
if [ ! -f "$SORTIE/spu-release.keystore" ]; then
  "$SDK/jdk/bin/keytool" -genkeypair -v \
    -keystore "$SORTIE/spu-release.keystore" \
    -alias spu -keyalg RSA -keysize 2048 -validity 10950 \
    -storepass spu-2026-pocket -keypass spu-2026-pocket \
    -dname "CN=SPU Pocket, OU=SPU, O=SPU, L=Paris, C=FR" >/dev/null 2>&1
  echo "   keystore créé : download/spu-release.keystore"
fi
"$BT/apksigner" sign \
  --ks "$SORTIE/spu-release.keystore" \
  --ks-key-alias spu \
  --ks-pass pass:spu-2026-pocket \
  --key-pass pass:spu-2026-pocket \
  --out "$SORTIE/$NOM" build/aligne.apk

echo "── 6/6 Vérification"
"$BT/apksigner" verify --print-certs "$SORTIE/$NOM" | head -2
"$BT/aapt2" dump badging "$SORTIE/$NOM" | grep -E "^(package|application-label|sdkVersion|targetSdkVersion)" | head -4
echo ""
ls -lh "$SORTIE/$NOM"
echo "APK prête : download/$NOM"

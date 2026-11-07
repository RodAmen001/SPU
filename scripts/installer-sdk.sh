#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Réinstallation du SDK Android minimal pour SPU Pocket
#  (JDK Temurin 21 + build-tools 34 + platform 34 + r8)
#  Version robuste : curl, reprise si fichiers déjà téléchargés
#  Usage : bash scripts/installer-sdk.sh
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
SDK=/home/z/my-project/android-sdk
DL=/tmp/sdk-dl
mkdir -p "$SDK/platforms" "$SDK/build-tools" "$DL"

telecharger() {  # telecharger URL FICHIER
  local url="$1" fichier="$2"
  if [ -s "$fichier" ]; then
    echo "   déjà présent : $(basename "$fichier") ($(( $(stat -c %s "$fichier") / 1048576 )) Mo)"
  else
    echo "   téléchargement : $(basename "$fichier")"
    curl -fsSL --retry 3 --retry-delay 2 -o "$fichier" "$url"
  fi
}

echo "── Téléchargements (JDK ~190 Mo, build-tools ~55 Mo, platform ~60 Mo, r8 ~16 Mo)"
telecharger "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse" "$DL/jdk.tar.gz" &
p1=$!
telecharger "https://dl.google.com/android/repository/build-tools_r34-linux.zip" "$DL/buildtools.zip" &
p2=$!
telecharger "https://dl.google.com/android/repository/platform-34-ext7_r03.zip" "$DL/platform.zip" &
p3=$!
telecharger "https://dl.google.com/android/maven2/com/android/tools/r8/8.5.35/r8-8.5.35.jar" "$SDK/r8.jar" &
p4=$!
wait $p1 $p2 $p3 $p4

ls -lh "$DL" "$SDK/r8.jar"

echo "── 1/4 JDK (extraction)"
[ -d "$SDK/jdk" ] || mkdir -p "$SDK/jdk"
tar xzf "$DL/jdk.tar.gz" -C "$SDK/jdk" --strip-components=1

echo "── 2/4 build-tools 34.0.0"
rm -rf "$DL/bt" "$SDK/build-tools/34.0.0"
unzip -q "$DL/buildtools.zip" -d "$DL/bt"
BT_DIR=$(find "$DL/bt" -maxdepth 1 -mindepth 1 -type d | head -1)
mv "$BT_DIR" "$SDK/build-tools/34.0.0"

echo "── 3/4 platform android-34"
rm -rf "$DL/plat" "$SDK/platforms/android-34"
unzip -q "$DL/platform.zip" -d "$DL/plat"
PLAT_DIR=$(find "$DL/plat" -maxdepth 1 -mindepth 1 -type d | head -1)
mv "$PLAT_DIR" "$SDK/platforms/android-34"

echo "── 4/4 licences + vérification"
mkdir -p "$SDK/licenses"
echo "24333f8a63b6825ea9c5514f83c2829b004d1fee" > "$SDK/licenses/android-sdk-license"
echo "84831b9409646a918e30573bab4c9c9136d6d5a3" > "$SDK/licenses/android-sdk-preview-license"

"$SDK/jdk/bin/javac" --version
"$SDK/build-tools/34.0.0/aapt2" version 2>&1 | head -1
"$SDK/build-tools/34.0.0/apksigner" --version
"$SDK/jdk/bin/java" -cp "$SDK/r8.jar" com.android.tools.r8.D8 --version | head -1
ls -lh "$SDK/platforms/android-34/android.jar"
echo "✅ SDK prêt"

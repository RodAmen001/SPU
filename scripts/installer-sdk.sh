#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Réinstallation du SDK Android minimal pour SPU Pocket
#  (JDK Temurin 21 + build-tools 34 + platform 34 + r8)
#  Téléchargements PARALLÈLES EN PREMIER PLAN (pas de nohup !)
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
SDK=/home/z/my-project/android-sdk
mkdir -p "$SDK/platforms" "$SDK/build-tools" /tmp/sdk-dl

echo "── Téléchargements parallèles (JDK ~190 Mo, build-tools ~55 Mo, platform ~60 Mo, r8 ~16 Mo)"
(
  wget -q -O /tmp/sdk-dl/jdk.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse" &
  wget -q -O /tmp/sdk-dl/buildtools.zip "https://dl.google.com/android/repository/build-tools_r34-linux.zip" &
  wget -q -O /tmp/sdk-dl/platform.zip "https://dl.google.com/android/repository/platform-34_r02.zip" &
  wget -q -O "$SDK/r8.jar" "https://dl.google.com/android/maven2/com/android/tools/r8/8.5.35/r8-8.5.35.jar" &
  wait
) && echo "── Téléchargements terminés"

ls -lh /tmp/sdk-dl/ "$SDK/r8.jar"

echo "── 1/4 JDK (extraction)"
[ -d "$SDK/jdk" ] || mkdir -p "$SDK/jdk"
tar xzf /tmp/sdk-dl/jdk.tar.gz -C "$SDK/jdk" --strip-components=1

echo "── 2/4 build-tools 34.0.0"
cd /tmp/sdk-dl && unzip -q buildtools.zip -d bt
BT_DIR=$(find /tmp/sdk-dl/bt -maxdepth 1 -mindepth 1 -type d | head -1)
mv "$BT_DIR" "$SDK/build-tools/34.0.0"

echo "── 3/4 platform android-34"
unzip -q /tmp/sdk-dl/platform.zip -d plat
PLAT_DIR=$(find /tmp/sdk-dl/plat -maxdepth 1 -mindepth 1 -type d | head -1)
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

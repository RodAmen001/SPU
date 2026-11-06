#!/bin/bash
# Régénère le paquet portable SPU v4.0 + le paquet optionnel de voix neurales
set -e
cd /home/z/my-project
STAGE=/tmp/pack-spu
rm -rf "$STAGE" && mkdir -p "$STAGE/spu-v4"

# ── Code + config ────────────────────────────────────────────────────────────
cp -r src prisma db "$STAGE/spu-v4/"
mkdir -p "$STAGE/spu-v4/scripts"
cp scripts/seed.ts scripts/test-phase0.ts scripts/test-e2e.mjs scripts/test-matching.ts scripts/test-modes.mjs "$STAGE/spu-v4/scripts/" 2>/dev/null || true
mkdir -p "$STAGE/spu-v4/public"
# public SANS les gros .onnx (paquet voix séparé)
cp -r public/icons public/musique public/sw.js public/logo.svg public/manifest.webmanifest public/robots.txt "$STAGE/spu-v4/public/"
mkdir -p "$STAGE/spu-v4/public/voix-neurales"
cp public/voix-neurales/LISEZ-MOI.txt "$STAGE/spu-v4/public/voix-neurales/" 2>/dev/null || true
cp -r public/voix-neurales/lib "$STAGE/spu-v4/public/voix-neurales/" 2>/dev/null || true
cp package.json bun.lock tsconfig.json next.config.ts tailwind.config.ts postcss.config.mjs components.json README.md "$STAGE/spu-v4/" 2>/dev/null || true
cp .env "$STAGE/spu-v4/.env"
cp scripts/LISEZ-MOI-DEMARRAGE.txt "$STAGE/spu-v4/LISEZ-MOI-DEMARRAGE.txt"

# ── Scripts de démarrage (avec prisma db push pour les nouvelles tables) ────
cat > "$STAGE/spu-v4/DEMARRER-WINDOWS.bat" <<'BAT'
@echo off
chcp 65001 >nul
title SPU v4.0 - Systeme Parabolique Universel
cd /d "%~dp0"
echo.
echo  ============================================
echo   SPU v4.0 - Demarrage (Windows)
echo  ============================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  [!] Node.js n'est pas installe sur cet ordinateur.
  echo      1. Allez sur https://nodejs.org
  echo      2. Telechargez la version LTS et installez-la
  echo      3. Relancez ce fichier
  echo.
  pause
  exit /b 1
)
echo  Node.js detecte :
node --version
echo.
if not exist node_modules (
  echo  [1/4] Installation des dependances — 5 a 10 minutes la premiere fois...
  echo        (connexion internet requise)
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo  [!] L'installation a echoue. Verifiez votre connexion et relancez.
    pause
    exit /b 1
  )
) else (
  echo  [1/4] Dependances deja installees.
)
echo  [2/4] Base de donnees (corpus + comptes SPU)...
call npx prisma db push --accept-data-loss >nul 2>&1
echo  [3/4] Generation du client de base de donnees...
call npx prisma generate
echo  [4/4] Demarrage du serveur...
echo.
echo  >>> Ouvrez http://localhost:3000 dans votre navigateur <<<
echo.
start "" "http://localhost:3000"
call npx next dev -p 3000
echo.
echo  Le serveur s'est arrete.
pause
BAT

cat > "$STAGE/spu-v4/demarrer-mac-linux.sh" <<'SH'
#!/usr/bin/env bash
# SPU v4.0 — démarrage Mac / Linux / Android-Termux
set -e
cd "$(dirname "$0")"
echo ""
echo " ============================================"
echo "  SPU v4.0 — Démarrage (Mac / Linux / Termux)"
echo " ============================================"
echo ""
if ! command -v node >/dev/null 2>&1; then
  echo " [!] Node.js est manquant."
  echo "     - Mac/Linux  : installer la version LTS depuis https://nodejs.org"
  echo "     - Android    : installer Termux (F-Droid) puis :  pkg install nodejs-lts"
  echo ""
  exit 1
fi
echo " Node.js détecté : $(node --version)"
echo ""
if [ ! -d node_modules ]; then
  echo " [1/4] Installation des dépendances — 5 à 15 min la première fois (internet requis)..."
  npm install --no-audit --no-fund
else
  echo " [1/4] Dépendances déjà installées."
fi
echo " [2/4] Base de données (corpus + comptes SPU)..."
npx prisma db push --accept-data-loss >/dev/null 2>&1 || true
echo " [3/4] Génération du client de base de données..."
npx prisma generate
echo " [4/4] Démarrage du serveur..."
echo ""
echo " >>> Ouvrez http://localhost:3000 dans votre navigateur <<<"
echo ""
npx next dev -p 3000
SH
chmod +x "$STAGE/spu-v4/demarrer-mac-linux.sh"

# ── Zips ─────────────────────────────────────────────────────────────────────
cd "$STAGE"
rm -f /home/z/my-project/download/spu-v4-portable.zip
zip -rq /home/z/my-project/download/spu-v4-portable.zip spu-v4 -x "*/node_modules/*"
echo "── zip portable :"
ls -la /home/z/my-project/download/spu-v4-portable.zip

# Paquet optionnel de voix neurales (4 modèles Piper français)
rm -rf "$STAGE/spu-voix-neurales" && mkdir -p "$STAGE/spu-voix-neurales/public/voix-neurales"
cp /home/z/my-project/public/voix-neurales/*.onnx /home/z/my-project/public/voix-neurales/*.onnx.json "$STAGE/spu-voix-neurales/public/voix-neurales/"
cp /home/z/my-project/public/voix-neurales/LISEZ-MOI.txt "$STAGE/spu-voix-neurales/public/voix-neurales/"
cat > "$STAGE/spu-voix-neurales/INSTALLER.txt" <<'TXT'
VOIX NEURALES LOCALES — paquet optionnel du SPU v4.0
════════════════════════════════════════════════════
1. Dézippe ce paquet.
2. Copie le dossier public/ (avec ses 4 voix .onnx) dans ton dossier
   spu-v4/ de l'application — à côté des dossiers src/ et prisma/.
   (Conserver les fichiers existants s'il y en a.)
3. Relance l'application, ouvre la Régie des voix (bouton 🎭 en haut),
   choisis « Voix neurales locales » et écoute la différence.
4. Au premier usage, le navigateur met les voix en cache : ensuite
   le théâtre sonore neural fonctionne même sans internet.

Taille : ~250 Mo (4 voix françaises Piper, licence MIT).
Sans ce paquet, l'application utilise les voix du navigateur — rien n'est cassé.
TXT
cd "$STAGE"
rm -f /home/z/my-project/download/spu-voix-neurales.zip
zip -rq /home/z/my-project/download/spu-voix-neurales.zip spu-voix-neurales
echo "── zip voix neurales :"
ls -la /home/z/my-project/download/spu-voix-neurales.zip
echo "═══ PAQUETS PRÊTS ═══"

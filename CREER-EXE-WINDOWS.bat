@echo off
chcp 65001 >nul
title SPU — Créer l'application Windows (SPU.exe)
cd /d "%~dp0"
echo.
echo  ==========================================================
echo   SPU — CONSTRUCTION DE L'APPLICATION WINDOWS (SPU.exe)
echo  ==========================================================
echo.
echo  Ce script fabrique un vrai installateur Windows a partir
echo  du dossier SPU actuel. Compte 10 a 25 minutes la premiere
echo  fois (telechargements + compilation). Internet requis.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo  [!] Node.js n'est pas installe.
  echo      1. Va sur https://nodejs.org  2. Installe la version LTS
  echo      3. Relance ce fichier.
  pause
  exit /b 1
)
echo  Node.js detecte : 
node --version
echo.

if not exist node_modules (
  echo  [1/6] Installation des dependances de l'application (5-15 min)...
  call npm install --no-audit --no-fund
  if errorlevel 1 ( echo  [!] Echec npm install & pause & exit /b 1 )
) else (
  echo  [1/6] Dependances deja installees.
)
echo  [2/6] Base de donnees (corpus + comptes)...
call npx prisma db push --accept-data-loss >nul 2>&1
call npx prisma generate >nul 2>&1
echo  [3/6] Compilation de l'application en mode production...
call npm run build
if errorlevel 1 ( echo  [!] Echec de la compilation & pause & exit /b 1 )
echo  [4/6] Installation des outils d'empaquetage (electron, electron-builder)...
call npm install --no-save --no-audit --no-fund electron electron-builder
if errorlevel 1 ( echo  [!] Echec de l'installation des outils & pause & exit /b 1 )
echo  [5/6] Preparation du paquet (point d'entree + reglages)...
call node electron\prepare-package.js
echo  [6/6] Construction de l'installateur (5-10 min, ne pas fermer)...
call npx electron-builder --win nsis --x64
if errorlevel 1 ( echo  [!] Echec de la construction & pause & exit /b 1 )
echo.
echo  ==========================================================
echo   TERMINE !
echo   Ton application est la : dist-exe\SPU Setup 1.0.0.exe
echo   - Double-clique pour l'installer (raccourci "SPU" cree)
echo   - Le SPU s'ouvre alors dans sa propre fenetre, sans navigateur
echo  ==========================================================
echo.
start "" "dist-exe"
pause

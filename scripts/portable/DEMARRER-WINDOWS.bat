@echo off
chcp 65001 >nul
title SPU v4.1 - Système Parabolique Universel
cd /d "%~dp0"

echo ═══════════════════════════════════════════════════
echo   SPU v4.1 — démarrage…
echo ═══════════════════════════════════════════════════
echo.

where bun >nul 2>nul
if %errorlevel%==0 (
  echo [1/3] Installation des dependances (bun)...
  call bun install
  echo [2/3] Generation du client Prisma...
  call bunx prisma generate
  echo [3/3] Demarrage du serveur sur http://localhost:3000
  echo.
  echo >>> Ouvre ton navigateur a l adresse : http://localhost:3000
  echo >>> Pour arreter : ferme cette fenetre ou appuie sur Ctrl+C
  call bun run dev
) else (
  echo [1/3] Installation des dependances (npm - premier demarrage : quelques minutes)...
  call npm install
  echo [2/3] Generation du client Prisma...
  call npx prisma generate
  echo [3/3] Demarrage du serveur sur http://localhost:3000
  echo.
  echo >>> Ouvre ton navigateur a l adresse : http://localhost:3000
  echo >>> Pour arreter : ferme cette fenetre ou appuie sur Ctrl+C
  call npm run dev
)
pause

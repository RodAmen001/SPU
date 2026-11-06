@echo off
REM Telecharge les voix neuronales locales (Piper) pour le SPU - Windows.
REM Une fois execute, le theatre sonore utilise de vraies voix masculines
REM (Tom, Pierre) et feminines (Siwis, Jessica) - 100 % local ensuite.
REM Taille : ~210 Mo au total. Tu peux relancer ce script : il reprend.
cd /d "%~dp0"

set BASE_VOIX=https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR
set BASE_PIPER=https://github.com/rhasspy/piper/releases/download/2023.11.14-2

echo == 1. Moteur Piper (binaire local) ==
if exist "voix-piper\piper\piper.exe" (
  echo    deja present OK
) else (
  mkdir voix-piper 2>nul
  curl -L -o voix-piper\piper.zip "%BASE_PIPER%/piper_windows_amd64.zip"
  tar -xf voix-piper\piper.zip -C voix-piper
  del voix-piper\piper.zip
  echo    installe OK
)

echo == 2. Voix francaises (Tom / Pierre-Jessica / Siwis) ==
mkdir voix-piper\modeles 2>nul
call :recup fr_FR-tom-medium.onnx      "%BASE_VOIX%/tom/medium/fr_FR-tom-medium.onnx?download=true"
call :recup fr_FR-tom-medium.onnx.json "%BASE_VOIX%/tom/medium/fr_FR-tom-medium.onnx.json?download=true"
call :recup fr_FR-upmc-medium.onnx     "%BASE_VOIX%/upmc/medium/fr_FR-upmc-medium.onnx?download=true"
call :recup fr_FR-upmc-medium.onnx.json "%BASE_VOIX%/upmc/medium/fr_FR-upmc-medium.onnx.json?download=true"
call :recup fr_FR-siwis-medium.onnx    "%BASE_VOIX%/siwis/medium/fr_FR-siwis-medium.onnx?download=true"
call :recup fr_FR-siwis-medium.onnx.json "%BASE_VOIX%/siwis/medium/fr_FR-siwis-medium.onnx.json?download=true"

echo.
echo == Termine ==
echo Redemarre le SPU, puis ouvre "Theatre sonore" :
echo les 10 voix afficheront "neuronale" - dont les voix masculines reelles.
pause
exit /b 0

:recup
if exist "voix-piper\modeles\%1" (
  echo    %1 deja present OK
) else (
  curl -L -o "voix-piper\modeles\%1" %2
  echo    %1 OK
)
exit /b 0

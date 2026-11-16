#!/usr/bin/env python3
# Analyse des locuteurs du modèle fr_FR-mls-medium : génération d'un échantillon
# par locuteur puis mesure de la voix fondamentale (F0) par autocorrélation.
# Objectif : classer hommes (~85-160 Hz) et femmes (~160-300 Hz) pour choisir
# des timbres nettement distincts parmi les 12 voix du SPU.
import subprocess, wave, struct, math, sys, os

MODELE = '/home/z/my-project/voix-piper/modeles/fr_FR-mls-medium.onnx'
PIPER = '/home/z/my-project/voix-piper/piper/piper'
TEXTE = "Bonjour, je parle pour mesurer la hauteur de ma voix."
OUT = '/tmp/voix-mls'
os.makedirs(OUT, exist_ok=True)

LOCUTEURS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 124]

def f0_moyen(chemin):
    with wave.open(chemin, 'rb') as w:
        sr = w.getframerate()
        n = w.getnframes()
        brut = w.readframes(n)
    x = struct.unpack(f'<{n}h', brut)
    x = [v / 32768.0 for v in x]
    fen = int(sr * 0.04)  # fenêtre 40 ms
    pas = fen  # sans recouvrement
    f0s = []
    seuil_min = sr // 350  # période min (350 Hz)
    seuil_max = sr // 80   # période max (80 Hz)
    for debut in range(0, len(x) - fen, pas):
        f = x[debut:debut + fen]
        e = sum(v * v for v in f)
        if e < 0.05:  # silence
            continue
        meilleure = 0
        meilleur_cor = 0.0
        for lag in range(seuil_min, seuil_max):
            cor = sum(f[i] * f[i + lag] for i in range(fen - lag)) if lag < fen else 0
            if cor > meilleur_cor:
                meilleur_cor = cor
                meilleure = lag
        if meilleure and meilleur_cor > 0:
            f0 = sr / meilleure
            if 60 <= f0 <= 350:
                f0s.append(f0)
    if not f0s:
        return 0
    f0s.sort()
    # médiane : robuste aux artefacts d'octave
    return f0s[len(f0s) // 2]

resultats = []
for loc in LOCUTEURS:
    wav = f'{OUT}/loc{loc}.wav'
    try:
        subprocess.run(
            [PIPER, '-m', MODELE, '--speaker', str(loc), '--length-scale', '1.0', '-f', wav],
            input=TEXTE + '\n', text=True, capture_output=True, timeout=60
        )
        f0 = f0_moyen(wav)
        genre = 'FEMME' if f0 >= 170 else ('HOMME' if f0 > 0 else '?')
        resultats.append((loc, round(f0), genre))
        os.remove(wav)
        print(f'locuteur {loc:3d} : F0 = {round(f0):3d} Hz → {genre}', flush=True)
    except Exception as e:
        print(f'locuteur {loc:3d} : ERREUR {e}', flush=True)

print('\n── SYNTHÈSE ──')
femmes = [(l, f) for l, f, g in resultats if g == 'FEMME']
hommes = [(l, f) for l, f, g in resultats if g == 'HOMME']
print('FEMMES :', femmes)
print('HOMMES :', hommes)

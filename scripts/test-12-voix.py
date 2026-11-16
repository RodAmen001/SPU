#!/usr/bin/env python3
# Test des 12 voix SPU v6.0 : génération d'un WAV par profil avec les réglages
# exacts (modèle, locuteur, longueur, hauteur) puis mesure du F0 médian —
# preuve que les 12 timbres sont nettement distinctibles.
import subprocess, wave, struct, os, json

PIPER = '/home/z/my-project/voix-piper/piper/piper'
DIR = '/home/z/my-project/voix-piper/modeles'
OUT = '/tmp/voix-12'
os.makedirs(OUT, exist_ok=True)
TEXTE = "Je refuse d'abandonner. Demain, je recommence, jusqu'à la victoire."

# mêmes réglages que src/lib/spu/voix-neurales.ts
PROFILS = [
    ('narrateur',       'fr_FR-tom-medium',    None, 0.98, 0.97),
    ('conteur',         'fr_FR-gilles-low',    None, 1.10, 0.96),
    ('sage',            'fr_FR-upmc-medium',   1,    1.08, 0.92),
    ('homme-jeune',     'fr_FR-mls-medium',    20,   1.00, 1.00),
    ('homme-mure',      'fr_FR-tom-medium',    None, 0.92, 0.95),
    ('homme-vigoureux', 'fr_FR-mls-medium',    40,   0.95, 0.99),
    ('femme-jeune',     'fr_FR-mls-medium',    95,   1.00, 1.00),
    ('femme-mure',      'fr_FR-upmc-medium',   0,    1.05, 0.97),
    ('femme-conteuse',  'fr_FR-mls-medium',    75,   1.02, 1.00),
    ('vieille-femme',   'fr_FR-mls-medium',    25,   1.12, 0.94),
    ('enfant-fille',    'fr_FR-mls-medium',    55,   1.05, 1.38),
    ('enfant-garcon',   'fr_FR-tom-medium',    None, 1.06, 1.45),
]

def f0_median(chemin, sr):
    with wave.open(chemin, 'rb') as w:
        n = w.getnframes()
        brut = w.readframes(n)
    x = [v / 32768.0 for v in struct.unpack(f'<{n}h', brut)]
    fen = int(sr * 0.04)
    f0s = []
    for debut in range(0, len(x) - fen, fen):
        f = x[debut:debut + fen]
        if sum(v * v for v in f) < 0.05:
            continue
        meilleur_lag, meilleur_cor = 0, 0.0
        for lag in range(sr // 350, min(sr // 80, fen)):
            cor = sum(f[i] * f[i + lag] for i in range(fen - lag))
            if cor > meilleur_cor:
                meilleur_cor, meilleur_lag = cor, lag
        if meilleur_lag and meilleur_cor > 0:
            f0 = sr / meilleur_lag
            if 60 <= f0 <= 350:
                f0s.append(f0)
    if not f0s:
        return 0
    f0s.sort()
    return f0s[len(f0s) // 2]

def sample_rate(modele):
    j = json.load(open(f'{DIR}/{modele}.onnx.json'))
    return j.get('audio', {}).get('sample_rate', 22050)

print(f"{'profil':16s} {'modèle':20s} {'durée':>6s} {'F0':>5s}  distinct?")
for profil, modele, loc, longueur, pitch in PROFILS:
    brut = f'{OUT}/{profil}.wav'
    args = [PIPER, '-m', f'{DIR}/{modele}.onnx', '--length-scale', str(longueur), '-f', brut]
    if loc is not None:
        args += ['--speaker', str(loc)]
    subprocess.run(args, input=TEXTE + '\n', text=True, capture_output=True, timeout=90)
    sr = sample_rate(modele)
    # décalage de hauteur (comme decalerPitch)
    if abs(pitch - 1) >= 0.015:
        atempo = 1 / pitch
        ajuste = f'{OUT}/{profil}-p.wav'
        filtre = f"asetrate={int(sr * pitch)},atempo={atempo:.5f},aresample={sr}"
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', brut, '-af', filtre, '-f', 'wav', ajuste], capture_output=True)
        os.replace(ajuste, brut)
    sr_eff = int(sr * pitch) if abs(pitch - 1) >= 0.015 else sr
    with wave.open(brut, 'rb') as w:
        duree = w.getnframes() / w.getframerate()
    f0 = f0_median(brut, sr)
    taille = os.path.getsize(brut)
    ok = taille > 40000
    print(f"{profil:16s} {modele:20s} {duree:5.1f}s {f0:4.0f}Hz {'✅' if ok else '❌ VIDE'}")
print('\nTailles :', {p: os.path.getsize(f'{OUT}/{p}.wav') for p, *_ in PROFILS})

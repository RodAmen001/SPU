#!/usr/bin/env python3
"""Analyse les morceaux SoundHelix : tempo, énergie, luminosité — pour choisir
les pistes par mode SPU (oracle majestueux, mentor chaleureux, deep méditatif,
enfant léger, réponse distincte)."""
import subprocess, json, os
import numpy as np

DIR = "/tmp/soundhelix"
SR = 11025

def decode(f):
    raw = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-ss", "60", "-t", "90", "-i", f, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, timeout=60).stdout
    return np.frombuffer(raw, dtype=np.float32)

def analyse(x):
    # énergie par tranches de 0,25 s
    hop = SR // 4
    n = len(x) // hop
    env = np.sqrt(np.mean(x[:n*hop].reshape(n, hop) ** 2, axis=1)) + 1e-9
    env_db = 20 * np.log10(env)
    # tempo : autocorrélation de l'enveloppe (60-180 BPM => 0.33-1.0 s)
    envz = env - env.mean()
    ac = np.correlate(envz, envz, "full")[len(envz)-1:]
    peaks = {}
    for lag_s in np.arange(0.33, 1.02, 0.01):
        l = int(lag_s * 4)
        if l + 1 < len(ac):
            peaks[lag_s] = ac[l]
    best = max(peaks, key=peaks.get)
    tempo = 60.0 / best
    # luminosité : centroïde spectral moyen (échantillon au milieu)
    seg = x[len(x)//3 : len(x)//3 + SR*10]
    if len(seg) < 2048: seg = x[:SR*10]
    spec = np.abs(np.fft.rfft(seg[: len(seg)//2048*2048].reshape(-1, 2048), axis=1))
    freqs = np.fft.rfftfreq(2048, 1/SR)
    centroid = float(np.mean((spec * freqs).sum(1) / (spec.sum(1) + 1e-9)))
    return {
        "rms_db": round(float(np.mean(env_db)), 1),
        "tempo_bpm": round(tempo, 0),
        "centroid_hz": round(centroid, 0),
        "duree_s": round(len(x)/SR, 0),
    }

resultats = {}
for i in range(1, 15):
    f = f"{DIR}/SoundHelix-Song-{i}.mp3"
    if not os.path.exists(f) or os.path.getsize(f) < 1_000_000:
        continue
    x = decode(f)
    resultats[i] = analyse(x)
    print(f"Song {i:2d}: {json.dumps(resultats[i])}")

print("\n=== Choix suggéré ===")
tri = sorted(resultats.items(), key=lambda kv: kv[1]["tempo_bpm"])
print("Plus lent → plus rapide :", [k for k, _ in tri])
tri_lum = sorted(resultats.items(), key=lambda kv: kv[1]["centroid_hz"])
print("Plus sombre → plus clair :", [k for k, _ in tri_lum])
json.dump(resultats, open(f"{DIR}/analyse.json", "w"))

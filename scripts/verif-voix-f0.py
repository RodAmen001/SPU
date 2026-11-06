# Vérification objective des voix Piper : estimation de F0 (fréquence fondamentale)
# Homme : ~85–155 Hz · Femme : ~165–255 Hz · Enfant : >250 Hz
import wave, sys, struct

def f0_mediane(chemin, fmin=60, fmax=400):
    w = wave.open(chemin, 'rb')
    sr = w.getframerate()
    n = w.getnframes()
    brut = w.readframes(n)
    w.close()
    echant = struct.unpack(f'<{n}h', brut)
    echant = [s / 32768 for s in echant]
    fenetre = sr // 2  # 0,5 s
    f0s = []
    pas = sr // 4
    for debut in range(0, len(echant) - fenetre, pas):
        x = echant[debut:debut + fenetre]
        # retire la moyenne
        m = sum(x) / len(x)
        x = [v - m for v in x]
        e = sum(v * v for v in x)
        if e < 0.01:  # silence
            continue
        lag_min, lag_max = int(sr / fmax), int(sr / fmin)
        meilleur, meillseur_lag = 0, 0
        for lag in range(lag_min, min(lag_max, len(x) // 2)):
            r = sum(x[i] * x[i + lag] for i in range(0, len(x) - lag, 2))
            if r > meilleur:
                meilleur, meillseur_lag = r, lag
        if meillseur_lag and meilleur > 0.25 * e:
            f0s.append(sr / meillseur_lag)
    f0s.sort()
    return f0s[len(f0s) // 2] if f0s else 0, len(f0s)

for chemin, attendu in [
    ('/tmp/test-tom.wav', 'homme'),
    ('/tmp/test-pierre.wav', 'homme'),
    ('/tmp/test-siwis.wav', 'femme'),
]:
    f0, nb = f0_mediane(chemin)
    print(f"{chemin.split('/')[-1]:22s} F0 médiane = {f0:6.1f} Hz ({nb} fenêtres) → attendu {attendu}")

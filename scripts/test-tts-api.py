# Test API TTS : les 10 profils de voix du SPU + cache + pitch des enfants
import json, subprocess, time, wave, struct

B = 'http://localhost:3000'
PROFILS = ['narrateur', 'sage', 'vieille-femme', 'enfant-fille', 'enfant-garcon',
           'femme-jeune', 'femme-mure', 'homme-jeune', 'homme-mure', 'conteur']
PHRASES = {
    'narrateur': 'Bienvenue dans le SPU. Chaque personnage aura sa propre voix.',
    'sage': 'La patience est une rivière qui finit toujours par tailler la pierre.',
    'vieille-femme': 'Les maisons se réparent avec du temps et des mots doux.',
    'enfant-fille': 'Moi, quand je grandis, je veux un jardin plein de fraises !',
    'enfant-garcon': 'Et puis après, le petit renard a trouvé le chemin tout seul.',
    'femme-jeune': 'Elle marcha longtemps dans la vallée, portant sa lampe.',
    'femme-mure': 'Les tempêtes finissent toujours par se taire, tu sais.',
    'homme-jeune': 'Le jeune voyageur choisit le sentier de gauche.',
    'homme-mure': 'Le charpentier regarda la poutre : elle était droite enfin.',
    'conteur': 'Au bord du feu, la voix se fait plus basse, et l histoire respire.',
}

def duree_wav(chemin):
    w = wave.open(chemin, 'rb')
    d = w.getnframes() / w.getframerate()
    w.close()
    return d

resultats = []
for p in PROFILS:
    t0 = time.time()
    r = subprocess.run(['curl', '-s', '--max-time', '60', '-X', 'POST', f'{B}/api/tts',
                        '-H', 'Content-Type: application/json',
                        '-d', json.dumps({'voix': p, 'texte': PHRASES[p]}),
                        '-o', f'/tmp/tts-{p}.wav', '-w', '%{http_code}'], capture_output=True, text=True)
    code = r.stdout.strip()
    t1 = time.time()
    try:
        d = duree_wav(f'/tmp/tts-{p}.wav')
    except Exception:
        d = -1
    resultats.append((p, code, d, t1 - t0))
    marqueur = '✓' if code == '200' and d > 0 else '✗'
    print(f'{marqueur} {p:15s} http {code} · durée audio {d:5.1f}s · génération {t1-t0:4.1f}s')

# Cache : 2e appel narrateur doit être quasi instantané
t0 = time.time()
subprocess.run(['curl', '-s', '-X', 'POST', f'{B}/api/tts', '-H', 'Content-Type: application/json',
                '-d', json.dumps({'voix': 'narrateur', 'texte': PHRASES['narrateur']}),
                '-o', '/tmp/tts-cache.wav'], check=True)
print(f"\n2e appel (cache) : {time.time()-t0:.2f}s → {'✓ cache actif' if time.time()-t0 < 1 else '✗ cache lent'}")

# Échec propre : profil inconnu
r = subprocess.run(['curl', '-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'POST', f'{B}/api/tts',
                    '-H', 'Content-Type: application/json', '-d', '{"voix":"inconnu","texte":"test"}'],
                   capture_output=True, text=True)
print(f"Profil inconnu → http {r.stdout.strip()} (attendu 503/400) {'✓' if r.stdout.strip() in ('503','400') else '✗'}")

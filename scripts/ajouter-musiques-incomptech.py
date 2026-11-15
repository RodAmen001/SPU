# -*- coding: utf-8 -*-
# v5.0 — Catalogue musical 51 → 100 pistes, source officielle incompetech
# (pieces.json, feel/genre/bpm). Chaque URL vérifiée en direct. Le champ
# « ambiance » alimente la sélection musique ↔ parabole côté SPU.
import json, io, os, time, urllib.request, urllib.parse, random

UA = 'SPU/5.0 (https://spu-web.onrender.com; contact ramenyido@gmail.com)'
CATALOGUE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'musiques-libres.json')
BASE = 'https://incompetech.com/music/royalty-free/'
BASE_MP3 = BASE + 'mp3-royaltyfree/'

def get_json(url, timeout=30):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

pieces = get_json(BASE + 'pieces.json')
print('catalogue incomptech :', len(pieces), 'pistes')

existant = json.load(io.open(CATALOGUE, encoding='utf-8'))
titres_ex = {e['titre'].lower() for e in existant}
urls_ex = {e['url'] for e in existant}

def seconds(longueur):
    try:
        p = longueur.split(':')
        return int(p[0]) * 3600 + int(p[1]) * 60 + int(p[2]) if len(p) == 3 else int(p[0]) * 60 + int(p[1])
    except Exception:
        return 0

# familles d'ambiance → mots-clés de « feel » / description (anglais, site officiel)
FAMILLES = {
    'calme': ['calm', 'relaxed', 'peaceful', 'gentle', 'soft', 'mellow', 'soothing', 'serene', 'meditat'],
    'lumineux': ['bright', 'uplifting', 'cheerful', 'happy', 'playful', 'bouncy', 'light', 'fun'],
    'profond': ['mysterious', 'mystery', 'contemplative', 'thoughtful', 'somber', 'emotional', 'wistful', 'introspective'],
    'epique': ['epic', 'dramatic', 'heroic', 'triumphant', 'determined', 'driving', 'energetic', 'grooving'],
    'reflechi': ['reflective', 'sentimental', 'nostalgic', 'tender', 'romantic', 'warm', 'solemn', 'sad', 'melanchol', 'dramatic', 'emotional', 'love', 'hopeful'],
}

def famille_de(piece):
    texte = ((piece.get('feel') or '') + ' ' + (piece.get('description') or '')).lower()
    scores = {f: sum(1 for c in cles if c in texte) for f, cles in FAMILLES.items()}
    return max(scores, key=scores.get) if max(scores.values()) > 0 else 'calme'

USAGE_PAR_FAMILLE = {
    'calme': 'deep+accueil',
    'lumineux': 'enfant+accueil',
    'profond': 'oracle+deep',
    'epique': 'oracle',
    'reflechi': 'mentor+accueil',
}

# candidates : durée utile (1:00–6:00), pas de feels agressifs/horror
def candidate_ok(p):
    texte = ((p.get('feel') or '') + ' ' + (p.get('genre') or '')).lower()
    if any(m in texte for m in ['horror', 'scary', 'aggressive', 'unnerving', 'eerie', 'dark', 'angry']):
        return False
    s = seconds(p.get('length') or '')
    return 55 <= s <= 380

candidats = [p for p in pieces if candidate_ok(p) and (p.get('title') or '').lower() not in titres_ex]
random.seed(50)
random.shuffle(candidats)

# cibles par famille (équilibre pour tous les modes)
CIBLES = {'calme': 6, 'lumineux': 4, 'profond': 5, 'epique': 4, 'reflechi': 12}
manque_avant = 100 - len(existant)
print('manque avant :', manque_avant)
compte = {f: 0 for f in CIBLES}
selection = []
for p in candidats:
    f = famille_de(p)
    if compte[f] >= CIBLES[f]:
        continue
    filename = p.get('filename') or (p.get('title') + '.mp3')
    url = BASE_MP3 + urllib.parse.quote(filename)
    selection.append((f, p, url))
    compte[f] += 1
    if sum(compte.values()) >= 49:
        break

print('sélection par famille :', compte, '→', len(selection))

def url_vivante(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA}, method='HEAD')
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status in (200, 301, 302)
    except Exception:
        return False

ajoutes = 0
for f, p, url in selection:
    if ajoutes >= manque_avant:
        break
    if url in urls_ex or not url_vivante(url):
        time.sleep(0.3)
        continue
    existant.append({
        'titre': p.get('title') or 'Sans titre',
        'artiste': 'Kevin MacLeod',
        'licence': 'CC-BY 4.0 (incompetech.com)',
        'source': BASE + 'music.html',
        'url': url,
        'usage': USAGE_PAR_FAMILLE[f],
        'duree': p.get('length') or 'variable',
        'ambiance': (p.get('feel') or f).capitalize(),
    })
    ajoutes += 1
    urls_ex.add(url)
    time.sleep(0.3)

json.dump(existant, io.open(CATALOGUE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'ajoutées : {ajoutes} → TOTAL : {len(existant)} pistes')
manque = 100 - len(existant)
if manque > 0:
    print(f'ATTENTION : {manque} pistes manquantes')

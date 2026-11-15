# -*- coding: utf-8 -*-
# v5.0 — Catalogue musical : 51 → 100 pistes. Ajout de 49 musiques du domaine
# public (archive.org : collection musopen + enregistrements 78 tours du monde),
# chaque URL vérifiée en direct. Sélection finale par ambiance pour le mapping
# parabole → musique (culture/famille côté SPU).
import json, io, os, time, urllib.request

UA = 'SPU/5.0 (https://spu-web.onrender.com; contact ramenyido@gmail.com)'
CATALOGUE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'musiques-libres.json')

def get_json(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)

def url_vivante(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA}, method='HEAD')
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status in (200, 301, 302)
    except Exception:
        # certains serveurs refusent HEAD : GET partielle
        try:
            req2 = urllib.request.Request(url, headers={'User-Agent': UA, 'Range': 'bytes=0-1023'})
            with urllib.request.urlopen(req2, timeout=15) as r:
                return r.status in (200, 206, 301, 302)
        except Exception:
            return False

def fichiers_identifier(identifiant):
    """Renvoie (url_mp3, taille) du meilleur fichier audio du document archive.org."""
    try:
        meta = get_json(f'https://archive.org/metadata/{identifiant}')
    except Exception:
        return None
    fichiers = meta.get('files', [])
    mp3s = [f for f in fichiers if f.get('name', '').lower().endswith(('.mp3',))
            and (int(f.get('size', 0) or 0) > 400_000)]  # écarter les extraits minuscules
    if not mp3s:
        return None
    f = sorted(mp3s, key=lambda x: -int(x.get('size', 0) or 0))[0]
    return f'https://archive.org/download/{identifiant}/{urllib.parse.quote(f["name"])}'

import urllib.parse

def chercher_collection(requete, rows=12):
    q = urllib.parse.quote(requete)
    url = (f'https://archive.org/advancedsearch.php?q={q}+AND+mediatype%3Aaudio'
           f'&fl%5B%5D=identifier&rows={rows}&page=1&output=json')
    try:
        d = get_json(url)
        return [x['identifier'] for x in d.get('response', {}).get('docs', [])]
    except Exception:
        return []

# Requêtes ciblées : diversité culturelle + ambiances calmes/lumineuses
REQUETES = [
    'collection:musopen piano', 'collection:musopen classical', 'collection:musopen',
    'collection:78rpm china', 'collection:78rpm india', 'collection:78rpm arabic',
    'collection:78rpm japan', 'collection:opensource_audio celtic harp',
    'collection:opensource_audio folk guitar', 'collection:opensource_audio piano calm',
    'collection:opensource_audio flute meditation', 'collection:opensource_audio lullaby',
]

deja = set()
catalogue = json.load(io.open(CATALOGUE, encoding='utf-8'))
print('pistes actuelles :', len(catalogue))

NOUVEAUTES = []
for requete in REQUETES:
    if len(NOUVEAUTES) >= 60:  # marge avant vérification
        break
    ids = chercher_collection(requete)
    time.sleep(0.6)
    for identifiant in ids:
        if identifiant in deja or len(NOUVEAUTES) >= 60:
            continue
        deja.add(identifiant)
        url = fichiers_identifier(identifiant)
        time.sleep(0.4)
        if url:
            NOUVEAUTES.append((identifiant, url))
print('candidates collectées :', len(NOUVEAUTES))

# vérification en direct + métadonnées lisibles
def lisible(identifiant):
    s = identifiant.replace('_', ' ')
    return s[:44]

MOODS = [
    ('calme', ['calm', 'relaxed', 'gentle', 'peaceful', 'meditation', 'nocturne', 'lullaby', 'serene']),
    ('lumineux', ['bright', 'uplifting', 'cheer', 'joy', 'spring', 'morning', 'light']),
    ('profond', ['deep', 'mystery', 'nocturne', 'adagio', 'requiem', 'somber', 'contempl']),
    ('souple', ['waltz', 'dance', 'serenade', 'romance', 'tender', 'love']),
]

def mood_de(identifiant):
    s = identifiant.lower()
    for nom, cles in MOODS:
        if any(c in s for c in cles):
            return nom
    return 'calme'

USAGE_PAR_MOOD = {'calme': 'deep+accueil', 'lumineux': 'enfant+accueil', 'profond': 'oracle', 'souple': 'mentor+accueil'}

ajoutes = 0
cible = 100 - len(catalogue)
for identifiant, url in NOUVEAUTES:
    if ajoutes >= cible:
        break
    if not url_vivante(url):
        time.sleep(0.4)
        continue
    mood = mood_de(identifiant)
    catalogue.append({
        'titre': lisible(identifiant),
        'artiste': 'Enregistrement du domaine public',
        'licence': 'Domaine public (archive.org)',
        'source': f'https://archive.org/details/{identifiant}',
        'url': url,
        'usage': USAGE_PAR_MOOD[mood],
        'duree': 'variable',
        'ambiance': mood.capitalize(),
    })
    ajoutes += 1
    time.sleep(0.4)

json.dump(catalogue, io.open(CATALOGUE, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'ajoutées : {ajoutes} → total {len(catalogue)} pistes')
if len(catalogue) < 100:
    print(f'ATTENTION : il manque {100 - len(catalogue)} pistes — compléter avec autre source')

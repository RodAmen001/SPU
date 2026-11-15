# -*- coding: utf-8 -*-
# v4.9 — Vérification des URLs de sources du corpus avec User-Agent conforme
# (politique Wikimedia) + rythme respectueux ; réparation des liens 404 via
# l'API de recherche. Exigence du concepteur : paraboles « vraies et sourcées ».
import json, io, os, time, urllib.request, urllib.parse

UA = 'SPU/4.9 (https://spu-web.onrender.com; contact ramenyido@gmail.com)'
BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')

def get(url, timeout=15):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Api-User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0

def chercher_page(hote, requete):
    """Renvoie une URL d'article plausible via l'API de recherche du wiki."""
    api = f"https://{hote}/w/api.php?action=query&list=search&srlimit=1&format=json&srsearch=" + urllib.parse.quote(requete)
    req = urllib.request.Request(api, headers={'User-Agent': UA, 'Api-User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            j = json.load(r)
        hit = j.get('query', {}).get('search', [])
        if hit:
            return f"https://{hote}/wiki/" + urllib.parse.quote(hit[0]['title'].replace(' ', '_'))
    except Exception:
        pass
    return None

def charger(nom):
    with io.open(os.path.join(BASE, nom), encoding='utf-8') as f:
        return json.load(f)

def sauver(nom, data):
    with io.open(os.path.join(BASE, nom), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

fichiers = ['corpus-adulte.json', 'corpus-enfant.json']
morts, reparés, four29 = [], [], []

for nom in fichiers:
    data = charger(nom)
    for e in data:
        for i, s in enumerate(e['sources']):
            if not s.startswith('http'):
                continue
            code = e['code']
            statut = get(s)
            if statut == 429:
                four29.append(code)  # limitation temporaire : on garde le lien
                time.sleep(2.5)
                continue
            if statut in (200, 301, 302):
                time.sleep(0.6)
                continue
            # lien mort (404 etc.) : chercher une page de remplacement
            hote = s.split('/')[2]
            requete = e['sources'][0][:90]  # la citation textuelle comme requête
            remplacement = chercher_page(hote, requete)
            time.sleep(1.2)
            if remplacement and get(remplacement) in (200, 301, 302):
                e['sources'][i] = remplacement
                reparés.append((code, s, remplacement))
            else:
                # supprimer l'URL morte, garder la citation textuelle
                e['sources'] = [x for x in e['sources'] if not x.startswith('http')]
                morts.append((code, s))
            time.sleep(1.2)
    sauver(nom, data)

print(f"Réparés ({len(reparés)}):")
for c, ancien, nouveau in reparés:
    print(f"  {c}: {ancien} -> {nouveau}")
print(f"Supprimés ({len(morts)}):")
for c, s in morts:
    print(f"  {c}: {s}")
print(f"Limités (429, liens conservés): {len(four29)} — {sorted(set(four29))}")

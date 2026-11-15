# -*- coding: utf-8 -*-
# Correction ciblée des liens de sources : titres précis testés un par un.
import json, io, os, time, urllib.request, urllib.parse

UA = 'SPU/4.9 (https://spu-web.onrender.com; contact ramenyido@gmail.com)'
BASE = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Api-User-Agent': UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0

def url_article(titre, hote='fr.wikipedia.org'):
    u = f"https://{hote}/wiki/" + urllib.parse.quote(titre.replace(' ', '_'))
    st = get(u)
    time.sleep(1.0)
    return u if st in (200, 301, 302) else None

CIBLES = {
  # code -> liste de candidats (premier vivant retenu) ; None = citation seule
  'P053': ["Honi_ha-M'agel", 'Honi_Hamaguel', 'Honi_le_Rond'],
  'P057': ['Tchouang-tseu', 'Zhuangzi', 'Zhuangzi (philosophe)'],
  'P069': ['Panchatantra', 'Pancatantra'],
  'P070': ['Panchatantra', 'Pancatantra'],
  'P074': ['Parabole de la brebis perdue', 'Parabole de la brebis égarée', 'Paraboles de Jésus'],
  'E006': ['Le Vent et le Soleil', 'Le Vent du Nord et le Soleil'],
  'E007': ['Le Berger menteur', 'Le Berger et le Loup'],
  'E016': ['La Grenouille qui veut se faire aussi grosse que le Bœuf', 'La Grenouille et le Bœuf'],
  'E019': ['L\'Alouette et ses Petits', 'Alouette'],
}

for nom in ['corpus-adulte.json', 'corpus-enfant.json']:
    chemin = os.path.join(BASE, nom)
    data = json.load(io.open(chemin, encoding='utf-8'))
    for e in data:
        cible = CIBLES.get(e['code'])
        if not cible:
            continue
        trouve = None
        for titre in cible:
            trouve = url_article(titre)
            if trouve:
                break
        # supprimer toute URL générique inexacte précédemment posée
        e['sources'] = [s for s in e['sources'] if not s.startswith('http')]
        if trouve:
            e['sources'].append(trouve)
            print(f"{e['code']}: lien rétabli -> {trouve}")
        else:
            print(f"{e['code']}: aucun article fiable — citation textuelle conservée")
    json.dump(data, io.open(chemin, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    io.open(chemin, 'a', encoding='utf-8').write('\n')

print("Correction ciblée terminée.")

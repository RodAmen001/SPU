#!/usr/bin/env python3
# Assemble le livre blanc : concat des parts -> bordures normalisées à 60
# -> fichier txt final daté + version compagnon .md -> rapport de vérification.
import re, os

RACINE = '/home/z/my-project'
parts = [f'{RACINE}/scripts/lb-part{i}.txt' for i in range(1, 5)]
BORD = 60

lignes = []
for p in parts:
    with open(p, encoding='utf-8') as f:
        lignes.extend(f.read().rstrip('\n').split('\n'))

# Normalisation : toute ligne composée uniquement de ═ ou de ─ devient 60 car.
for i, l in enumerate(lignes):
    s = l.strip()
    if s and set(s) == {'═'}:
        lignes[i] = '═' * BORD
    elif s and set(s) == {'─'}:
        lignes[i] = '─' * BORD

txt = '\n'.join(lignes) + '\n'
nom_txt = f'{RACINE}/download/LIVRE-BLANC-SPU-v4.4-2026-11-06.txt'
os.makedirs(f'{RACINE}/download', exist_ok=True)
with open(nom_txt, 'w', encoding='utf-8') as f:
    f.write(txt)

# ─── Version compagnon .md ───────────────────────────────────────────
md = []
i = 0
n = len(lignes)
def est_bord_simple(l, c):
    return l.strip() and set(l.strip()) == {c}

while i < n:
    l = lignes[i]
    # Page de titre (tout début) : bordure ═ / 2 lignes de titre / bordure ═
    if i == 0 and est_bord_simple(lignes[0], '═'):
        titres = []
        j = 1
        while j < n and not est_bord_simple(lignes[j], '═'):
            if lignes[j].strip():
                titres.append(lignes[j].strip())
            j += 1
        md.append('# ' + (titres[0] if titres else 'SPU — Livre blanc'))
        md.append('')
        if len(titres) > 1:
            md.append('_' + titres[1] + '_')
            md.append('')
        i = j + 1
        continue
    # Titre de section : bordure ═ / titre / bordure ═
    if i + 2 < n and est_bord_simple(lignes[i], '═') and est_bord_simple(lignes[i + 2], '═') \
       and lignes[i + 1].strip() and not est_bord_simple(lignes[i + 1], '═'):
        t = lignes[i + 1].strip()
        # Page de titre du document (première bordure)
        if i == 0:
            md.append('# ' + t)
            md.append('')
            md.append('**LIVRE BLANC — SPU**')
            md.append('')
        else:
            md.append('## ' + t)
            md.append('')
        i += 3
        continue
    # Bloc titre/sous-titre entre bordures ─
    if i + 2 < n and est_bord_simple(lignes[i], '─') and est_bord_simple(lignes[i + 2], '─') \
       and lignes[i + 1].strip():
        t = lignes[i + 1].strip()
        # Sous-section numérotée (5.1 ...) → ###, sinon → ## ou texte gras
        md.append('### ' + t if re.match(r'^\d+\.\d', t) else '**' + t + '**')
        md.append('')
        i += 3
        continue
    # Sous-sections numérotées internes (5.1 ...) → ###
    ms = re.match(r'^(\d+\.\d+)\s+(.*)$', l)
    if ms:
        md.append('### ' + l.strip())
        i += 1
        continue
    # Listes à puces → listes markdown
    m = re.match(r'^(\s*)•\s+(.*)$', l)
    if m:
        md.append(f'{m.group(1)}- {m.group(2)}')
        i += 1
        continue
    md.append(l)
    i += 1

nom_md = nom_txt.replace('.txt', '.md')
with open(nom_md, 'w', encoding='utf-8') as f:
    f.write('\n'.join(md) + '\n')

# ─── Rapport ─────────────────────────────────────────────────────────
longues_sans_espace = [(k + 1, len(l)) for k, l in enumerate(lignes)
                       if len(l) > 60 and ' ' not in l.strip()[:61] and l.strip()]
longues = sum(1 for l in lignes if len(l) > 60)
print(f'TXT  : {nom_txt} ({len(lignes)} lignes)')
print(f'MD   : {nom_md}')
print(f'Lignes > 60 car (hors bordures déjà réduites) : {longues}')
print('Lignes > 60 non wrappables (sans espace) :',
      longues_sans_espace[:12] if longues_sans_espace else 'aucune')
import subprocess
r = subprocess.run(['grep', '-c', 'XXX\\|TODO\\|【', nom_txt], capture_output=True, text=True)
print('Placeholders :', r.stdout.strip() or '0')

#!/usr/bin/env python3
"""Convertit le livre blanc .txt (bordures 60) en compagnon .md pour GitHub."""
import re, sys

SRC = '/home/z/my-project/download/LIVRE-BLANC-SPU-v4.4-2026-11-07.txt'
DST = '/home/z/my-project/download/LIVRE-BLANC-SPU-v4.4-2026-11-07.md'

lines = open(SRC, encoding='utf-8').read().split('\n')
out = []
i = 0
n = len(lines)

def is_b60(s):  return set(s) == {'═'} and len(s) == 60
def is_d60(s):  return set(s) == {'─'} and len(s) == 60
def is_sep(s):  return re.fullmatch(r'  ─{56,}', s) is not None
def is_box(s):  return any(c in s for c in '│┌└┐┘├┤╔╠╚║')

# Zones ASCII à encadrer en blocs de code (ancres exactes du txt)
DIAG_START = '            LA QUESTION POSÉE'
DIAG_END   = '      score de confiance, echangeId)'
TAB_SEP    = '  ──────────────────────────────────────────────────────────'

in_diag = False
in_tab = False
i = 0
# Sauter l'en-tête ╔╗ et produire un titre md
assert lines[0].startswith('╔'), 'en-tête inattendu'
end_hdr = next(idx for idx, l in enumerate(lines) if l.startswith('╚'))
meta = [l.strip('║ ').strip() for l in lines[1:end_hdr]
        if l.strip() not in ('', '╠' + '═' * 60) and '═' not in l]
out.append('# Livre blanc — Système Parabolique Universel (SPU v4.4)')
out.append('')
for m in meta:
    out.append(f'> {m}')
out.append('')
out.append('![statut](https://img.shields.io/badge/version-4.4-blue) '
           '![pocket](https://img.shields.io/badge/SPU%20Pocket-1.2.0-green) '
           '![licence](https://img.shields.io/badge/code-MIT-lightgrey)')
out.append('')
i = end_hdr + 1
# sauter un éventuel blanc
while i < n and lines[i].strip() == '':
    i += 1

while i < n:
    l = lines[i]

    # --- blocs de code ASCII du diagramme pipeline ---
    if l == DIAG_START:
        in_diag = True
        out.append('```text')
        out.append(l); i += 1; continue
    if in_diag:
        out.append(l)
        if l == DIAG_END:
            out.append('```')
            in_diag = False
        i += 1; continue

    # --- tableau comparatif §12 (fermeture sur ligne vide) ---
    if is_sep(l) and not in_tab:
        in_tab = True
        out.append('```text')
        out.append(l); i += 1; continue
    if in_tab:
        if l.strip() == '':
            out.append('```')
            in_tab = False
            out.append(l); i += 1; continue
        out.append(l); i += 1; continue

    # --- titre de section : ligne entre deux bordures ═ ---
    if is_b60(l) and i + 2 < n and is_b60(lines[i + 2]):
        titre = lines[i + 1].strip()
        out.append(f'## {titre}')
        out.append('')
        i += 3; continue

    # --- sous-titre : ligne immédiatement suivie d'une bordure ─ ---
    if i + 1 < n and is_d60(lines[i + 1]) and l.strip():
        out.append(f'### {l.strip()}')
        out.append('')
        i += 2; continue
    if is_d60(l):
        i += 1; continue
    if is_b60(l):
        i += 1; continue

    # --- puces ---
    m = re.match(r'^(\s*)• (.*)$', l)
    if m:
        out.append(f'- {m.group(2)}')
        i += 1; continue

    out.append(l)
    i += 1

# Compacter les triples blancs
txt = '\n'.join(out)
txt = re.sub(r'\n{4,}', '\n\n\n', txt)
open(DST, 'w', encoding='utf-8').write(txt)
print(f'OK → {DST}')
print('titres ##:', len(re.findall(r'^## ', txt, re.M)),
      '| sous-titres ###:', len(re.findall(r'^### ', txt, re.M)),
      '| blocs ```:', txt.count('```') // 2)

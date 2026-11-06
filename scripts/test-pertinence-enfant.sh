#!/bin/bash
# Test de pertinence : la question sensible de l'enfant (tromperie de la mère par le père)
# doit produire une histoire ancrée sur CETTE préoccupation, pas une histoire générique.
set -e
B=http://localhost:3000

echo "══ Mode Enfant — question sensible : tromperie de la mère par le père ══"
curl -s --max-time 110 -N -X POST $B/api/ask \
  -H 'Content-Type: application/json' \
  -d '{"question":"Pourquoi mon papa a trompé maman ? Pourquoi les parents mentent ?","mode":"enfant"}' \
  | python3 -c "
import json, sys
histoire = ''
parabole = None
for ligne in sys.stdin:
    ligne = ligne.strip()
    if ligne.startswith('data: '):
        try:
            d = json.loads(ligne[6:])
        except Exception:
            continue
        ev = d.get('event', '')
        if 'chunk' in d:
            histoire += d['chunk']
        if d.get('code'):
            parabole = d
print('PARABOLE choisie :', parabole['code'] if parabole else '—', '(', parabole['culture'] if parabole else '', ')')
if parabole:
    print('  score:', parabole.get('score'), '| sous-seuil:', parabole.get('sousSeuil'))
print()
print('HISTOIRE GÉNÉRÉE :')
print(histoire)
print()
mots = ['mensonge', 'mente', 'tromp', 'vér', 'confiance', 'vérité', 'parler', 'amour', ' Parents', 'papa', 'maman', 'famille']
trouves = [m for m in mots if m.lower() in histoire.lower()]
print('Mots en écho avec la préoccupation trouvés dans l\'histoire:', trouves if trouves else 'AUCUN ⚠')
"

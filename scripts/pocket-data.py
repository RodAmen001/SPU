#!/usr/bin/env python3
# SPU Pocket v1.3 — régénération du corpus embarqué depuis les sources du WebSPU
# (src/data/corpus-{adulte,enfant}.json — la MÊME base que le serveur : 100 textes).
import json

RACINE = '/home/z/my-project'
adulte = json.load(open(f'{RACINE}/src/data/corpus-adulte.json'))
enfant = json.load(open(f'{RACINE}/src/data/corpus-enfant.json'))

data = {
    'meta': {'version': '6.1.0', 'total': len(adulte) + len(enfant)},
    'adulte': adulte,
    'enfant': enfant,
}
js = (
    '// Généré automatiquement depuis src/data/corpus-{adulte,enfant}.json (SPU v6.1)\n'
    '// 100 textes sourcés : 75 paraboles adultes + 25 contes enfants — MÊME base que le WebSPU.\n'
    'const SPU_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
)
with open(f'{RACINE}/apk-spu/assets/spu/data.js', 'w', encoding='utf-8') as f:
    f.write(js)
print(f'data.js régénéré : {len(adulte)} adultes + {len(enfant)} enfants = {len(adulte)+len(enfant)} textes, {len(js)//1024} Ko')

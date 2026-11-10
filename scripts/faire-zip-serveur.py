#!/usr/bin/env python3
# Construit le zip de distribution du serveur SPU (source déployable, sans secrets).
import zipfile, subprocess, pathlib

RACINE = pathlib.Path('/home/z/my-project')
SORTIE = RACINE / 'telechargements' / 'spu-serveur-v4.4.zip'

INCLUS = [
    'src', 'public', 'package.json', 'bun.lock', 'next.config.ts',
    'tailwind.config.ts', 'tsconfig.json', 'postcss.config.mjs',
    'components.json', 'eslint.config.mjs', 'README.md', '.env.example',
    'prisma/schema.prisma',
    'scripts/seed.ts', 'scripts/demonise.py', 'scripts/gardien-serveur.sh',
    'scripts/build-standalone.js', 'scripts/LISEZ-MOI-SERVEUR.txt',
]

fichiers = []
for item in INCLUS:
    p = RACINE / item
    if p.is_dir():
        for f in sorted(p.rglob('*')):
            if f.is_file() and '.next' not in f.parts and 'node_modules' not in f.parts:
                fichiers.append(f)
    elif p.is_file():
        fichiers.append(p)

with zipfile.ZipFile(SORTIE, 'w', zipfile.ZIP_DEFLATED) as z:
    for f in fichiers:
        z.write(f, 'spu-serveur/' + str(f.relative_to(RACINE)))
print(f'zip : {SORTIE} — {SORTIE.stat().st_size // 1024} Ko — {len(fichiers)} fichiers')
# contrôle : aucun secret ne doit y figurer
noms = zipfile.ZipFile(SORTIE).namelist()
sensibles = [n for n in noms if '.env' in n and '.example' not in n or 'custom.db' in n or 'dev.db' in n]
print('fichiers sensibles dans le zip :', sensibles or 'aucun ✓')

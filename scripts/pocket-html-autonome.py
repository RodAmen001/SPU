#!/usr/bin/env python3
# SPU Pocket 1.3 — version AUTONOME en un seul fichier HTML :
# style.css + data.js + app.js sont incorporés → ouvrable dans n'importe quel
# navigateur (Windows, Mac, Linux, Android), sans serveur, sans installation.
import re, pathlib

RACINE = pathlib.Path('/home/z/my-project')
A = RACINE / 'apk-spu/assets/spu'
SORTIE = RACINE / 'download/SPU-Pocket-1.3.0.html'
SORTIE.parent.mkdir(parents=True, exist_ok=True)

html = (A / 'index.html').read_text(encoding='utf-8')
css = (A / 'style.css').read_text(encoding='utf-8')
data = (A / 'data.js').read_text(encoding='utf-8')
app = (A / 'app.js').read_text(encoding='utf-8')

html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="data.js"></script>', '<script>\n' + data + '\n</script>')
html = html.replace('<script src="app.js"></script>', '<script>\n' + app + '\n</script>')
# une entrée hors ligne ne doit tenter aucune ressource externe au démarrage
html = html.replace('<title>SPU Pocket — Système Parabolique Universel</title>',
                    '<title>SPU Pocket 1.3.0 — Système Parabolique Universel (autonome)</title>')

SORTIE.write_text(html, encoding='utf-8')
print(f'✅ {SORTIE} — {SORTIE.stat().st_size // 1024} Ko (style + 100 textes + app incorporés)')

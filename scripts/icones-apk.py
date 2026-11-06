#!/usr/bin/env python3
"""Génère les icônes launcher de SPU Pocket (parabole dorée sur bleu nuit)."""
from PIL import Image, ImageDraw, ImageFont
import os

TAILLES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
base = '/home/z/my-project/apk-spu/res'

def dessiner(taille):
    img = Image.new('RGB', (taille, taille), (12, 17, 36))
    d = ImageDraw.Draw(img)
    s = taille / 192.0
    # dégradé radial approximé (cercles concentriques)
    for i in range(int(taille * 0.5), 0, -2):
        t = i / (taille * 0.5)
        r = int(12 + t * 15); g = int(17 + t * 19); b = int(36 + t * 43)
        d.ellipse([taille/2 - i, taille*0.40 - i, taille/2 + i, taille*0.40 + i], fill=(r, g, b))
    # anneau doré
    m = 8 * s
    d.ellipse([m, m, taille - m, taille - m], outline=(201, 153, 46), width=max(2, int(2.5 * s)))
    # arc parabolique
    x0, x1 = 30 * s, 162 * s
    sommet = 34 * s; base_y = 112 * s
    pts = []
    for i in range(0, 101):
        t = i / 100
        x = x0 + (x1 - x0) * t
        y = base_y - (1 - (2 * t - 1) ** 2) * (base_y - sommet)
        pts.append((x, y))
    d.line(pts, fill=(240, 214, 138), width=max(3, int(4.5 * s)), joint='curve')
    # antenne + foyer
    d.line([96 * s, 66 * s, 96 * s, 96 * s], fill=(240, 214, 138), width=max(2, int(3 * s)))
    r_f = 7 * s
    d.ellipse([96 * s - r_f, 104 * s - r_f, 96 * s + r_f, 104 * s + r_f], fill=(217, 180, 91))
    # onde au sol
    d.arc([40 * s, 96 * s, 152 * s, 150 * s], 20, 160, fill=(232, 217, 160), width=max(2, int(2.5 * s)))
    # lettres SPU
    try:
        f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(30 * s))
    except Exception:
        f = ImageFont.load_default()
    txt = 'SPU'
    boite = d.textbbox((0, 0), txt, font=f)
    w = boite[2] - boite[0]; h = boite[3] - boite[1]
    d.text((96 * s - w / 2, 148 * s - h / 2), txt, font=f, fill=(240, 214, 138))
    return img

for dossier, taille in TAILLES.items():
    dossier_complet = f'{base}/mipmap-{dossier}'
    os.makedirs(dossier_complet, exist_ok=True)
    img = dessiner(taille)
    img.save(f'{dossier_complet}/ic_launcher.png', optimize=True)
    print(f'mipmap-{dossier}/ic_launcher.png ({taille}px)')
print('Icônes générées.')

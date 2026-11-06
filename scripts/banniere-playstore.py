#!/usr/bin/env python3
"""Bannière Play Store 1024x500 (feature graphic) de SPU Pocket."""
from PIL import Image, ImageDraw, ImageFont
W, H = 1024, 500
img = Image.new('RGB', (W, H), (12, 17, 36))
d = ImageDraw.Draw(img)
for y in range(H):
    t = y / H
    r = int(12 + t * 8); g = int(17 + t * 12); b = int(36 + t * 28)
    d.line([(0, y), (W, y)], fill=(r, g, b))
# halo doré derrière le logo
halo = Image.new('L', (W, H), 0)
dh = ImageDraw.Draw(halo)
dh.ellipse([70, 90, 350, 370], fill=55)
img.paste(Image.new('RGB', (W, H), (217, 180, 91)), (0, 0), halo)
d = ImageDraw.Draw(img)
# logo : cercle + parabole
cx, cy, R = 210, 250, 115
d.ellipse([cx-R, cy-R, cx+R, cy+R], fill=(18, 26, 60), outline=(201, 153, 46), width=4)
pts = []
for i in range(0, 101):
    t = i / 100
    x = cx - 72 + 144 * t
    y = cy + 42 - (1 - (2*t - 1)**2) * 88
    pts.append((x, y))
d.line(pts, fill=(240, 214, 138), width=9, joint='curve')
d.line([cx, cy - 30, cx, cy + 2], fill=(240, 214, 138), width=5)
rf = 13
d.ellipse([cx-rf, cy+16-rf, cx+rf, cy+16+rf], fill=(217, 180, 91))
d.arc([cx-78, cy+18, cx+78, cy+80], 20, 160, fill=(232, 217, 160), width=4)
# textes
f_titre = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 64)
f_sous = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 30)
f_badge = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
def centre(draw, x0, x1, y, txt, font, fill):
    b = draw.textbbox((0, 0), txt, font=font)
    draw.text(((x0+x1)/2 - (b[2]-b[0])/2, y), txt, font=font, fill=fill)
centre(d, 400, W, 150, 'SPU Pocket', f_titre, (240, 214, 138))
centre(d, 400, W, 250, 'Paraboles & histoires pour grandir', f_sous, (236, 231, 212))
centre(d, 400, W, 330, '65 textes · Hors ligne · À voix haute', f_badge, (168, 176, 208))
d.rectangle([0, H-8, W, H], fill=(201, 153, 46))
img.save('/home/z/my-project/download/fiche-playstore/banniere-1024x500.png', optimize=True)
print('banniere-1024x500.png OK')

titre = 'SPU Pocket — Paraboles & vie'
courte = '65 paraboles et fables avec leurs leçons. Hors ligne, à voix haute, pour tous.'
print('titre:', len(titre), '/30  |  courte:', len(courte), '/80')

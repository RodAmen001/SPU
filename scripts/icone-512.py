#!/usr/bin/env python3
"""Icône Play Store 512x512 de SPU Pocket (même style que le lanceur)."""
from PIL import Image, ImageDraw

S = 512
img = Image.new('RGB', (S, S), (12, 17, 36))
d = ImageDraw.Draw(img)

# fond radial simple
for y in range(S):
    t = y / S
    d.line([(0, y), (S, y)], fill=(int(12 + t * 10), int(17 + t * 15), int(36 + t * 34)))

# halo doré
halo = Image.new('L', (S, S), 0)
dh = ImageDraw.Draw(halo)
dh.ellipse([80, 60, 432, 412], fill=50)
img.paste(Image.new('RGB', (S, S), (217, 180, 91)), (0, 0), halo)
d = ImageDraw.Draw(img)

# cercle + parabole dorée + foyer + onde
cx, cy, R = 256, 256, 190
d.ellipse([cx-R, cy-R, cx+R, cy+R], fill=(18, 26, 60), outline=(201, 153, 46), width=7)
pts = []
for i in range(0, 201):
    t = i / 200
    x = cx - 118 + 236 * t
    y = cy + 70 - (1 - (2*t - 1)**2) * 145
    pts.append((x, y))
d.line(pts, fill=(240, 214, 138), width=15, joint='curve')
d.line([cx, cy - 52, cx, cy + 10], fill=(240, 214, 138), width=9)
rf = 22
d.ellipse([cx-rf, cy+42-rf, cx+rf, cy+42+rf], fill=(217, 180, 91))
d.arc([cx-128, cy+44, cx+128, cy+160], 20, 160, fill=(232, 217, 160), width=7)

# lettres SPU discrètes en bas
try:
    from PIL import ImageFont
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 58)
    b = d.textbbox((0, 0), 'SPU', font=f)
    d.text((cx - (b[2]-b[0])/2, cy + 128), 'SPU', font=f, fill=(217, 180, 91))
except Exception:
    pass

img.save('/home/z/my-project/download/fiche-playstore/icone-512.png', optimize=True)
print('icone-512.png OK')

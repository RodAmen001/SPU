# Post-traitement docx : commutateurs de format PAGE par section + nettoyage pgNumType.
# Section 1 (couverture) : sans pied de page. Section 2 (TDM) : PAGE \* ROMAN.
# Section 3 (corps) : PAGE \* arabic. Voir skill docx — references/toc.md.
import re, sys, shutil, zipfile, tempfile, os

chemin = sys.argv[1]

with zipfile.ZipFile(chemin) as z:
    noms = z.namelist()
    document = z.read("word/document.xml").decode("utf-8")
    rels = z.read("word/_rels/document.xml.rels").decode("utf-8")
    contenus = {n: z.read(n) for n in noms}

# 1) Carte rId -> cible de pied de page
carte = dict(re.findall(r'<Relationship[^>]*Id="([^"]+)"[^>]*Target="(footer\d+\.xml)"', rels))
carte.update(dict(re.findall(r'<Relationship[^>]*Target="(footer\d+\.xml)"[^>]*Id="([^"]+)"', rels)))

# 2) Pieds de page référencés, dans l'ordre des sections du document
refs = re.findall(r'<w:footerReference[^>]*w:type="default"[^>]*r:id="([^"]+)"', document)
if not refs:
    refs = re.findall(r'<w:footerReference[^>]*r:id="([^"]+)"[^>]*w:type="default"', document)
cibles = [carte.get(r) for r in refs if carte.get(r)]
print("Pieds de page par section (ordre) :", list(zip(refs, cibles)))

formats = ["ROMAN", "arabic"]  # section TDM, puis corps
def patch_footer(xml, fmt):
    return re.sub(
        r'(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)',
        lambda m: m.group(1) + f' PAGE \\* {fmt} \\* MERGEFORMAT ' + m.group(2),
        xml,
    )

for i, nom in enumerate(cibles[:2]):
    cle = "word/" + nom
    xml = contenus[cle].decode("utf-8")
    nouveau = patch_footer(xml, formats[i])
    if nouveau != xml:
        contenus[cle] = nouveau.encode("utf-8")
        print(f"  {nom} : PAGE -> \\* {formats[i]}")
    else:
        print(f"  {nom} : aucun champ PAGE nu trouvé (déjà formaté ?)")

# 3) Suppression des pgNumType vides (artefact docx-js, gêne WPS)
avant = document.count("<w:pgNumType/>")
document = document.replace("<w:pgNumType/>", "")
print(f"pgNumType vides supprimés : {avant}")
contenus["word/document.xml"] = document.encode("utf-8")

# 4) Réécriture de l'archive
tmp = tempfile.mktemp(suffix=".docx")
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    for n in noms:
        z.writestr(n, contenus[n])
shutil.move(tmp, chemin)
print("Post-traitement terminé :", chemin)

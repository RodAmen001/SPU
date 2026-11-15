# Correction de la TDM : la première entrée (hyperlien _Toc1) a un champ PAGEREF
# sans résultat en cache et un paragraphe dupliqué en texte simple. On injecte le
# numéro en cache dans le champ PAGEREF et on supprime le paragraphe en double.
import sys, shutil, zipfile, tempfile

chemin = sys.argv[1]

with zipfile.ZipFile(chemin) as z:
    noms = z.namelist()
    contenus = {n: z.read(n) for n in noms}

doc = contenus["word/document.xml"].decode("utf-8")

# 1) Champ PAGEREF de la première entrée : séparer les fldChar en runs valides
#    et fournir un résultat en cache (« 1 »).
avant1 = '<w:instrText xml:space="preserve">PAGEREF _Toc1 \\h</w:instrText><w:fldChar w:fldCharType="separate"/><w:fldChar w:fldCharType="end"/>'
apres1 = ('<w:instrText xml:space="preserve">PAGEREF _Toc1 \\h</w:instrText>'
          '<w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r>'
          '<w:r><w:fldChar w:fldCharType="end"/>')
assert avant1 in doc, "motif PAGEREF _Toc1 introuvable"
doc = doc.replace(avant1, apres1, 1)

# 2) Suppression du paragraphe dupliqué (texte simple + page)
doublon = ('<w:p><w:pPr><w:pStyle w:val="TOC1"/><w:tabs><w:tab w:val="right" '
           'w:leader="dot" w:pos="9026"/></w:tabs><w:spacing w:before="120" w:after="60"/></w:pPr>'
           '<w:r><w:t>1. Synthèse du bilan</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>1</w:t></w:r></w:p>')
assert doublon in doc, "paragraphe dupliqué introuvable"
doc = doc.replace(doublon, "", 1)

contenus["word/document.xml"] = doc.encode("utf-8")

tmp = tempfile.mktemp(suffix=".docx")
with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
    for n in noms:
        z.writestr(n, contenus[n])
shutil.move(tmp, chemin)
print("TDM corrigée : numéro en cache injecté, doublon supprimé.")

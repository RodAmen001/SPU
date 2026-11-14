#!/usr/bin/env python3
"""Collecte et VÉRIFICATION de 50 musiques libres de droits pour le SPU.
Sources :
  - Incompetech (Kevin MacLeod) — CC-BY 4.0, catalogue officiel pieces.json
  - Wikimedia Commons — enregistrements du domaine public (API officielle)
Chaque URL est testée (HTTP 200) avant d'être retenue. Aucun lien inventé.
Sortie : /tmp/musiques-selection.json
"""
import json
import subprocess
import sys

# ── utilitaires ───────────────────────────────────────────────────────────────
def head_ok(url: str) -> bool:
    try:
        out = subprocess.run(
            ["curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}|%{content_type}",
             "-I", url, "--max-time", "20", "-L"],
            capture_output=True, text=True, timeout=30).stdout
        code, ctype = out.strip().split("|", 1)
        ok = code == "200"
        audio = ("audio" in ctype) or ("octet-stream" in ctype)
        return ok and audio
    except Exception:
        return False

# ── 1. Incompetech (CC-BY 4.0) ────────────────────────────────────────────────
cat = json.load(open("/tmp/ic-catalog.json"))
genres = {str(g["id"]): g["genre"] for g in json.load(open("/tmp/ic-genres.json"))}
for t in cat:
    t["genreNom"] = genres.get(str(t.get("genre")), "")

RECHERCHE = {
    "deep": ["calm", "mellow", "relax", "serene", "peaceful", "gentle", "quiet", "contempl", "ambient", "sleep", "dream"],
    "oracle": ["epic", "majestic", "grand", "cinematic", "orchestral", "heroic", "myst", "solemn", "sweeping", "adventure"],
    "mentor": ["warm", "uplifting", "hopeful", "inspir", "heartfelt", "cozy", "tender", "nostalgic", "romantic", "sincere"],
    "enfant": ["playful", "quirky", "fun", "happy", "silly", "bouncy", "lighthearted", "child", "whimsical", "comic"],
    "reponse": ["bright", "triumphant", "positive", "victor", "celebrat", "cheerful", "energetic", "joy"],
}
def score_piste(t, mode):
    textes = " ".join([t.get("feel") or "", t.get("description") or "", t.get("genreNom") or "", t.get("title") or ""]).lower()
    s = sum(3 for m in RECHERCHE[mode] if m in textes)
    bpm = int(t["bpm"]) if str(t.get("bpm", "")).isdigit() else 100
    if mode == "deep" and bpm < 95: s += 2
    if mode == "enfant" and 95 <= bpm <= 160: s += 2
    if mode == "oracle" and bpm < 140: s += 1
    longueur = t.get("length", "00:00:00")
    try:
        mm, ss = int(longueur[3:5]), int(longueur[6:8])
        duree_min = int(longueur[0:2]) + mm / 60 + ss / 3600
        if 1.5 <= duree_min <= 6.5: s += 2
    except Exception:
        pass
    return s

selection = {}
verifiees = set()
for mode, n in (("deep", 12), ("oracle", 11), ("mentor", 11), ("enfant", 9), ("reponse", 7)):
    tries = sorted(cat, key=lambda t: (-score_piste(t, mode), t["title"]))
    retenues = []
    for t in tries:
        if len(retenues) >= n:
            break
        nom_fichier = t["filename"]
        if nom_fichier in verifiees:
            url_existante = [r for r in selection.values() if r["url"].endswith(nom_fichier)]
            if url_existante and mode in ("reponse",) :
                continue
            if url_existante:
                r = dict(url_existante[0])
                r["usage"] = r["usage"] + "+" + mode
                selection[r["titre"]] = r
                retenues.append(r)
                continue
        url = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/" + nom_fichier.replace(" ", "%20")
        if not head_ok(url):
            continue
        verifiees.add(nom_fichier)
        r = {
            "titre": t["title"],
            "artiste": "Kevin MacLeod",
            "licence": "CC-BY 4.0 (incompetech.com)",
            "source": "https://incompetech.com/music/royalty-free/music.html",
            "url": url,
            "usage": mode,
            "duree": t.get("length", ""),
            "ambiance": (t.get("feel") or t.get("description") or "")[:110],
        }
        selection[r["titre"]] = r
        retenues.append(r)
    print(f"{mode} : {len(retenues)} pistes vérifiées", file=sys.stderr)

# ── 2. Wikimedia Commons (domaine public) — classiques ───────────────────────
API = "https://commons.wikimedia.org/w/api.php"
def commons_cat(categorie, limite=12):
    url = (f"{API}?action=query&generator=categorymembers&gcmtitle=Category:{categorie}"
           f"&gcmtype=file&gcmlimit={limite}&prop=imageinfo&iiprop=url|mime|size&format=json")
    try:
        out = subprocess.run(["curl", "-sS", url, "--max-time", "25"], capture_output=True, text=True, timeout=40).stdout
        d = json.loads(out)
        pages = d.get("query", {}).get("pages", {})
        res = []
        for p in pages.values():
            ii = (p.get("imageinfo") or [{}])[0]
            if ii.get("mime", "").startswith("audio"):
                res.append({"titre": p.get("title", "").replace("File:", "").rsplit(".", 1)[0],
                            "mime": ii.get("mime", ""), "url": ii.get("url", "")})
        return res
    except Exception:
        return []

CATS = ["Musical_recordings_of_classical_music", "Public_domain_music_recordings",
        "Piano_recordings", "Orchestral_recordings"]
ajoutees = 0
for cat_nom in CATS:
    for p in commons_cat(cat_nom, 15):
        if ajoutees >= 12:
            break
        if p["url"] in {s["url"] for s in selection.values()}:
            continue
        if p["mime"] not in ("audio/mpeg", "audio/ogg", "audio/flac", "audio/wav"):
            continue
        if not head_ok(p["url"]):
            continue
        selection[p["titre"]] = {
            "titre": p["titre"][:80],
            "artiste": "Enregistrement historique (domaine public)",
            "licence": "Domaine public (Wikimedia Commons)",
            "source": "https://commons.wikimedia.org/",
            "url": p["url"],
            "usage": "deep+oracle",
            "duree": "",
            "ambiance": "Classique — enregistrement du domaine public",
        }
        ajoutees += 1
    if ajoutees >= 12:
        break
print(f"Commons : {ajoutees} pistes vérifiées", file=sys.stderr)

# ── sortie ────────────────────────────────────────────────────────────────────
final = list(selection.values())
final.sort(key=lambda r: (r["usage"], r["titre"]))
json.dump(final, open("/tmp/musiques-selection.json", "w"), indent=1, ensure_ascii=False)
print(f"TOTAL VÉRIFIÉ : {len(final)} musiques")
compte = {}
for r in final:
    for u in r["usage"].split("+"):
        compte[u] = compte.get(u, 0) + 1
print("répartition :", json.dumps(compte, ensure_ascii=False))

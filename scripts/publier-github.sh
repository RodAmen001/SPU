#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  Publication du SPU sur GitHub : dépôt + push + release + pages
#  Usage : TOKEN_GITHUB=ghp_xxxx bash scripts/publier-github.sh
#  Le token n'est jamais écrit dans un fichier ni dans le dépôt ;
#  il ne vit que le temps de l'exécution (variable d'environnement).
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
: "${TOKEN_GITHUB:?Définir TOKEN_GITHUB (Personal Access Token, scope repo)}"
COMPTE=Rodamen001
DEPOT=SPU
API=https://api.github.com
AUTH="Authorization: token $TOKEN_GITHUB"
BRANCHE=main

echo "── 1/4 Création du dépôt $COMPTE/$DEPOT (si absent)"
CODE=$(curl -s -o /tmp/gh-repo.json -w "%{http_code}" -H "$AUTH" "$API/repos/$COMPTE/$DEPOT")
if [ "$CODE" = "404" ]; then
  curl -s -X POST -H "$AUTH" "$API/user/repos" \
    -d '{"name":"SPU","description":"SPU — Système Parabolique Universel : orchestrateur narratif multi-IA + SPU Pocket (Android). Un mentor, pas un maître.","private":false,"has_issues":true,"has_wiki":false}' >/dev/null
  echo "   dépôt créé ✓"
else
  echo "   dépôt déjà existant ✓ (HTTP $CODE)"
fi

echo "── 2/4 Push de la branche $BRANCHE"
git -C /home/z/my-project push \
  "https://x-access-token:$TOKEN_GITHUB@github.com/$COMPTE/$DEPOT.git" \
  "$BRANCHE" 2>&1 | sed "s/$TOKEN_GITHUB/***TOKEN***/g"

echo "── 3/4 Release v1.2.0 (assets officiels)"
REL_CODE=$(curl -s -o /tmp/gh-rel.json -w "%{http_code}" -H "$AUTH" \
  "$API/repos/$COMPTE/$DEPOT/releases/tags/v1.2.0")
if [ "$REL_CODE" = "404" ]; then
  curl -s -X POST -H "$AUTH" "$API/repos/$COMPTE/$DEPOT/releases" \
    -d '{"tag_name":"v1.2.0","target_commitish":"main","name":"SPU Pocket v1.2.0 — mode nomade","body":"Première distribution publique.\n\n**Nouveautés v1.2** : écran « Poser une question » sans serveur (mode nomade) + bibliothèque hors-ligne des 65 paraboles.\n\n- `spu-pocket-v1.2.0.apk` — application Android (62 Ko, Android 7+)\n- `spu-pocket-v1.2.0.aab` — format Google Play\n- `kit-spu-pocket-v1.2.zip` — kit complet : APK + AAB + clé de signature + guides + livre blanc\n\nGuide d'\''installation : `docs/INSTALLER-SPU-POCKET.txt` — page de téléchargement : https://rodamen001.github.io/SPU/"}' \
    > /tmp/gh-rel.json
  echo "   release créée ✓"
else
  echo "   release déjà existante ✓"
fi
REL_ID=$(python3 -c "import json;print(json.load(open('/tmp/gh-rel.json'))['id'])")

UPLOADER() {  # UPLOADER fichier nom
  local f="$1" n="$2" ct="application/octet-stream"
  case "$n" in
    *.apk) ct="application/vnd.android.package-archive" ;;
    *.zip) ct="application/zip" ;;
  esac
  local c=$(curl -s -o /tmp/gh-up.json -w "%{http_code}" -H "$AUTH" \
    -H "Content-Type: $ct" --data-binary "@$f" \
    "https://uploads.github.com/repos/$COMPTE/$DEPOT/releases/$REL_ID/assets?name=$n")
  if [ "$c" = "201" ]; then echo "   asset publié : $n"
  else echo "   asset $n : HTTP $c (422 = déjà présent, ce n'est pas grave)"; fi
}
UPLOADER /home/z/my-project/download/spu-pocket-v1.2.0.apk spu-pocket-v1.2.0.apk
UPLOADER /home/z/my-project/download/spu-pocket-v1.2.0.aab spu-pocket-v1.2.0.aab
UPLOADER /home/z/my-project/download/kit-spu-pocket-v1.2.zip kit-spu-pocket-v1.2.zip

echo "── 4/4 GitHub Pages (page de téléchargement)"
PAGES_CODE=$(curl -s -o /tmp/gh-pages.json -w "%{http_code}" -X POST -H "$AUTH" \
  "$API/repos/$COMPTE/$DEPOT/pages" \
  -d '{"source":{"branch":"main","path":"/docs"}}')
echo "   Pages : HTTP $PAGES_CODE (201 = activée, 409 = déjà activée)"

echo
echo "✅ Publication terminée"
echo "   Dépôt   : https://github.com/$COMPTE/$DEPOT"
echo "   APK     : https://github.com/$COMPTE/$DEPOT/raw/main/telechargements/spu-pocket-v1.2.0.apk"
echo "   Release : https://github.com/$COMPTE/$DEPOT/releases/tag/v1.2.0"
echo "   Page    : https://$COMPTE.github.io/$DEPOT/ (prête dans ~2 minutes)"

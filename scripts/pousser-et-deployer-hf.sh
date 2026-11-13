#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# SPU — Déploiement complet : GitHub → Hugging Face Space (Docker, public)
#
# Usage :
#   TOKEN_GITHUB=ghp_xxx \
#   HF_USER=mon-compte-hf HF_TOKEN=hf_xxx ESPACE=spu-test \
#   bash scripts/pousser-et-deployer-hf.sh
#
# Avec les deux jetons, tout est fait automatiquement :
#   1. Push du dépôt vers GitHub (main)
#   2. Création du Space HF public (SDK docker) si absent
#   3. Variable GitHub HF_SPACE_ID + secret GitHub HF_TOKEN (API, chiffré)
#   4. Déclenchement du workflow deploy-huggingface.yml
#
# Sans jetons HF, seuls le push GitHub et la préparation sont faits.
# Les jetons ne sont jamais écrits dans un fichier ni affichés.
# ═════════════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."

: "${TOKEN_GITHUB:?Définir TOKEN_GITHUB (PAT GitHub, scope repo + administration)}"
HF_USER="${HF_USER:-}"
HF_TOKEN="${HF_TOKEN:-}"
ESPACE="${ESPACE:-spu-test}"
COMPTE="RodAmen001"
DEPOT="SPU"
masque() {
  local args=(-E -e "s/$(printf '%s' "$TOKEN_GITHUB" | sed 's/[&/\]/\\&/g')/***TOKEN***/g")
  if [ -n "$HF_TOKEN" ]; then
    args+=(-e "s/$(printf '%s' "$HF_TOKEN" | sed 's/[&/\]/\\&/g')/***HF***/g")
  fi
  sed "${args[@]}"
}

echo "── 1/4 · Push vers GitHub ($COMPTE/$DEPOT, main) ─────────────────────────"
git push "https://x-access-token:$TOKEN_GITHUB@github.com/$COMPTE/$DEPOT.git" \
  HEAD:main 2>&1 | masque

if [ -z "$HF_USER" ] || [ -z "$HF_TOKEN" ]; then
  echo ""
  echo "── Push GitHub terminé (commit $(git rev-parse --short HEAD)) ──"
  echo "Jetons HF absents : Space non créé, variables GitHub non posées."
  echo "Relancez avec HF_USER=… HF_TOKEN=… (jeton WRITE Hugging Face)."
  exit 0
fi

SPACE_ID="$HF_USER/$ESPACE"
echo "── 2/4 · Space Hugging Face $SPACE_ID (docker, public) ───────────────────"
python3 - "$HF_USER" "$HF_TOKEN" "$ESPACE" <<'PY' | masque
import sys
from huggingface_hub import HfApi
user, token, espace = sys.argv[1], sys.argv[2], sys.argv[3]
api = HfApi(token=token)
url = api.create_repo(repo_id=f"{user}/{espace}", repo_type="space",
                      space_sdk="docker", private=False, exist_ok=True)
print(f"Space prêt : {url}")
PY

echo "── 3/4 · Variable HF_SPACE_ID + secret HF_TOKEN sur GitHub ───────────────"
API="https://api.github.com/repos/$COMPTE/$DEPOT"
H="Authorization: token $TOKEN_GITHUB"
HCT="Content-Type: application/json"
code_var=$(curl -sS -o /tmp/var.out -w "%{http_code}" -X POST "$API/actions/variables" \
  -H "$H" -H "$HCT" -d "{\"name\":\"HF_SPACE_ID\",\"value\":\"$SPACE_ID\"}")
if [ "$code_var" != "201" ]; then
  code_upd=$(curl -sS -o /tmp/var.out -w "%{http_code}" -X PUT \
    "$API/actions/variables/HF_SPACE_ID" -H "$H" -H "$HCT" \
    -d "{\"name\":\"HF_SPACE_ID\",\"value\":\"$SPACE_ID\"}")
  echo "variable HF_SPACE_ID : HTTP $code_var puis maj $code_upd"
else
  echo "variable HF_SPACE_ID créée : $SPACE_ID"
fi
curl -sS "$API/actions/secrets/public-key" -H "$H" -o /tmp/pk.json
python3 - "$HF_TOKEN" <<'PY'
import sys, json, base64
from nacl import public
token = sys.argv[1]
pk = json.load(open("/tmp/pk.json"))
cle = public.PublicKey(pk["key"].encode(), public.Encoding.Base64())
chiffre = public.SealedBox(cle).encrypt(token.encode())
json.dump({"encrypted_value": base64.b64encode(chiffre).decode(),
           "key_id": pk["key_id"]}, open("/tmp/secret.json", "w"))
PY
code_sec=$(curl -sS -o /tmp/sec.out -w "%{http_code}" -X PUT \
  "$API/actions/secrets/HF_TOKEN" -H "$H" -H "$HCT" \
  -d @/tmp/secret.json)
echo "secret HF_TOKEN : HTTP $code_sec"
rm -f /tmp/secret.json /tmp/pk.json /tmp/var.out /tmp/sec.out

echo "── 4/4 · Déclenchement du workflow deploy-huggingface.yml ────────────────"
code_wf=$(curl -sS -o /tmp/wf.out -w "%{http_code}" -X POST \
  "$API/actions/workflows/deploy-huggingface.yml/dispatches" \
  -H "$H" -H "$HCT" -d '{"ref":"main"}')
echo "workflow_dispatch : HTTP $code_wf (204 = déclenché)"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Space   : https://huggingface.co/spaces/$SPACE_ID"
echo "║  En direct : https://$(echo "$HF_USER" | tr '[:upper:]' '[:lower:]')-$ESPACE.hf.space"
echo "║  (build Docker ~5-10 min ; ensuite auto à chaque push main)  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

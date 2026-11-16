#!/usr/bin/env python3
# v6.0 — Envoi des voix Piper dans le CLOUD Hugging Face du concepteur
# (compte Rodamen, dépôt spu-voix) : les modèles deviennent téléchargeables à
# la demande par l'hébergement (Render) et par les installations locales.
import os
from huggingface_hub import HfApi

HF_USER = os.environ.get('HF_USER', 'Rodamen')
HF_TOKEN = os.environ['HF_TOKEN']  # fourni par l'environnement, jamais affiché
REPO = f'{HF_USER}/spu-voix'
DIR = '/home/z/my-project/voix-piper/modeles'
PIPER_BIN_DIR = '/home/z/my-project/voix-piper/piper'

api = HfApi(token=HF_TOKEN)
api.create_repo(repo_id=REPO, repo_type='model', exist_ok=True, private=False)

FICHIERS = [
    'fr_FR-tom-medium.onnx', 'fr_FR-tom-medium.onnx.json',
    'fr_FR-siwis-medium.onnx', 'fr_FR-siwis-medium.onnx.json',
    'fr_FR-upmc-medium.onnx', 'fr_FR-upmc-medium.onnx.json',
    'fr_FR-gilles-low.onnx', 'fr_FR-gilles-low.onnx.json',
    'fr_FR-mls-medium.onnx', 'fr_FR-mls-medium.onnx.json',
]

for f in FICHIERS:
    chemin = os.path.join(DIR, f)
    print(f'→ envoi {f} ({os.path.getsize(chemin)//1024//1024} Mo)', flush=True)
    api.upload_file(
        path_or_fileobj=chemin,
        path_in_repo=f,
        repo_id=REPO,
        repo_type='model',
        commit_message=f'voix Piper {f} — 12 timbres SPU v6.0',
    )
print('✅ Voix envoyées dans le cloud :', REPO, flush=True)

# Sauvegarde du bac à sable SPU — le lieu sûr est GitHub (PAS le bac à sable ZAI)

## Pourquoi ce document

Le bac à sable d'exécution peut être **recyclé entre deux messages** : le disque
local est restauré depuis un instantané qui peut être ANCIEN (cela est déjà
arrivé — la v6.2 a disparu du disque pendant qu'elle tournait en production).
La seule source de vérité durable est le **dépôt GitHub `RodAmen001/SPU`**.

## Ce qui est en lieu sûr (GitHub)

| Élément | Où |
| --- | --- |
| Tout le code (WebSPU + scripts + config Docker/Render) | branche `main` |
| Points d'état intangibles par version | tags `sandbox-v6.x` (ex. `sandbox-v6.4`) |
| Corpus 100 paraboles/fables + catalogue musiques | `db-origine/custom.db`, `src/data/*` (dans le dépôt) |
| Voix neuronales (4 modèles français) | Hugging Face `Rodamen/spu-voix` |
| Déploiement production | Render (image Docker construite depuis le dépôt) |

## Ce qui n'est PAS dans le dépôt (jamais)

Les secrets : `TOKEN_GITHUB`, `HF_TOKEN`, `RENDER_TOKEN`, `GROQ_API_KEY`, la
config z.ai. Ils restent entre les mains du concepteur et se redonnent à
l'environnement à chaque relance. Aucune clé ne doit être commitée.

## Restaurer un bac à sable neuf — UNE commande

```bash
export TOKEN_GITHUB=ghp_…
export HF_TOKEN=hf_…
bash scripts/restaurer-sandbox.sh main ~/SPU          # dernier état
bash scripts/restaurer-sandbox.sh sandbox-v6.4 ~/SPU  # l'état exact de ce point
```

Le script clône, installe, régénère Prisma, restaure la base (corpus complet),
installe Piper + les voix, et affiche les variables d'environnement à redonner.

## À la fin de CHAQUE chantier (protocole de l'agent)

1. `git push` du travail sur `main` (déployé automatiquement par Render).
2. `git tag sandbox-v<version> && git push origin sandbox-v<version>`.
3. Vérifier que `git ls-remote` montre bien le nouveau commit — ne JAMAIS
   considérer le disque local comme une preuve de sauvegarde.

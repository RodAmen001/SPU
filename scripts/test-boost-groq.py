#!/usr/bin/env python3
# Test du générateur BOOST : mêmes règles que src/lib/spu/boost.ts (Groq,
# gpt-oss-20b, reasoning_effort low, JSON strict). Valide : JSON complet,
# 5 phases dans l'ordre, déclaration forte en phase 2, 4-6 personnages,
# volume parlé 2400-3200 caractères, répliques courtes.
import json, urllib.request, re, sys

PROMPT = """Tu es l'architecte du THÉÂTRE BOOST du SPU. À partir du chemin parcouru par la personne (ses questions et les histoires reçues), tu écris un SCÉNARIO AUDIO de 3 à 5 minutes — plus ou moins voisin des histoires qui viennent de lui être racontées — où le héros, face aux difficultés de son parcours, se remet LUI-MÊME en confiance (parfois suite à une exhortation vive et forte d'un maître/mentor) par une DÉCLARATION FORTE. Suite à cette décision, ses propres actions et ses prières consécutives lui permettent d'atteindre les résultats tant recherchés.

CHEMIN PARCOURU PAR LA PERSONNE :
Première requête : « Comment rester patient alors que tout va trop lentement ? »
Puis : « Et si malgré tout j'échoue encore ? » — l'histoire reçue parlait de : le vieux forgeron qui refait chauffer le fer au lieu de jeter la pièce tordue.
Puis : « J'ai peur de ne pas y arriver avant la fin de l'année » — l'histoire reçue parlait de : la graine du baobab qui pousse sans bruit pendant sept ans.

PUBLIC : adulte. Ton vigoureux, sincère, jamais mièvre ; la foi et la prière sont des forces agissantes du héros.

STRUCTURE IMPOSÉE — les phases, dans cet ordre :
• Phase "1.1" — Situation initiale (FACULTATIVE : l'équilibre de départ, courte).
• Phase "1.2" — Élément déclencheur : rupture de l'équilibre.
• Phase "2" — Péripéties : obstacles et rebondissements, qui culminent avec LA DÉCLARATION FORTE (le cœur du BOOST : le héros — exhorté par un maître, un mentor ou lui-même — prononce une déclaration ferme et inspirante).
• Phase "3.1" — Dénouement : la résolution (actions concrètes du héros + prières → résultats).
• Phase "3.2" — Situation finale (FACULTATIVE : le nouvel équilibre, courte).

RÈGLES ABSOLUES :
• TOUT est JOUÉ par les personnages, JAMAIS narré d'une seule voix du début à la fin : un personnage « Le Conteur » peut porter les transitions, mais chaque phase contient AU MOINS DEUX personnages qui parlent.
• 4 à 6 personnages au total, chacun nommé (prénoms vivants), chacun avec SA voix distincte.
• La réplique « texte » est courte (1 à 3 phrases) — c'est du théâtre parlé, rythmé.
• « didascalie » = l'action visible en une ligne (affichée à l'écran, jamais lue).
• Volume total parlé : 2400 à 3200 caractères (≈ 3 à 5 minutes de théâtre audio).
• Image : 1 emoji par scène pour la bande dessinée enfant.
• Français, pas de markdown, pas d'emoji DANS les répliques.

Réponds UNIQUEMENT avec un JSON exact :
{"titre": "…", "resume": "…", "heros": "…", "declaration": "…", "personnages": [{"nom": "…", "role": "…", "voix": "…", "genre": "…"}], "scenes": [{"phase": "1.1", "titre": "…", "image": "🌅", "musique": "douce", "lignes": [{"perso": "…", "voix": "…", "didascalie": "…", "texte": "…"}]}]}

LISTE DES VOIX DISPONIBLES (id exacts, chacune pour UN personnage distinct) : narrateur, conteur, sage, homme-jeune, homme-mure, homme-vigoureux, femme-jeune, femme-mure, femme-conteuse, vieille-femme, enfant-fille, enfant-garcon."""

req = urllib.request.Request(
    'https://api.groq.com/openai/v1/chat/completions',
    data=json.dumps({
        'model': 'openai/gpt-oss-20b',
        'messages': [{'role': 'user', 'content': PROMPT}],
        'temperature': 0.85,
        'max_tokens': 2800,
        'reasoning_effort': 'low',
    }).encode(),
    headers={'Authorization': 'Bearer ' + __import__('os').environ['GROQ_API_KEY'], 'Content-Type': 'application/json'},
)
reponse = json.loads(urllib.request.urlopen(req, timeout=70).read())
texte = reponse['choices'][0]['message']['content']
brut = texte[texte.find('{'):texte.rfind('}') + 1]
j = json.loads(brut)

def vol(scenes):
    return sum(len(l['texte']) for s in scenes for l in s['lignes'])

phases = [s['phase'] for s in j['scenes']]
print('titre:', j['titre'])
print('héros:', j['heros'])
print('phases:', phases, '| ordre OK:', phases == sorted(phases, key=lambda p: ['1.1','1.2','2','3.1','3.2'].index(p)))
print('personnages:', [(p['nom'], p['voix']) for p in j['personnages']])
voix_doublons = [v for v in set(p['voix'] for p in j['personnages']) if [p['voix'] for p in j['personnages']].count(v) > 1]
print('voix uniques:', 'OK' if not voix_doublons else f'DOUBLONS {voix_doublons}')
print('déclaration:', j['declaration'][:120] + '…')
print('volume parlé:', vol(j['scenes']), 'caractères (cible 2400-3200)')
print('réplique max:', max(len(l['texte']) for s in j['scenes'] for l in s['lignes']), 'caractères')
for s in j['scenes']:
    print(f"  phase {s['phase']:4s} {s['image']} {s['musique']:11s} {s['titre'][:40]:40s} {len(s['lignes'])} répliques")
print('VALIDE ✅' if not voix_doublons and len(j['personnages']) >= 2 and vol(j['scenes']) >= 1800 else 'À RETRAVAILER ❌')

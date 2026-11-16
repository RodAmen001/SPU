#!/usr/bin/env python3
"""Test de bout en bout du Mode Mentor (SSE) : étapes 1 puis 2, avec les
messages exacts de TEST17 et TEST18. Vérifie : une parabole PAR étape,
aucun événement 'angles', cadrage (sousSeuil=false ou parabole en ligne)."""
import json
import sys
import urllib.request

BASE = 'https://spu-web.onrender.com'
Q1 = 'conseils à un enfant qui part en apprentissage'
Q2 = "l'enfant est le fils du Roi, mais il part apprendre dans un autre village lointain où personne ne le connait... je veux un conseil à donner à cet enfant"


def appel(corps: dict, etiquette: str) -> dict:
    req = urllib.request.Request(
        f'{BASE}/api/mentor',
        method='POST',
        headers={'Content-Type': 'application/json'},
        data=json.dumps(corps).encode(),
    )
    evenements = []
    with urllib.request.urlopen(req, timeout=170) as r:
        ev, data = None, ''
        for ligne in r.read().decode('utf-8', 'replace').splitlines():
            if ligne.startswith('event: '):
                ev = ligne[7:].strip()
            elif ligne.startswith('data: ') and ev:
                try:
                    evenements.append((ev, json.loads(ligne[6:])))
                except Exception:
                    evenements.append((ev, {}))
                ev, data = None, ''
    print(f"\n════ {etiquette} ════")
    types = [e for e, _ in evenements]
    print('événements :', types)
    angles = [d for e, d in evenements if e == 'angles']
    paraboles = [d for e, d in evenements if e == 'parabole']
    synth = [d for e, d in evenements if e == 'synthesis']
    hist = [d for e, d in evenements if e == 'histoire']
    persp = [d for e, d in evenements if e == 'perspective']
    errs = [d for e, d in evenements if e == 'erreur']
    if errs:
        print('⚠️ ERREUR :', errs)
    print(f"paraboles émises : {len(paraboles)} | angles émis : {len(angles)} | synthèse : {len(synth)} | histoire : {len(hist)} chunks | perspective : {len(persp)}")
    for p in paraboles:
        print(f"  → parabole {p.get('code')} | sousSeuil={p.get('sousSeuil')} | enLigne={p.get('enLigne')} | score={p.get('score')}")
        print(f"     « {str(p.get('enonce'))[:150]} »")
        print(f"     interprétation : {str(p.get('interpretation'))[:160]}")
    if synth:
        print('  synthèse :', str(synth[0].get('text'))[:180])
    if angles:
        print('  ⚠️ ANGLES ENCORE ÉMIS :', angles)
    sid = None
    for e, d in evenements:
        if e == 'final' and d.get('sessionId'):
            sid = d['sessionId']
            print(f"  final : étape {d.get('etape')}, sessionId {sid[:12]}…")
    return {'sessionId': sid, 'paraboles': len(paraboles), 'angles': len(angles)}


etape1 = appel({'question': Q1, 'etape': 1}, "ÉTAPE 1 (TEST17 : « conseils à un enfant qui part en apprentissage »)")
etape2 = appel({'reponse': Q2, 'etape': 2, 'sessionId': etape1['sessionId']}, "ÉTAPE 2 (TEST18 : « l'enfant est le fils du Roi… »)")

print('\n════ VERDICT ════')
ok1 = etape1['paraboles'] >= 1 and etape1['angles'] == 0
ok2 = etape2['paraboles'] >= 1 and etape2['angles'] == 0
print(f"Étape 1 : parabole présente et zéro angle → {'✅ OK' if ok1 else '❌ PROBLÈME'}")
print(f"Étape 2 : parabole présente et zéro angle → {'✅ OK' if ok2 else '❌ PROBLÈME'}")
sys.exit(0 if (ok1 and ok2) else 1)

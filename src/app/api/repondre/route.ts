// POST /api/repondre — version JSON simple de /api/ask, prévue pour SPU Pocket (APK)
// Même pipeline : sécurité (phase 0 détresse) → sources → synthèse → parabole → histoire.
// Réponse unique en JSON (pas de flux SSE) : plus robuste dans un WebView Android.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { phase0, coucheA } from '@/lib/spu/distress';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { hashQuestion, verifierRateLimit } from '@/lib/spu/sources';
import { fluxNarratif, type EvenementSSE, type ResultatFlux } from '@/lib/spu/flux';
import { avecBudget, BUDGET_ORACLE_MS } from '@/lib/spu/budget';
import { MESSAGE_DEDETRESSE, MESSAGE_PRUDENT, RESSOURCES_DEDETRESSE, MESSAGE_ERREUR_SOURCES } from '@/lib/spu/constants';

export const maxDuration = 120;

// CORS ouvert : l'APK (origine file://) et tout client doivent pouvoir appeler
const CORS = { 'Access-Control-Allow-Origin': '*' };

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

interface Corps {
  question?: string;
  mode?: 'oracle' | 'enfant';
}

export async function POST(req: NextRequest) {
  let corps: Corps;
  try {
    corps = (await req.json()) as Corps;
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400, headers: CORS });
  }

  const question = (corps.question || '').trim();
  if (!question || question.length > 2000) {
    return NextResponse.json({ error: 'Question invalide (1 à 2000 caractères requis)' }, { status: 400, headers: CORS });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!verifierRateLimit(ip)) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessaie dans un instant.' }, { status: 429, headers: CORS });
  }

  const mode = corps.mode === 'enfant' ? 'enfant' : 'oracle';

  try {
    // ── PHASE 0 : détresse (aucun appel IA si détresse détectée) ──
    const p0 = await phase0(question);
    if (p0.decision === 'distress' || (p0.decision === 'review' && !corps.mode)) {
      return NextResponse.json({
        ok: false,
        detresse: true,
        prudent: p0.decision === 'review',
        message: p0.decision === 'review' ? MESSAGE_PRUDENT : MESSAGE_DEDETRESSE,
        ressources: RESSOURCES_DEDETRESSE,
      }, { headers: CORS });
    }

    // ── Sécurité enfant ──
    if (mode === 'enfant') {
      const explicite = coucheA(question) === 1 || /sexu|pornographi|nudité|nudite|violen/i.test(question);
      if (explicite) {
        return NextResponse.json({
          ok: false,
          bloque: true,
          message:
            "Cette question n'est pas pour le mode Enfant. Ici, on raconte des histoires douces — pose une question sur ta journée, tes rêves ou tes animaux préférés ! 🌱",
        }, { headers: CORS });
      }
    }

    // ── Flux narratif complet (accumulation, sans streaming) ──
    const compte = await utilisateurDeReq(req).catch(() => null);
    const modeCorpus = mode === 'enfant' ? 'enfant' : 'adulte';
    const resultat: ResultatFlux = { synthese: null, sources: [], parabole: null, histoire: null, perspective: null, erreur: null };
    // Budget global : la réponse complète (parabole, histoire, perspective) est
    // toujours servie en moins de ~2 minutes, même si les sources saturent.
    await avecBudget(BUDGET_ORACLE_MS, async () => {
    for await (const ev of fluxNarratif(question, { modeCorpus, contexte: 'non partagé' })) {
      const e = ev as EvenementSSE;
      if (e.type === 'synthesis') resultat.synthese = { texte: e.text, sources: e.sources, confiance: e.confiance };
      if (e.type === 'histoire')
        resultat.histoire = { texte: (resultat.histoire?.texte || '') + e.chunk, filtrePasse: true, regeneration: 0 };
      if (e.type === 'parabole')
        resultat.parabole = {
          id: e.id, code: e.code, texte: e.enonce, culture: e.culture, famille: e.famille,
          interpretations: [e.interpretation], sources: e.sources, score: e.score,
          interpretationChoisie: e.interpretation, sousSeuil: e.sousSeuil,
          enLigne: (e as { enLigne?: boolean }).enLigne || false,
        };
      if (e.type === 'perspective') resultat.perspective = e.text;
      if (e.type === 'erreur') resultat.erreur = e.message;
    }
    });

    if (!resultat.synthese && !resultat.parabole && !resultat.histoire) {
      return NextResponse.json({ error: resultat.erreur || MESSAGE_ERREUR_SOURCES }, { status: 502, headers: CORS });
    }

    // ── Réponse finale ──
    const reponseFinale = {
      ok: true,
      horodatage: new Date().toISOString(),
      reponse: resultat.synthese?.texte || '',
      sourcesUtilisees: resultat.synthese?.sources || [],
      confiance: resultat.synthese?.confiance ?? null,
      parabole: resultat.parabole
        ? {
            code: resultat.parabole.code,
            culture: resultat.parabole.culture,
            texte: resultat.parabole.texte,
            interpretation: resultat.parabole.interpretationChoisie,
          }
        : null,
      histoire: resultat.histoire?.texte || null,
      perspective: resultat.perspective || null,
      erreur: resultat.erreur,
    };

    // ── Journalisation (jamais bloquante) ──
    try {
      const compte2 = await utilisateurDeReq(req).catch(() => null);
      const session = await db.session.create({
        data: {
          mode,
          anonymized: !compte2,
          userConsent: !!compte2,
          expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
          ...(compte2 ? { userId: compte2.id } : {}),
        },
      });
      const echange = await db.echange.create({
        data: {
          sessionId: session.id,
          question,
          synthese: resultat.synthese?.texte || null,
          sourcesReponse: JSON.stringify(resultat.synthese?.sources || []),
          paraboleId: resultat.parabole?.id || null,
          interpretation: resultat.parabole?.interpretationChoisie || null,
          histoire: resultat.histoire?.texte || null,
          perspective: resultat.perspective || null,
          mode,
          etape: 1,
          payload: JSON.stringify({
            confiance: resultat.synthese?.confiance ?? null,
            score: resultat.parabole?.score ?? null,
            source: 'spu-pocket',
          }),
        },
      });
      return NextResponse.json({ ...reponseFinale, echangeId: echange.id }, { headers: CORS });
    } catch (errBd) {
      console.error('[api/repondre] journalisation:', errBd);
      return NextResponse.json(reponseFinale, { headers: CORS });
    }
  } catch (err) {
    console.error('[api/repondre]', err);
    return NextResponse.json({ error: MESSAGE_ERREUR_SOURCES }, { status: 502, headers: CORS });
  }
}

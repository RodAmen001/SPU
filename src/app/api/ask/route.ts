// POST /api/ask — Flux principal (Partie 15.1 du cahier) — SSE
// Ordre : Phase 0 détresse → sources → synthèse → matching → histoire → final.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { phase0, coucheA } from '@/lib/spu/distress';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { hashQuestion, verifierRateLimit } from '@/lib/spu/sources';
import { fluxNarratif, type EvenementSSE, type ResultatFlux } from '@/lib/spu/flux';
import { avecBudget, BUDGET_ORACLE_MS } from '@/lib/spu/budget';
import {
  MESSAGE_DEDETRESSE,
  MESSAGE_PRUDENT,
  RESSOURCES_DEDETRESSE,
  MESSAGE_ERREUR_SOURCES,
  PURGE_SESSIONS_JOURS,
} from '@/lib/spu/constants';

export const maxDuration = 120;

interface Corps {
  question?: string;
  mode?: 'oracle' | 'mentor' | 'deep' | 'enfant';
  sessionId?: string;
  audioActive?: boolean;
  bypassReview?: boolean;
}

export async function POST(req: NextRequest) {
  let corps: Corps;
  try {
    corps = (await req.json()) as Corps;
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const question = (corps.question || '').trim();
  if (!question || question.length > 2000) {
    return NextResponse.json({ error: 'Question invalide (1 à 2000 caractères requis)' }, { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!verifierRateLimit(ip)) {
    return NextResponse.json({ error: 'Trop de requêtes. Réessaie dans un instant.' }, { status: 429 });
  }

  const mode = corps.mode || 'oracle';
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const status = (step: string) => send('status', { step });

      let echangeId = '';
      let sessionId = corps.sessionId || '';
      // Budget global de la requête : au-delà, tous les appels IA cèdent la place
      // aux modèles locaux — une réponse complète est toujours servie.
      await avecBudget(BUDGET_ORACLE_MS, async () => {
      try {
        // ── Session (anonyme par défaut, purge 90 jours) ──
        // Utilisateur connecté au compte SPU : la session est rattachée à son compte
        // (conservation longue durée, récupérable depuis n'importe quel appareil).
        // Résilience : si la base est momentanément indisponible (lecture-seule,
        // quota…), le SPU continue de répondre — seul le journal est perdu.
        const compte = await utilisateurDeReq(req).catch(() => null);
        try {
          let session = corps.sessionId ? await db.session.findUnique({ where: { id: corps.sessionId } }) : null;
          if (!session) {
            session = await db.session.create({
              data: {
                mode,
                anonymized: !compte,
                userConsent: !!compte,
                expiresAt: new Date(Date.now() + PURGE_SESSIONS_JOURS * 24 * 3600 * 1000),
                ...(compte ? { userId: compte.id } : {}),
              },
            });
          } else if (compte && !session.userId) {
            session = await db.session.update({ where: { id: session.id }, data: { userId: compte.id, anonymized: false, userConsent: true } });
          }
          sessionId = session.id;
          // purge opportuniste RGPD des sessions expirées
          db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
        } catch (errBd) {
          console.error('[api/ask] session (BD indisponible, on continue sans journal):', errBd);
        }

        // ── PHASE 0 : détresse (avant tout appel externe) ──
        status('détresse');
        const p0 = await phase0(question);
        db.logsDetresse
          .create({
            data: {
              questionHash: hashQuestion(question),
              scoreCoucheA: p0.a,
              scoreCoucheB: p0.b,
              scoreCoucheC: p0.c,
              decision: p0.decision,
            },
          })
          .catch(() => {});

        const enregistrer = async (flagged: boolean, extra: Record<string, unknown> = {}) => {
          try {
            const echange = await db.echange.create({
              data: {
                sessionId,
                question,
                mode,
                audioActive: corps.audioActive || false,
                distressFlagged: flagged,
                etape: 1,
                payload: JSON.stringify(extra),
              },
            });
            echangeId = echange.id;
            return echange;
          } catch (errBd) {
            console.error('[api/ask] échange (BD indisponible):', errBd);
            return null;
          }
        };

        if (p0.decision === 'distress') {
          // Règles absolues : aucun appel externe, aucune parabole, log anonymisé.
          const echange = await enregistrer(true);
          send('distress', { message: MESSAGE_DEDETRESSE, resources: RESSOURCES_DEDETRESSE });
          send('final', { echangeId: echange?.id || '', sessionId, perspectiveDisponible: false });
          return;
        }

        if (p0.decision === 'review' && !corps.bypassReview) {
          const echange = await enregistrer(true);
          send('distress', { message: MESSAGE_PRUDENT, resources: RESSOURCES_DEDETRESSE, prudent: true });
          send('final', { echangeId: echange?.id || '', sessionId, perspectiveDisponible: false });
          return;
        }

        // ── Sécurité enfant : blocage doux des questions inappropriées en mode enfant ──
        if (mode === 'enfant') {
          const explicite = coucheA(question) === 1 || /sexu|pornographi|nudité|nudite|violen/i.test(question);
          if (explicite) {
            const echange = await enregistrer(false, { bloque: 'contenu_inapproprie_enfant' });
            send('erreur', {
              message:
                "Hmm, cette question n'est pas pour le mode Enfant. Les grands peuvent utiliser les autres modes. 🌱 Ici, on raconte des histoires douces — pose-moi une question sur ta journée, tes rêves ou tes animaux préférés !",
            });
            send('final', { echangeId: echange?.id || '', sessionId, perspectiveDisponible: false });
            return;
          }
        }

        // ── Flux narratif complet ──
        const modeCorpus = mode === 'enfant' ? 'enfant' : 'adulte';
        let resultat: ResultatFlux = { synthese: null, sources: [], parabole: null, histoire: null, perspective: null, erreur: null };
        for await (const ev of fluxNarratif(question, { modeCorpus, contexte: 'non partagé' })) {
          const e = ev as EvenementSSE;
          if (e.type === 'synthesis')
            resultat.synthese = { texte: e.text, sources: e.sources, confiance: e.confiance };
          if (e.type === 'histoire')
            resultat.histoire = {
              texte: (resultat.histoire?.texte || '') + e.chunk,
              filtrePasse: true,
              regeneration: 0,
            };
          if (e.type === 'parabole')
            resultat.parabole = {
              id: e.id, code: e.code, texte: e.enonce, culture: e.culture, famille: e.famille,
              interpretations: [e.interpretation], sources: e.sources, score: e.score,
              interpretationChoisie: e.interpretation, sousSeuil: e.sousSeuil,
            };
          if (e.type === 'perspective') resultat.perspective = e.text;
          if (e.type === 'erreur') resultat.erreur = e.message;
          send(e.type, e);
        }

        try {
          const echange = await db.echange.create({
            data: {
              sessionId,
              question,
              synthese: resultat.synthese?.texte || null,
              sourcesReponse: JSON.stringify(resultat.synthese?.sources || []),
              paraboleId: resultat.parabole?.id || null,
              interpretation: resultat.parabole?.interpretationChoisie || null,
              histoire: resultat.histoire?.texte || null,
              perspective: resultat.perspective || null,
              audioActive: corps.audioActive || false,
              distressFlagged: false,
              mode,
              etape: 1,
              payload: JSON.stringify({
                confiance: resultat.synthese?.confiance ?? null,
                score: resultat.parabole?.score ?? null,
                sousSeuil: resultat.parabole?.sousSeuil ?? false,
                regeneration: resultat.histoire?.regeneration ?? 0,
              }),
            },
          });
          echangeId = echange.id;
        } catch (errBd) {
          console.error('[api/ask] journalisation (BD indisponible):', errBd);
        }

        send('final', {
          echangeId,
          sessionId,
          perspectiveDisponible: mode === 'oracle' && !!resultat.parabole,
        });
      } catch (err) {
        console.error('[api/ask]', err);
        if (!echangeId) send('erreur', { message: MESSAGE_ERREUR_SOURCES });
      } finally {
        controller.close();
      }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

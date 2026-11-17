// POST /api/ask — Flux principal (Partie 15.1 du cahier) — SSE
// Ordre : Phase 0 détresse → sources → synthèse → matching → histoire → final.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { phase0, coucheA } from '@/lib/spu/distress';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { hashQuestion, verifierRateLimit } from '@/lib/spu/sources';
import { fluxNarratif, type EvenementSSE, type ResultatFlux } from '@/lib/spu/flux';
import { genererBoost, cheminBoost, serieSoldeeParBoost } from '@/lib/spu/boost';
import type { ScenarioBoost } from '@/lib/spu/boost';

// État BOOST du mode enfant (colonne session.boostState) — v6.2 :
// la série corrélative (q + resumes), la préparation en cours (enCours) et le
// théâtre prêt à être proposé (pret, rattaché à l'échange qui l'a demandé).
interface EtatBoostEnfant {
  q: string[];
  resumes: string[];
  enCours?: { echangeId: string; chemin: string };
  pret?: { scenario: ScenarioBoost; echangeId: string };
}
import { avecBudget, BUDGET_ORACLE_MS } from '@/lib/spu/budget';
import { reponse429, verifierDebit } from '@/lib/spu/rate-limit';
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
  // v6.6 — garde-fou anti-saturation par IP (audit v6.5 §B1) : 20 requêtes/min
  const debit = verifierDebit(req, 'ia');
  if (!debit.ok) return reponse429(debit.attenteMs);
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
      let resultat: ResultatFlux = { synthese: null, sources: [], parabole: null, histoire: null, perspective: null, erreur: null };
      // v6.2 — BOOST enfant : la préparation d'arrière-plan à lancer APRÈS la
      // fermeture du flux (capturée ici, exécutée après le `await avecBudget`).
      let boostAPreparerEnfant: { sessionId: string; echangeId: string; chemin: string } | null = null;
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
          // purge opportuniste RGPD des sessions expirées + logs de détresse
          // (v6.6, audit §B5 : même politique de 90 jours ; la table ne contient
          // de toute façon que des empreintes de question — jamais le texte brut)
          db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});
          db.logsDetresse
            .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 3600 * 1000) } } })
            .catch(() => {});
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
        resultat = { synthese: null, sources: [], parabole: null, histoire: null, perspective: null, erreur: null };
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
              degrade: e.degrade || false,
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

        // ── v6.2 — LE BOOST ENFANT : préparé EN ARRIÈRE-PLAN après la réponse ──
        // La série des questions juste passées (≥ 3, corrélatives, MÊME SESSION —
        // jamais de nouvelle discussion forcée) peut être soldée d'un BOOST. Le
        // scénario est écrit APRÈS la fermeture du flux (plus jamais de 502, plus
        // jamais de budget amputé) et stocké dans boostState ; le client le
        // récupère par polling sur /api/boost et propose « Lancer le BOOST » —
        // l'enfant décide, le théâtre n'est jamais lancé automatiquement.
        let boostEnfantEnPreparation = false;
        if (mode === 'enfant' && sessionId) {
          try {
            const sessionBoost = await db.session.findUnique({ where: { id: sessionId } }).catch(() => null);
            const etatBoost = sessionBoost?.boostState
              ? (JSON.parse(sessionBoost.boostState) as EtatBoostEnfant)
              : { q: [], resumes: [] };
            etatBoost.q.push(question);
            etatBoost.resumes.push(resultat?.parabole?.interpretationChoisie?.slice(0, 220) || '');
            etatBoost.q = etatBoost.q.slice(-3);
            etatBoost.resumes = etatBoost.resumes.slice(-3);
            if (etatBoost.q.length >= 3 && serieSoldeeParBoost(etatBoost.q) && !etatBoost.enCours) {
              // la série peut être soldée : le théâtre part en préparation
              etatBoost.enCours = { echangeId, chemin: cheminBoost(etatBoost.q, etatBoost.resumes) };
              boostEnfantEnPreparation = true;
              status('boost'); // l'interface annonce la préparation du théâtre
            }
            db.session.update({ where: { id: sessionId }, data: { boostState: JSON.stringify(etatBoost) } }).catch(() => {});
            console.error('[api/ask] boost enfant :', boostEnfantEnPreparation ? 'en préparation (arrière-plan)' : 'série en cours', etatBoost.q.length);
          } catch (e) {
            console.error('[api/ask] boost enfant (silencieux) :', e instanceof Error ? e.message : e);
          }
        }
        send('final', {
          echangeId,
          sessionId,
          perspectiveDisponible: mode === 'oracle' && !!resultat.parabole,
          boostEnPreparation: boostEnfantEnPreparation,
        });
      } catch (err) {
        console.error('[api/ask]', err);
        if (!echangeId) send('erreur', { message: MESSAGE_ERREUR_SOURCES });
      } finally {
        controller.close();
      }
      });

      // ── v6.2 — PRÉPARATION DU BOOST ENFANT EN ARRIÈRE-PLAN ──
      // La réponse est partie, le budget est terminé (AsyncLocalStorage : les
      // appels hors requête disposent de tout leur temps). Le scénario est
      // stocké dans boostState.pret — le client le récupère via /api/boost.
      if (boostAPreparerEnfant) {
        const prep = boostAPreparerEnfant;
        void (async () => {
          const debut = Date.now();
          try {
            const scenario = await genererBoost(prep.chemin, 'enfant', { timeoutMs: 50000 });
            const sessionBoost = await db.session.findUnique({ where: { id: prep.sessionId } }).catch(() => null);
            const etatBoost: EtatBoostEnfant = sessionBoost?.boostState ? JSON.parse(sessionBoost.boostState) : { q: [], resumes: [] };
            if (etatBoost.enCours?.echangeId !== prep.echangeId) return; // déjà soldé autrement
            if (scenario) {
              // série soldée : nouvelle série + théâtre prêt pour CE échange
              await db.session.update({
                where: { id: prep.sessionId },
                data: { boostState: JSON.stringify({ q: [], resumes: [], pret: { scenario, echangeId: prep.echangeId } }) },
              });
              console.error(`[api/ask] boost enfant prêt en ${Math.round((Date.now() - debut) / 1000)} s : ${scenario.titre}`);
            } else {
              // échec : la série reste en place, nouvel essai à la prochaine question
              await db.session.update({
                where: { id: prep.sessionId },
                data: { boostState: JSON.stringify({ q: etatBoost.q, resumes: etatBoost.resumes }) },
              }).catch(() => {});
              console.error(`[api/ask] boost enfant : aucune scène exploitable après ${Math.round((Date.now() - debut) / 1000)} s — réessai à la prochaine question`);
            }
          } catch (e) {
            console.error('[api/ask] boost enfant arrière-plan (silencieux) :', e instanceof Error ? e.message : e);
          }
        })();
      }
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

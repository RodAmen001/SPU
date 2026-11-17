// POST /api/mentor — Dialogue progressif en 3 étapes annoncées (4.2 du cahier)
// Étape 1/3 OUVERTURE : question + première parabole (flux complet).
// Étape 2/3 APPROFONDISSEMENT : réponse de l'utilisateur + questions d'angle.
// Étape 3/3 SYNTHÈSE : parabole finale + mise en perspective + question ouverte.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { phase0 } from '@/lib/spu/distress';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { hashQuestion, verifierRateLimit } from '@/lib/spu/sources';
import { fluxNarratif } from '@/lib/spu/flux';
import { genererBoost, cheminBoost } from '@/lib/spu/boost';
import { avecBudget, BUDGET_MENTOR_MS } from '@/lib/spu/budget';
import { reponse429, verifierDebit } from '@/lib/spu/rate-limit';
import {
  MESSAGE_DEDETRESSE,
  MESSAGE_PRUDENT,
  RESSOURCES_DEDETRESSE,
  MESSAGE_ERREUR_SOURCES,
  QUESTION_OUVERTE_FINALE,
  PURGE_SESSIONS_JOURS,
} from '@/lib/spu/constants';

export const maxDuration = 120;

interface Corps {
  question?: string;
  reponse?: string;
  etape?: number;
  sessionId?: string;
  audioActive?: boolean;
  saute?: boolean; // la personne avance sans préciser davantage (jamais forcé) — la réponse reste complète
}

interface EtatMentor {
  etape: number;
  echangeId: string;
  questionInitiale: string;
  synthese1?: string;
  parabole1?: { id: string; texte: string; interpretation: string; culture: string };
  histoire1?: string;
  perspective1?: string;
  partages?: string[]; // v6.0 — tout ce que la personne a partagé (pour le BOOST)
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
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (!verifierRateLimit(ip)) return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 });

  const etape = Math.min(3, Math.max(1, corps.etape || 1));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const status = (step: string) => send('status', { step });

      // v6.2 — BOOST à préparer en arrière-plan (capturé dans le flux, lancé
      // APRÈS la fermeture de la réponse — hors budget, hors délai proxy).
      let boostAPreparer: { echangeId: string; chemin: string } | null = null;

      // Budget global de l'étape Mentor : au-delà, les appels IA cèdent la place
      // aux modèles locaux — la réponse complète est toujours servie.
      await avecBudget(BUDGET_MENTOR_MS, async () => {
      try {
        // Session + état — rattachée au compte SPU si l'utilisateur est connecté
        const compte = await utilisateurDeReq(req).catch(() => null);
        let session = corps.sessionId ? await db.session.findUnique({ where: { id: corps.sessionId } }) : null;
        if (!session) {
          session = await db.session.create({
            data: {
              mode: 'mentor',
              anonymized: !compte,
              userConsent: !!compte,
              expiresAt: new Date(Date.now() + PURGE_SESSIONS_JOURS * 24 * 3600 * 1000),
              ...(compte ? { userId: compte.id } : {}),
            },
          });
        } else if (compte && !session.userId) {
          session = await db.session.update({ where: { id: session.id }, data: { userId: compte.id, anonymized: false, userConsent: true } });
        }
        let etat: EtatMentor = session.mentorState
          ? (JSON.parse(session.mentorState) as EtatMentor)
          : { etape: 1, echangeId: '', questionInitiale: '' };

        // ── v5.1 — Exigence du concepteur : CHAQUE requête reçoit UNE PARABOLE ──
        // Helper partagé par les trois étapes : le flux complet (synthèse des
        // sources → parabole réelle, sourcée et CADRÉE — ré-arbitrage vers la
        // synthèse, puis recherche EN LIGNE si le corpus ne cadre pas → histoire
        // → mise en perspective). Fini la « simple écoute » et les questions
        // d'affinage : chaque réponse du SPU porte sa parabole.
        const deroulerFluxMentor = async (requete: string) => {
          let paraboleId: string | null = null;
          let synthese = '';
          let histoire = '';
          let perspective = '';
          for await (const ev of fluxNarratif(requete, { modeCorpus: 'adulte', contexte: 'échange avec le Mentor' })) {
            if (ev.type === 'synthesis') {
              synthese = ev.text;
              etat.synthese1 = ev.text;
            }
            if (ev.type === 'parabole') {
              paraboleId = ev.id;
              etat.parabole1 = { id: ev.id, texte: ev.enonce, interpretation: ev.interpretation, culture: ev.culture };
            }
            if (ev.type === 'histoire') {
              histoire += ev.chunk;
              etat.histoire1 = histoire;
            }
            if (ev.type === 'perspective') {
              perspective = ev.text;
              etat.perspective1 = ev.text;
            }
            send(ev.type, ev);
          }
          return { paraboleId, synthese, histoire, perspective };
        };

        // ── ÉTAPE 1 : OUVERTURE ──
        if (etape === 1) {
          const question = (corps.question || '').trim();
          if (!question || question.length > 2000) {
            send('erreur', { message: 'Question invalide (1 à 2000 caractères).' });
            return;
          }
          etat = { etape: 1, echangeId: '', questionInitiale: question };

          status('détresse');
          const p0 = await phase0(question);
          db.logsDetresse.create({
            data: { questionHash: hashQuestion(question), scoreCoucheA: p0.a, scoreCoucheB: p0.b, scoreCoucheC: p0.c, decision: p0.decision },
          }).catch(() => {});

          const echangeFlag = await db.echange.create({
            data: { sessionId: session.id, question, mode: 'mentor', audioActive: corps.audioActive || false, distressFlagged: p0.decision !== 'pass', etape: 1 },
          });
          etat.echangeId = echangeFlag.id;

          if (p0.decision === 'distress') {
            send('distress', { message: MESSAGE_DEDETRESSE, resources: RESSOURCES_DEDETRESSE });
            send('final', { echangeId: echangeFlag.id, sessionId: session.id, etape: 1, perspectiveDisponible: false });
            return;
          }
          if (p0.decision === 'review') {
            send('distress', { message: MESSAGE_PRUDENT, resources: RESSOURCES_DEDETRESSE, prudent: true });
            send('final', { echangeId: echangeFlag.id, sessionId: session.id, etape: 1, perspectiveDisponible: false });
            return;
          }

          const res1 = await deroulerFluxMentor(question);

          // journalisation complète de l'ouverture (synthèse → parabole → histoire → perspective)
          db.echange.update({
            where: { id: etat.echangeId },
            data: {
              synthese: res1.synthese || null,
              paraboleId: res1.paraboleId || null,
              interpretation: etat.parabole1?.interpretation || null,
              histoire: res1.histoire || null,
              perspective: res1.perspective || null,
              payload: JSON.stringify({ type: 'mentor-ouverture' }),
            },
          }).catch(() => {});

          etat.etape = 2;
          await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
          send('final', { echangeId: etat.echangeId, sessionId: session.id, etape: 1, perspectiveDisponible: false });
          return;
        }

        // ── ÉTAPE 2 : APPROFONDISSEMENT ──
        if (etape === 2) {
          const reponse = (corps.reponse || '').trim();
          if (!reponse && !corps.saute) {
            send('erreur', { message: 'Réponse vide.' });
            return;
          }
          if (corps.saute) {
            // Poursuite libre : rien n'est jamais forcé — et la réponse reste COMPLÈTE.
            // v5.1 : le flux complet se rejoue (synthèse → parabole cadrée → histoire
            // → perspective), jamais une réponse sans parabole.
            status('approfondissement');
            const echLibre = await db.echange.create({
              data: { sessionId: session.id, question: '(je poursuis sans préciser davantage)', mode: 'mentor', etape: 2, audioActive: corps.audioActive || false },
            });
            const resLibre = await deroulerFluxMentor(etat.questionInitiale);
            db.echange.update({
              where: { id: echLibre.id },
              data: {
                synthese: resLibre.synthese || null,
                paraboleId: resLibre.paraboleId || null,
                interpretation: etat.parabole1?.interpretation || null,
                histoire: resLibre.histoire || null,
                perspective: resLibre.perspective || null,
                payload: JSON.stringify({ type: 'mentor-poursuite-libre' }),
              },
            }).catch(() => {});
            etat.etape = 3;
            await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
            send('final', { echangeId: echLibre.id, sessionId: session.id, etape: 2, perspectiveDisponible: false });
            return;
          }
          // Phase 0 sur la réponse aussi
          const p0 = await phase0(reponse);
          if (p0.decision === 'distress') {
            send('distress', { message: MESSAGE_DEDETRESSE, resources: RESSOURCES_DEDETRESSE });
            send('final', { echangeId: etat.echangeId, sessionId: session.id, etape: 2, perspectiveDisponible: false });
            return;
          }
          if (p0.decision === 'review') {
            send('distress', { message: MESSAGE_PRUDENT, resources: RESSOURCES_DEDETRESSE, prudent: true });
            send('final', { echangeId: etat.echangeId, sessionId: session.id, etape: 2, perspectiveDisponible: false });
            return;
          }

          status('approfondissement');
          // ── v5.1 — Ce que la personne partage est UNE REQUÊTE : le flux complet se
          // rejoue sur la question ENRICHIE (question initiale + précision apportée).
          // Chaque réponse porte sa parabole réelle, sourcée et cadrée.
          const enrichie = `${etat.questionInitiale} — Précision apportée par la personne : ${reponse}`.slice(0, 2000);
          etat.partages = [...(etat.partages || []), reponse].slice(-4);
          const ech2 = await db.echange.create({
            data: { sessionId: session.id, question: reponse, mode: 'mentor', etape: 2, audioActive: corps.audioActive || false },
          });
          const res2 = await deroulerFluxMentor(enrichie);
          db.echange.update({
            where: { id: ech2.id },
            data: {
              synthese: res2.synthese || null,
              paraboleId: res2.paraboleId || null,
              interpretation: etat.parabole1?.interpretation || null,
              histoire: res2.histoire || null,
              perspective: res2.perspective || null,
              payload: JSON.stringify({ type: 'mentor-approfondissement' }),
            },
          }).catch(() => {});
          etat.etape = 3;
          await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
          send('final', { echangeId: ech2.id, sessionId: session.id, etape: 2, perspectiveDisponible: false });
          return;
        }

        // ── ÉTAPE 3 : SYNTHÈSE ──
        const reponse = (corps.reponse || '').trim();
        if (!reponse && !corps.saute) {
          send('erreur', { message: 'Réponse vide.' });
          return;
        }
        if (corps.saute) {
          // Synthèse finale sur le chemin parcouru — rien n'est forcé, et la
          // réponse reste complète : flux complet sur la question initiale.
          status('synthèse');
          const echLibre3 = await db.echange.create({
            data: { sessionId: session.id, question: '(synthèse demandée sans préciser davantage)', mode: 'mentor', etape: 3, audioActive: corps.audioActive || false },
          });
          const resLibre3 = await deroulerFluxMentor(etat.questionInitiale);
          db.echange.update({
            where: { id: echLibre3.id },
            data: {
              synthese: resLibre3.synthese || null,
              paraboleId: resLibre3.paraboleId || null,
              interpretation: etat.parabole1?.interpretation || null,
              histoire: resLibre3.histoire || null,
              perspective: resLibre3.perspective || null,
              sourcesReponse: JSON.stringify(['Échange Mentor']),
              payload: JSON.stringify({ type: 'mentor-synthese-libre' }),
            },
          }).catch(() => {});
          send('question-ouverte', { text: QUESTION_OUVERTE_FINALE });
          etat.etape = 1;
          await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
          // v6.1 — le BOOST est prêt (proposé, jamais imposé) puis le final part
          // v6.2 — la 3ᵉ question est close : le BOOST part en préparation
          // d'arrière-plan, le final part tout de suite (l'offre s'affichera
          // dès que le scénario est prêt — polling /api/boost).
          boostAPreparer = {
            echangeId: echLibre3.id,
            chemin: [etat.questionInitiale, ...(etat.partages || [])].filter(Boolean).join('\n'),
          };
          send('final', { echangeId: echLibre3.id, sessionId: session.id, etape: 3, perspectiveDisponible: false, boostEnPreparation: true });
          return;
        }
        const p0 = await phase0(reponse);
        if (p0.decision === 'distress') {
          send('distress', { message: MESSAGE_DEDETRESSE, resources: RESSOURCES_DEDETRESSE });
          send('final', { echangeId: etat.echangeId, sessionId: session.id, etape: 3, perspectiveDisponible: false });
          return;
        }

        status('synthèse');
        // ── v5.1 — Synthèse finale : le flux complet sur le chemin parcouru
        // (question initiale + tout ce qui a été partagé) — parabole réelle,
        // sourcée et cadrée sur l'ensemble de l'échange.
        const chemin = `${etat.questionInitiale} — Chemin de l'échange, ce que la personne a partagé : ${reponse}`.slice(0, 2000);
        const echange3 = await db.echange.create({
          data: { sessionId: session.id, question: reponse, mode: 'mentor', etape: 3, audioActive: corps.audioActive || false },
        });
        const res3 = await deroulerFluxMentor(chemin);
        db.echange.update({
          where: { id: echange3.id },
          data: {
            synthese: res3.synthese || null,
            paraboleId: res3.paraboleId || null,
            interpretation: etat.parabole1?.interpretation || null,
            histoire: res3.histoire || null,
            perspective: res3.perspective || null,
            sourcesReponse: JSON.stringify(['Échange Mentor']),
            payload: JSON.stringify({ type: 'mentor-synthese' }),
          },
        }).catch(() => {});

        // Question ouverte finale (posture éthique 1.3)
        send('question-ouverte', { text: QUESTION_OUVERTE_FINALE });

        etat.etape = 1; // prêt pour un nouveau cycle
        await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
        // v6.2 — la 3ᵉ question vient de trouver sa réponse : le BOOST part en
        // préparation d'arrière-plan (l'offre s'affichera dès qu'il est prêt)
        boostAPreparer = { echangeId: echange3.id, chemin };
        send('final', { echangeId: echange3.id, sessionId: session.id, etape: 3, perspectiveDisponible: false, boostEnPreparation: true });
      } catch (err) {
        console.error('[api/mentor]', err);
        send('erreur', { message: MESSAGE_ERREUR_SOURCES });
      } finally {
        controller.close();
      }
      });

      // ── v6.2 — PRÉPARATION DU BOOST EN ARRIÈRE-PLAN ──
      // La réponse est déjà partie (flux fermé, aucun délai proxy en jeu) et le
      // budget AsyncLocalStorage est terminé : les appels IA disposent de tout
      // leur temps. Le scénario est stocké dans le payload de l'échange — le
      // client le récupère en polling sur /api/boost.
      if (boostAPreparer) {
        const { echangeId, chemin: cheminBoost } = boostAPreparer;
        void (async () => {
          const debut = Date.now();
          try {
            const scenario = await genererBoost(cheminBoost, 'adulte', { timeoutMs: 50000 });
            if (scenario) {
              await db.echange.update({
                where: { id: echangeId },
                data: { payload: JSON.stringify({ type: 'mentor-boost-pret', scenario }) },
              });
              console.error(`[api/mentor] boost prêt en ${Math.round((Date.now() - debut) / 1000)} s : ${scenario.titre}`);
            } else {
              await db.echange.update({
                where: { id: echangeId },
                data: { payload: JSON.stringify({ type: 'mentor-boost-echec' }) },
              }).catch(() => {});
              console.error(`[api/mentor] boost : aucune scène exploitable après ${Math.round((Date.now() - debut) / 1000)} s`);
            }
          } catch (e) {
            console.error('[api/mentor] boost arrière-plan (silencieux) :', e instanceof Error ? e.message : e);
            db.echange.update({
              where: { id: echangeId },
              data: { payload: JSON.stringify({ type: 'mentor-boost-echec' }) },
            }).catch(() => {});
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

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
import { llmChat, extractJson } from '@/lib/spu/llm';
import { trouverParabole, detecterTonalite } from '@/lib/spu/matching';
import { genererHistoire, chunker } from '@/lib/spu/story';
import { genererPerspective } from '@/lib/spu/perspective';
import { avecBudget, BUDGET_MENTOR_MS } from '@/lib/spu/budget';
import {
  MESSAGE_DEDETRESSE,
  MESSAGE_PRUDENT,
  RESSOURCES_DEDETRESSE,
  MESSAGE_ERREUR_SOURCES,
  QUESTION_OUVERTE_FINALE,
  PURGE_SESSIONS_JOURS,
  FAMILLES,
} from '@/lib/spu/constants';

export const maxDuration = 120;

interface Corps {
  question?: string;
  reponse?: string;
  etape?: number;
  sessionId?: string;
  audioActive?: boolean;
  saute?: boolean; // l'utilisateur poursuit sans répondre aux questions d'affinage (jamais forcé)
}

interface EtatMentor {
  etape: number;
  echangeId: string;
  questionInitiale: string;
  synthese1?: string;
  parabole1?: { id: string; texte: string; interpretation: string; culture: string };
  histoire1?: string;
  perspective1?: string;
  angles?: string[];
}

export async function POST(req: NextRequest) {
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

          for await (const ev of fluxNarratif(question, { modeCorpus: 'adulte', contexte: 'non partagé' })) {
            if (ev.type === 'synthesis') etat.synthese1 = ev.text;
            if (ev.type === 'parabole') etat.parabole1 = { id: ev.id, texte: ev.enonce, interpretation: ev.interpretation, culture: ev.culture };
            if (ev.type === 'histoire') etat.histoire1 = (etat.histoire1 || '') + ev.chunk;
            if (ev.type === 'perspective') etat.perspective1 = ev.text;
            send(ev.type, ev);
          }

          // journalisation complète de l'ouverture (synthèse → parabole → histoire → perspective)
          db.echange.update({
            where: { id: etat.echangeId },
            data: {
              synthese: etat.synthese1 || null,
              paraboleId: etat.parabole1?.id || null,
              interpretation: etat.parabole1?.interpretation || null,
              histoire: etat.histoire1 || null,
              perspective: etat.perspective1 || null,
              payload: JSON.stringify({ type: 'mentor-ouverture' }),
            },
          }).catch(() => {});

          // questions d'angle pour l'étape 2
          status('préparation');
          const angles = await genererAngles(question, etat.synthese1 || '', etat.parabole1?.texte || '');
          etat.angles = angles;
          etat.etape = 2;
          await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
          send('angles', { questions: angles });
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
            // Poursuite libre : l'utilisateur n'a PAS à répondre aux questions d'affinage.
            // On avance doucement, sans rien inventer sur ce qu'il n'a pas partagé.
            status('approfondissement');
            const reflLibre = `Très bien, je te suis — avançons doucement. Si un détail te vient en chemin, un ressenti ou un souvenir, tu pourras toujours le partager : je prendrai le temps de l\'écouter.`;
            const echLibre = await db.echange.create({
              data: {
                sessionId: session.id, question: '(poursuite sans préciser davantage)', mode: 'mentor', etape: 2,
                payload: JSON.stringify({ reflexion: reflLibre, type: 'mentor-poursuite-libre' }),
              },
            });
            send('reflexion', { text: reflLibre });
            if (etat.parabole1?.id) {
              try {
                const pb = await db.parabole.findUnique({ where: { id: etat.parabole1.id } });
                if (pb) {
                  const interps = JSON.parse(pb.interpretations) as string[];
                  const interp2 = interps.find((i) => i !== etat.parabole1?.interpretation) || etat.parabole1.interpretation;
                  send('parabole', {
                    id: pb.id, code: pb.code, enonce: pb.texte, interpretation: interp2,
                    culture: pb.culture, famille: `${pb.famille} — approfondissement`,
                    sources: JSON.parse(pb.sources), score: 0.9, sousSeuil: false,
                  });
                  status('histoire');
                  const histoire2 = await genererHistoire({
                    enonce: pb.texte,
                    interpretation: interp2,
                    contexte: 'échange avec le Mentor (la personne avance à son rythme)',
                    culture: pb.culture,
                    tonalite: 'neutre',
                    mode: 'adulte',
                    preoccupation: etat.questionInitiale.slice(0, 600),
                  });
                  for (const chunk of chunker(histoire2.texte, 3)) {
                    send('histoire', { chunk });
                    await new Promise((r) => setTimeout(r, 35));
                  }
                  status('perspective');
                  const perspective2 = await genererPerspective(
                    etat.questionInitiale,
                    pb.texte,
                    interp2,
                    { contexte: 'La personne explore sa question à son rythme, sans préciser davantage pour le moment.' },
                  );
                  send('perspective', { text: perspective2 });
                  await db.echange.update({
                    where: { id: echLibre.id },
                    data: { paraboleId: pb.id, interpretation: interp2, histoire: histoire2.texte, perspective: perspective2 },
                  }).catch(() => {});
                }
              } catch {
                /* la poursuite reste utilisable même si la couche parabole échoue */
              }
            }
            etat.angles = await genererAngles(etat.questionInitiale, etat.synthese1 || '', etat.parabole1?.texte || '');
            etat.etape = 3;
            await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
            send('angles', { questions: etat.angles });
            send('final', { echangeId: etat.echangeId, sessionId: session.id, etape: 2, perspectiveDisponible: false });
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
          let refl = '';
          try {
            refl = await llmChat(
              [
                {
                  role: 'system',
                  content:
                    "Tu es le Mentor du SPU : un guide qui n'impose rien, ne juge rien, et aide à clarifier. L'utilisateur répond à tes questions d'affinage — ou partage librement autre chose. Rebondis sur CE QU'IL A PARTAGÉ (pas de liste de conseils), reformule ce que tu entends avec chaleur, et propose 2 nouvelles questions d'affinage, plus précises. N'oublie jamais : ces questions sont des invitations facultatives, il peut aussi partager tout autre détail qu'il souhaite. Ton : chaleureux, sobre, humble. Maximum 120 mots. Termine exactement par un bloc JSON sur sa propre ligne : {\"angles\": [\"…\", \"…\"]}",
                },
                {
                  role: 'user',
                  content: `Question initiale : ${etat.questionInitiale}\nParabole ouverte : « ${etat.parabole1?.texte || ''} »\nMes questions d'angle étaient : ${(etat.angles || []).join(' | ')}\nRéponse de l'utilisateur : ${reponse.slice(0, 1500)}`,
                },
              ],
              { timeoutMs: 20000, temperature: 0.7, maxTokens: 350 }
            );
          } catch {
            refl = `Je t'entends. Ce que tu décris — ${reponse.slice(0, 120)} — mérite qu'on s'y attarde doucement.\n{"angles": ["Si tu devais nommer le besoin le plus profond derrière tout ça, ce serait quoi ?", "Qu'est-ce qui s'est déjà passé quand tu as traversé quelque chose de semblable ?"]}`;
          }
          const reflexion = refl.split(/\{"angles"/)[0].trim() || 'Je t\'entends.';
          const anglesJson = extractJson<{ angles: string[] }>(refl);
          const angles2 = anglesJson?.angles?.length ? anglesJson.angles.slice(0, 2) : ['Si tu devais nommer ce qui a le plus de poids pour toi, ce serait quoi ?'];

          const ech2 = await db.echange.create({
            data: {
              sessionId: session.id, question: reponse, mode: 'mentor', etape: 2,
              payload: JSON.stringify({ reflexion, type: 'mentor-approfondissement' }),
            },
          });

          send('reflexion', { text: reflexion });

          // ── La parabole reste au cœur de chaque réponse du SPU (approfondissement) ──
          if (etat.parabole1?.id) {
            try {
              const pb = await db.parabole.findUnique({ where: { id: etat.parabole1.id } });
              if (pb) {
                const interps = JSON.parse(pb.interpretations) as string[];
                const interp2 = interps.find((i) => i !== etat.parabole1?.interpretation) || etat.parabole1.interpretation;
                send('parabole', {
                  id: pb.id, code: pb.code, enonce: pb.texte, interpretation: interp2,
                  culture: pb.culture, famille: `${pb.famille} — approfondissement`,
                  sources: JSON.parse(pb.sources), score: 0.9, sousSeuil: false,
                });
                status('histoire');
                const histoire2 = await genererHistoire({
                  enonce: pb.texte,
                  interpretation: interp2,
                  contexte: 'échange avec le Mentor (approfondissement)',
                  culture: pb.culture,
                  tonalite: 'neutre',
                  mode: 'adulte',
                  preoccupation: `${etat.questionInitiale} ${reponse}`.slice(0, 600),
                });
                for (const chunk of chunker(histoire2.texte, 3)) {
                  send('histoire', { chunk });
                  await new Promise((r) => setTimeout(r, 35));
                }
                status('perspective');
                const perspective2 = await genererPerspective(
                  `${etat.questionInitiale} ${reponse}`,
                  pb.texte,
                  interp2,
                  { contexte: `Ce que la personne a répondu au Mentor : ${reponse.slice(0, 300)}` },
                );
                send('perspective', { text: perspective2 });
                await db.echange.update({
                  where: { id: ech2.id },
                  data: { paraboleId: pb.id, interpretation: interp2, histoire: histoire2.texte, perspective: perspective2 },
                }).catch(() => {});
              }
            } catch {
              /* l'approfondissement reste utilisable même si la couche parabole échoue */
            }
          }

          etat.angles = angles2;
          etat.etape = 3;
          await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
          send('angles', { questions: angles2 });
          send('final', { echangeId: etat.echangeId, sessionId: session.id, etape: 2, perspectiveDisponible: false });
          return;
        }

        // ── ÉTAPE 3 : SYNTHÈSE ──
        const reponse = (corps.reponse || '').trim();
        if (!reponse && !corps.saute) {
          send('erreur', { message: 'Réponse vide.' });
          return;
        }
        if (corps.saute) {
          // Synthèse finale construite sur ce qui a déjà été partagé — rien n'est forcé.
          status('synthèse');
          const contexteLibre = `Question initiale : ${etat.questionInitiale}. La personne a choisi d'avancer sans préciser davantage — honore son rythme, ne suppose rien.`;
          const syntheseLibre = await llmChat(
            [
              {
                role: 'system',
                content:
                  "Tu es un synthétiseur neutre. À partir de la question initiale de l'utilisateur, produis une synthèse douce de 2 à 3 phrases (français), sans conseil, sans position, qui reflète ce que sa question met en lumière. Maximum 90 mots. Réponds avec le texte seul.",
              },
              { role: 'user', content: contexteLibre },
            ],
            { timeoutMs: 15000, temperature: 0.5, maxTokens: 200 }
          );
          send('synthesis', { text: syntheseLibre.trim(), sources: ['Échange Mentor'], confiance: 0.75 });
          status('matching');
          const matchLibre = await trouverParabole(`${contexteLibre} ${syntheseLibre}`, etat.questionInitiale, 'adulte');
          if (matchLibre && etat.parabole1?.id && matchLibre.id === etat.parabole1.id && matchLibre.interpretations.length > 1) {
            const autre = matchLibre.interpretations.find((i) => i !== etat.parabole1?.interpretation);
            if (autre) matchLibre.interpretationChoisie = autre;
          }
          if (matchLibre) {
            send('parabole', {
              id: matchLibre.id, code: matchLibre.code, enonce: matchLibre.texte, interpretation: matchLibre.interpretationChoisie,
              culture: matchLibre.culture, famille: matchLibre.famille, sources: matchLibre.sources, score: matchLibre.score, sousSeuil: matchLibre.sousSeuil,
            });
          }
          status('histoire');
          const histoireLibre = matchLibre
            ? await genererHistoire({
                enonce: matchLibre.texte,
                interpretation: matchLibre.interpretationChoisie,
                contexte: contexteLibre.slice(0, 400),
                culture: matchLibre.culture,
                tonalite: 'neutre',
                mode: 'adulte',
                preoccupation: etat.questionInitiale.slice(0, 600),
              })
            : null;
          if (histoireLibre) {
            for (const chunk of chunker(histoireLibre.texte, 3)) {
              send('histoire', { chunk });
              await new Promise((r) => setTimeout(r, 35));
            }
          }
          let perspectiveLibre = '';
          if (matchLibre) {
            status('perspective');
            perspectiveLibre = await genererPerspective(
              etat.questionInitiale,
              matchLibre.texte,
              matchLibre.interpretationChoisie,
              { contexte: 'La personne a avancé à son rythme, sans préciser davantage.' },
            );
            send('perspective', { text: perspectiveLibre });
          }
          send('question-ouverte', { text: QUESTION_OUVERTE_FINALE });
          const echLibre3 = await db.echange.create({
            data: {
              sessionId: session.id, question: '(synthèse demandée sans préciser davantage)', synthese: syntheseLibre.trim(),
              sourcesReponse: JSON.stringify(['Échange Mentor']),
              paraboleId: matchLibre?.id || null, interpretation: matchLibre?.interpretationChoisie || null,
              histoire: histoireLibre?.texte || null, perspective: perspectiveLibre || null,
              audioActive: corps.audioActive || false,
              mode: 'mentor', etape: 3,
              payload: JSON.stringify({ type: 'mentor-synthese-libre', score: matchLibre?.score ?? null }),
            },
          });
          etat.etape = 1;
          await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
          send('final', { echangeId: echLibre3.id, sessionId: session.id, etape: 3, perspectiveDisponible: false });
          return;
        }
        const p0 = await phase0(reponse);
        if (p0.decision === 'distress') {
          send('distress', { message: MESSAGE_DEDETRESSE, resources: RESSOURCES_DEDETRESSE });
          send('final', { echangeId: etat.echangeId, sessionId: session.id, etape: 3, perspectiveDisponible: false });
          return;
        }

        status('synthèse');
        const contexteComplet = `Question initiale : ${etat.questionInitiale}. Ce que j'ai compris en échangeant : ${reponse.slice(0, 600)}`;
        const syntheseFinale = await llmChat(
          [
            {
              role: 'system',
              content:
                "Tu es un synthétiseur neutre. À partir de la question initiale et de l'échange de l'utilisateur, produis une synthèse douce de 2 à 3 phrases (français), sans conseil, sans position, qui reflète ce que l'utilisateur a mis en lumière lui-même. Maximum 90 mots. Réponds avec le texte seul.",
            },
            { role: 'user', content: contexteComplet },
          ],
          { timeoutMs: 15000, temperature: 0.5, maxTokens: 200 }
        );
        send('synthesis', { text: syntheseFinale.trim(), sources: ['Échange Mentor'], confiance: 0.75 });

        status('matching');
        const match = await trouverParabole(`${contexteComplet} ${syntheseFinale}`, etat.questionInitiale, 'adulte');
        let paraboleFinale = match;
        // éviter la répétition de la première parabole si possible
        if (match && etat.parabole1?.id && match.id === etat.parabole1.id && match.interpretations.length > 1) {
          const autre = match.interpretations.find((i) => i !== etat.parabole1?.interpretation);
          if (autre) match.interpretationChoisie = autre;
        }
        if (match) {
          send('parabole', {
            id: match.id, code: match.code, enonce: match.texte, interpretation: match.interpretationChoisie,
            culture: match.culture, famille: match.famille, sources: match.sources, score: match.score, sousSeuil: match.sousSeuil,
          });
        }

        status('histoire');
        const tonalite = await detecterTonalite(`${etat.questionInitiale} ${reponse}`);
        const histoire = match
          ? await genererHistoire({
              enonce: match.texte,
              interpretation: match.interpretationChoisie,
              contexte: contexteComplet.slice(0, 400),
              culture: match.culture,
              tonalite,
              mode: 'adulte',
              preoccupation: `${etat.questionInitiale} ${reponse}`.slice(0, 600),
            })
          : null;
        if (histoire) {
          for (const chunk of chunker(histoire.texte, 3)) {
            send('histoire', { chunk });
            await new Promise((r) => setTimeout(r, 35));
          }
        }

        // ── Mise en perspective : le pont entre la question initiale et la parabole finale ──
        let perspective3 = '';
        if (match) {
          status('perspective');
          perspective3 = await genererPerspective(
            etat.questionInitiale,
            match.texte,
            match.interpretationChoisie,
            { contexte: `Chemin de l'échange avec le Mentor : ${reponse.slice(0, 300)}` },
          );
          send('perspective', { text: perspective3 });
        }

        // Question ouverte finale (posture éthique 1.3)
        send('question-ouverte', { text: QUESTION_OUVERTE_FINALE });

        const echange = await db.echange.create({
          data: {
            sessionId: session.id, question: reponse, synthese: syntheseFinale.trim(),
            sourcesReponse: JSON.stringify(['Échange Mentor']),
            paraboleId: match?.id || null, interpretation: match?.interpretationChoisie || null,
            histoire: histoire?.texte || null, perspective: perspective3 || null,
            audioActive: corps.audioActive || false,
            mode: 'mentor', etape: 3,
            payload: JSON.stringify({ type: 'mentor-synthese', score: match?.score ?? null }),
          },
        });

        etat.etape = 1; // prêt pour un nouveau cycle
        await db.session.update({ where: { id: session.id }, data: { mentorState: JSON.stringify(etat) } });
        send('final', { echangeId: echange.id, sessionId: session.id, etape: 3, perspectiveDisponible: false });
      } catch (err) {
        console.error('[api/mentor]', err);
        send('erreur', { message: MESSAGE_ERREUR_SOURCES });
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

async function genererAngles(question: string, synthese: string, parabole: string): Promise<string[]> {
  try {
    const r = await llmChat(
      [
        {
          role: 'system',
          content:
            'Tu es le Mentor du SPU. Génère exactement 2 questions d\'affinage : ouvertes, douces et sans jugement, pour mieux cerner la préoccupation de l\'utilisateur et mieux circonscrire la réponse qui lui sera offerte. Ce sont des invitations facultatives — jamais des exigences, jamais des demandes d\'informations personnelles. Chaque question : maximum 25 mots. Réponds UNIQUEMENT avec un JSON : {"angles": ["…", "…"]}',
        },
        { role: 'user', content: `Question : ${question}\nSynthèse : ${synthese}\nParabole : ${parabole}` },
      ],
      { timeoutMs: 12000, temperature: 0.7, maxTokens: 150 }
    );
    const json = extractJson<{ angles: string[] }>(r);
    if (json?.angles?.length) return json.angles.slice(0, 2);
    return ['Quand tu poses cette question, qu\'est-ce qui pèse le plus ?', 'Si un ami te la posait, que lui répondrais-tu d\'abord ?'];
  } catch {
    return ['Quand tu poses cette question, qu\'est-ce qui pèse le plus ?', 'Si un ami te la posait, que lui répondrais-tu d\'abord ?'];
  }
}

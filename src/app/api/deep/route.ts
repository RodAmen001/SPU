// POST /api/deep — Exploration contemplative en 3 niveaux (4.3 du cahier)
// Niveau 1 : parabole + histoire contemplative (sources limitées, ton lent).
// Niveau 2 : méditation guidée + deuxième interprétation de la même parabole.
// Niveau 3 : mise en perspective finale + question ouverte.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { phase0 } from '@/lib/spu/distress';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { hashQuestion, verifierRateLimit } from '@/lib/spu/sources';
import { fluxNarratif } from '@/lib/spu/flux';
import { llmChat } from '@/lib/spu/llm';
import { genererHistoire, chunker } from '@/lib/spu/story';
import { avecBudget, BUDGET_DEEP_MS } from '@/lib/spu/budget';
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
  niveau?: number;
  sessionId?: string;
  audioActive?: boolean;
}

interface EtatDeep {
  niveau: number;
  echangeId: string;
  question: string;
  paraboleId?: string;
  paraboleTexte?: string;
  interpretation1?: string;
  culture?: string;
  meditation?: string;
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

  const niveau = Math.min(3, Math.max(1, corps.niveau || 1));
  const encoder = new TextEncoder();
  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const status = (step: string) => send('status', { step });

      // Budget global du niveau Deep : au-delà, les appels IA cèdent la place
      // aux modèles locaux — la réponse complète est toujours servie.
      await avecBudget(BUDGET_DEEP_MS, async () => {
      try {
        let session = corps.sessionId ? await db.session.findUnique({ where: { id: corps.sessionId } }) : null;
        if (!session) {
          const compte = await utilisateurDeReq(req).catch(() => null);
          session = await db.session.create({
            data: {
              mode: 'deep',
              anonymized: !compte,
              userConsent: !!compte,
              expiresAt: new Date(Date.now() + PURGE_SESSIONS_JOURS * 24 * 3600 * 1000),
              ...(compte ? { userId: compte.id } : {}),
            },
          });
        } else {
          const compte = await utilisateurDeReq(req).catch(() => null);
          if (compte && !session.userId) {
            session = await db.session.update({ where: { id: session.id }, data: { userId: compte.id, anonymized: false, userConsent: true } });
          }
        }
        let etat: EtatDeep = session.deepState
          ? (JSON.parse(session.deepState) as EtatDeep)
          : { niveau: 1, echangeId: '', question: '' };

        const verifierDetresse = async (texte: string): Promise<boolean> => {
          const p0 = await phase0(texte);
          db.logsDetresse.create({
            data: { questionHash: hashQuestion(texte), scoreCoucheA: p0.a, scoreCoucheB: p0.b, scoreCoucheC: p0.c, decision: p0.decision },
          }).catch(() => {});
          if (p0.decision === 'distress') {
            send('distress', { message: MESSAGE_DEDETRESSE, resources: RESSOURCES_DEDETRESSE });
            send('final', { echangeId: etat.echangeId, sessionId: session!.id, niveau, perspectiveDisponible: false });
            return true;
          }
          if (p0.decision === 'review') {
            send('distress', { message: MESSAGE_PRUDENT, resources: RESSOURCES_DEDETRESSE, prudent: true });
            send('final', { echangeId: etat.echangeId, sessionId: session!.id, niveau, perspectiveDisponible: false });
            return true;
          }
          return false;
        };

        // ── NIVEAU 1 : ouverture contemplative ──
        if (niveau === 1) {
          const question = (corps.question || '').trim();
          if (!question || question.length > 2000) {
            send('erreur', { message: 'Question invalide (1 à 2000 caractères).' });
            return;
          }
          etat = { niveau: 1, echangeId: '', question };

          status('détresse');
          if (await verifierDetresse(question)) return;

          const echange1 = await db.echange.create({
            data: { sessionId: session.id, question, mode: 'deep', audioActive: corps.audioActive || false, distressFlagged: false, etape: 1 },
          });
          etat.echangeId = echange1.id;

          let histoire1 = '';
          let perspective1 = '';
          for await (const ev of fluxNarratif(question, { modeCorpus: 'adulte', contexte: 'démarche contemplative, ton lent' })) {
            if (ev.type === 'parabole') {
              etat.paraboleId = ev.id;
              etat.paraboleTexte = ev.enonce;
              etat.interpretation1 = ev.interpretation;
              etat.culture = ev.culture;
            }
            if (ev.type === 'histoire') histoire1 += ev.chunk;
            if (ev.type === 'perspective') perspective1 = ev.text;
            send(ev.type, ev);
            if (ev.type === 'histoire') await pause(70); // rythme plus lent, audio plus présent
          }

          // journalisation complète du niveau 1 (parabole → histoire → perspective)
          db.echange.update({
            where: { id: echange1.id },
            data: {
              paraboleId: etat.paraboleId || null,
              interpretation: etat.interpretation1 || null,
              histoire: histoire1 || null,
              perspective: perspective1 || null,
              payload: JSON.stringify({ type: 'deep-ouverture' }),
            },
          }).catch(() => {});

          etat.niveau = 2;
          await db.session.update({ where: { id: session.id }, data: { deepState: JSON.stringify(etat) } });
          send('final', { echangeId: echange1.id, sessionId: session.id, niveau: 1, suiteDisponible: true, perspectiveDisponible: false });
          return;
        }

        // ── NIVEAU 2 : méditation guidée + deuxième interprétation ──
        if (niveau === 2) {
          const reponse2 = (corps.reponse || '').trim();
          if (!etat.paraboleId) {
            send('erreur', { message: 'Commence par le niveau 1 avec ta question.' });
            return;
          }
          if (reponse2 && (await verifierDetresse(reponse2))) return;

          status('méditation');
          const meditation = await llmChat(
            [
              {
                role: 'system',
                content:
                  "Tu es une voix contemplative du SPU (mode Deep). Écris une méditation guidée de 80 à 120 mots, en français, au présent, tournée vers l'intérieur : respiration, sensations, image de la parabole qui se dépose. Aucun conseil, aucune injonction, aucune promesse. Ton : apaisé, lent, poétique mais simple. Réponds avec le texte seul.",
              },
              {
                role: 'user',
                content: `Question de la personne : ${etat.question}\nParabole : « ${etat.paraboleTexte} »\nPremière interprétation reçue : ${etat.interpretation1}\nCe qu'elle a noté entre-temps (optionnel) : ${reponse2 || 'rien'}`,
              },
            ],
            { timeoutMs: 20000, temperature: 0.8, maxTokens: 320 }
          );
          etat.meditation = meditation.trim();
          for (const chunk of chunker(etat.meditation, 3)) {
            send('meditation', { chunk });
            await pause(80);
          }

          // deuxième couche d'introspection : autre interprétation de la même parabole
          const parabole = await db.parabole.findUnique({ where: { id: etat.paraboleId } });
          if (parabole) {
            const interps = JSON.parse(parabole.interpretations) as string[];
            const interpretation2 = interps.find((i) => i !== etat.interpretation1) || etat.interpretation1 || '';
            send('parabole', {
              id: parabole.id, code: parabole.code, enonce: parabole.texte,
              interpretation: interpretation2, culture: parabole.culture,
              famille: `${parabole.famille} — couche 2`,
              sources: JSON.parse(parabole.sources), score: 0.9, sousSeuil: false,
            });
            await db.echange.create({
              data: {
                sessionId: session.id, question: reponse2 || '(silence contemplatif)', mode: 'deep', etape: 2,
                paraboleId: parabole.id, interpretation: interpretation2, histoire: etat.meditation,
                audioActive: corps.audioActive || false,
                payload: JSON.stringify({ type: 'deep-mediation' }),
              },
            });
          }

          etat.niveau = 3;
          await db.session.update({ where: { id: session.id }, data: { deepState: JSON.stringify(etat) } });
          send('final', { echangeId: etat.echangeId, sessionId: session.id, niveau: 2, suiteDisponible: true, perspectiveDisponible: false });
          return;
        }

        // ── NIVEAU 3 : mise en perspective finale ──
        const reponse3 = (corps.reponse || '').trim();
        if (!etat.paraboleId) {
          send('erreur', { message: 'Commence par le niveau 1 avec ta question.' });
          return;
        }
        if (reponse3 && (await verifierDetresse(reponse3))) return;

        status('perspective');
        const perspective = await llmChat(
          [
            {
              role: 'system',
              content:
                "Tu es la voix conclusive du SPU (mode Deep). Produis une mise en perspective finale de 60 à 100 mots en français : relie délicatement la parabole, la méditation et le cheminement de la personne, SANS conclure à sa place, SANS conseil. Termine en laissant le cadre ouvert. Réponds avec le texte seul.",
            },
            {
              role: 'user',
              content: `Question : ${etat.question}\nParabole : « ${etat.paraboleTexte} »\nMéditation déjà offerte : ${etat.meditation || ''}\nCe que la personne note à la fin : ${reponse3 || 'rien'}`,
            },
          ],
          { timeoutMs: 20000, temperature: 0.7, maxTokens: 260 }
        );
        send('perspective', { text: perspective.trim() });
        send('question-ouverte', { text: QUESTION_OUVERTE_FINALE });

        const echange3 = await db.echange.create({
          data: {
            sessionId: session.id, question: reponse3 || '(silence contemplatif)', mode: 'deep', etape: 3,
            paraboleId: etat.paraboleId, interpretation: etat.interpretation1 || null,
            histoire: perspective.trim(), audioActive: corps.audioActive || false,
            payload: JSON.stringify({ type: 'deep-perspective' }),
          },
        });

        etat.niveau = 1; // prêt pour un nouveau cycle
        await db.session.update({ where: { id: session.id }, data: { deepState: JSON.stringify(etat) } });
        send('final', { echangeId: echange3.id, sessionId: session.id, niveau: 3, suiteDisponible: false, perspectiveDisponible: false });
      } catch (err) {
        console.error('[api/deep]', err);
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

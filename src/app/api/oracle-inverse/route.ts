// POST /api/oracle-inverse — LE MODE ORACLE INVERSÉ (v6.0, remplace le mode Deep)
// Renversement complet de la démarche :
//   Étape 1 — le SPU présente UNE SEULE PARABOLE (énoncé + culture), SANS
//             interprétation, et demande à la personne ce qu'elle en comprend.
//   Étape 2 — la réponse de la personne est ANALYSÉE : comparée aux diverses
//             interprétations de la parabole selon les intelligences réflexives
//             (corpus + analyse), puis le SPU donne LA BONNE INTERPRÉTATION,
//             une APPRÉCIATION chaleureuse de la réponse (jamais rabaisser) et
//             une ORIENTATION née du rapprochement réponse ↔ parabole.

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { phase0 } from '@/lib/spu/distress';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { hashQuestion, verifierRateLimit } from '@/lib/spu/sources';
import { trouverParabole } from '@/lib/spu/matching';
import { llmChat, extractJson } from '@/lib/spu/llm';
import { avecBudget, BUDGET_DEEP_MS } from '@/lib/spu/budget';
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
  theme?: string; // facultatif : ce qui traverse la personne oriente la parabole
  reponse?: string; // étape 2 : ce que la personne comprend de la parabole
  etape?: number;
  sessionId?: string;
  audioActive?: boolean;
}

interface EtatOracleInverse {
  etape: number;
  echangeId: string;
  theme: string;
  paraboleId?: string;
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

  const etape = Math.min(2, Math.max(1, corps.etape || 1));
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const status = (step: string) => send('status', { step });

      await avecBudget(BUDGET_DEEP_MS, async () => {
      try {
        // ── Session + état (colonne oracleState) ──
        const compte = await utilisateurDeReq(req).catch(() => null);
        let session = corps.sessionId ? await db.session.findUnique({ where: { id: corps.sessionId } }) : null;
        if (!session) {
          session = await db.session.create({
            data: {
              mode: 'oracle-inverse',
              anonymized: !compte,
              userConsent: !!compte,
              expiresAt: new Date(Date.now() + PURGE_SESSIONS_JOURS * 24 * 3600 * 1000),
              ...(compte ? { userId: compte.id } : {}),
            },
          });
        } else {
          const compte2 = await utilisateurDeReq(req).catch(() => null);
          if (compte2 && !session.userId) {
            session = await db.session.update({ where: { id: session.id }, data: { userId: compte2.id, anonymized: false, userConsent: true } });
          }
        }
        let etat: EtatOracleInverse = session.oracleState
          ? (JSON.parse(session.oracleState) as EtatOracleInverse)
          : { etape: 1, echangeId: '', theme: '' };

        const verifierDetresse = async (texte: string): Promise<boolean> => {
          const p0 = await phase0(texte);
          db.logsDetresse.create({
            data: { questionHash: hashQuestion(texte), scoreCoucheA: p0.a, scoreCoucheB: p0.b, scoreCoucheC: p0.c, decision: p0.decision },
          }).catch(() => {});
          if (p0.decision === 'distress') {
            send('distress', { message: MESSAGE_DEDETRESSE, resources: RESSOURCES_DEDETRESSE });
            send('final', { echangeId: etat.echangeId, sessionId: session!.id, etape, perspectiveDisponible: false });
            return true;
          }
          if (p0.decision === 'review') {
            send('distress', { message: MESSAGE_PRUDENT, resources: RESSOURCES_DEDETRESSE, prudent: true });
            send('final', { echangeId: etat.echangeId, sessionId: session!.id, etape, perspectiveDisponible: false });
            return true;
          }
          return false;
        };

        // ── ÉTAPE 1 : LA PARABOLE SEULE, SANS INTERPRÉTATION ──
        if (etape === 1) {
          const theme = (corps.theme || '').trim().slice(0, 2000);
          status('parabole');

          // sélection : le thème oriente le choix ; sans thème, tirage dans le corpus
          let parabole = null;
          if (theme) {
            try {
              const match = await trouverParabole(theme, theme, 'adulte');
              if (match?.id) parabole = await db.parabole.findUnique({ where: { id: match.id } });
            } catch {
              /* tirage au sort ci-dessous */
            }
          }
          if (!parabole) {
            const candidates = await db.parabole.findMany({ where: { mode: 'adulte', statut: 'validated' } });
            if (candidates.length) parabole = candidates[Math.floor(Math.random() * candidates.length)];
          }
          if (!parabole) {
            send('erreur', { message: MESSAGE_ERREUR_SOURCES });
            return;
          }

          const ech1 = await db.echange.create({
            data: { sessionId: session.id, question: theme || '(parabole libre sans thème)', mode: 'oracle-inverse', audioActive: corps.audioActive || false, etape: 1 },
          });
          etat = { etape: 2, echangeId: ech1.id, theme, paraboleId: parabole.id };
          await db.session.update({ where: { id: session.id }, data: { oracleState: JSON.stringify(etat) } }).catch(() => {});

          // La parabole arrive NUE : énoncé + culture, JAMAIS d'interprétation ici.
          send('parabole', {
            id: parabole.id,
            code: parabole.code,
            enonce: parabole.texte,
            interpretation: '',
            culture: parabole.culture,
            famille: parabole.famille,
            sources: JSON.parse(parabole.sources),
            score: 1,
            sousSeuil: false,
          });
          send('demande-reflexion', {
            texte:
              'Prends ton temps. Dis-moi avec tes mots ce que cette parabole te fait comprendre — une image, une leçon, un souvenir, tout compte.',
          });

          db.echange.update({
            where: { id: ech1.id },
            data: { paraboleId: parabole.id, payload: JSON.stringify({ type: 'oracle-inverse-ouverture', theme }) },
          }).catch(() => {});

          send('final', { echangeId: ech1.id, sessionId: session.id, etape: 1, suiteDisponible: true, perspectiveDisponible: false });
          return;
        }

        // ── ÉTAPE 2 : ANALYSE DE LA RÉPONSE + BONNE INTERPRÉTATION + APPRÉCIATION + ORIENTATION ──
        const reponse = (corps.reponse || '').trim();
        if (!etat.paraboleId) {
          send('erreur', { message: 'Commence par recevoir une parabole (étape 1).' });
          return;
        }
        if (!reponse) {
          send('erreur', { message: 'Partage ce que tu as compris de la parabole (même en deux mots).' });
          return;
        }
        if (await verifierDetresse(reponse)) return;

        const parabole = await db.parabole.findUnique({ where: { id: etat.paraboleId } });
        if (!parabole) {
          send('erreur', { message: 'La parabole du parcours est introuvable — recommence un nouveau parcours.' });
          return;
        }

        status('analyse');
        const interps = JSON.parse(parabole.interpretations) as string[];

        // Les intelligences réflexives comparent LA réponse de la personne aux
        // interprétations possibles de LA parabole — une seule passe JSON.
        const consigne = `Tu es le cerveau du SPU (mode Oracle Inversé). Une personne a reçu une parabole SANS interprétation et a partagé sa propre compréhension. Tu dois maintenant analyser sa réponse en t'appuyant sur les diverses interprétations possibles de cette parabole selon les intelligences réflexives.

PARABOLE : « ${parabole.texte} » (culture : ${parabole.culture})
INTERPRÉTATIONS RÉFLEXIVES POSSIBLES :
${interps.map((i, n) => `[${n + 1}] ${i}`).join('\n')}

COMPRÉHENSION DE LA PERSONNE : ${reponse.slice(0, 1500)}

Règles ABSOLUES :
• JAMAIS de rabaissement : la réponse de la personne est toujours valorisée d'abord (ce qu'elle a vu juste, ce qui résonne), puis nuancée avec douceur si une lecture est incomplète ou différente.
• La « bonne interprétation » est celle du corpus (la plus juste traditionnellement), résumée simplement.
• L'« orientation » est une suite concrète et encourageante qui part du RAPPROCHEMENT entre ce qu'elle a compris et la parabole (ce que sa lecture révèle d'elle, et quoi faire de cette découverte dans les jours qui viennent).
• Écris en français, tutoiement chaleureux, pas d'emoji, pas de markdown.

Réponds UNIQUEMENT avec un JSON exact :
{"comprehension": "l'écho fidèle de sa lecture en 1-2 phrases (ce qu'elle a vu, nommé avec bienveillance)",
"appreciation": "l'appréciation valorisante de SA réponse : points forts, ce qui résonne avec les interprétations réflexives, nuances éventuelles — 3 à 5 phrases",
"interpretation_juste": "la bonne interprétation de la parabole, claire et vivante — 3 à 5 phrases",
"autres_eclairages": ["un autre éclairage possible", "un autre éclairage possible"],
"orientation": "l'orientation née du rapprochement sa réponse ↔ parabole : ce que cela révèle et la démarche à poser — 3 à 5 phrases"}`;

        const brut = await llmChat([{ role: 'user', content: consigne }], { timeoutMs: 26000, temperature: 0.7, maxTokens: 1400 });
        const j = extractJson<{
          comprehension?: string;
          appreciation?: string;
          interpretation_juste?: string;
          autres_eclairages?: string[];
          orientation?: string;
        }>(brut);

        const comprehension = (j?.comprehension || `Tu as retenu : ${reponse.slice(0, 300)}`).trim();
        const appreciation = (j?.appreciation || 'Ta lecture porte ta propre signature — et c\'est précisément ce qui la rend précieuse.').trim();
        const interpretationJuste = (j?.interpretation_juste || interps[0] || '').trim();
        const autres = (j?.autres_eclairages || interps.slice(1, 3)).filter((s) => typeof s === 'string' && s.trim()).slice(0, 2);
        const orientation = (j?.orientation || 'Reprends un instant la parabole en toi : elle peut te servir de boussole pour la journée qui vient.').trim();

        send('oracle-analyse', {
          comprehension,
          appreciation,
          interpretation: interpretationJuste,
          autres,
          orientation,
          parabole: { id: parabole.id, code: parabole.code, enonce: parabole.texte, culture: parabole.culture },
        });

        const ech2 = await db.echange.create({
          data: {
            sessionId: session.id, question: reponse, mode: 'oracle-inverse', etape: 2,
            paraboleId: parabole.id,
            interpretation: interpretationJuste,
            histoire: appreciation,
            perspective: orientation,
            audioActive: corps.audioActive || false,
            payload: JSON.stringify({ type: 'oracle-inverse-analyse', comprehension, autres }),
          },
        });

        etat = { etape: 1, echangeId: '', theme: '' }; // prêt pour un nouveau parcours
        await db.session.update({ where: { id: session.id }, data: { oracleState: JSON.stringify(etat) } }).catch(() => {});
        send('final', { echangeId: ech2.id, sessionId: session.id, etape: 2, perspectiveDisponible: false });
      } catch (err) {
        console.error('[api/oracle-inverse]', err);
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

// POST /api/perspective — Mise en perspective d'un échange (Partie 15.2)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { llmChat } from '@/lib/spu/llm';
import { verifierRateLimit } from '@/lib/spu/sources';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!verifierRateLimit(ip)) return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 });

    const { echangeId } = (await req.json()) as { echangeId?: string };
    if (!echangeId) return NextResponse.json({ error: 'echangeId requis' }, { status: 400 });

    const echange = await db.echange.findUnique({ where: { id: echangeId }, include: { parabole: true } });
    if (!echange || !echange.parabole) return NextResponse.json({ error: 'Échange introuvable' }, { status: 404 });

    const perspective = await llmChat(
      [
        {
          role: 'system',
          content:
            "Tu es le SPU en mode \"mise en perspective\". À partir de la question, de la parabole et de l'histoire, offre un regard complémentaire de 80 à 120 mots en français : un autre angle, une résonance inattendue, sans conseil, sans jugement, sans position. Ne répète pas l'histoire. Termine par une phrase qui rend la parole à l'utilisateur (sans question pressante). Réponds avec le texte seul.",
        },
        {
          role: 'user',
          content: `Question : ${echange.question || ''}\nParabole : « ${echange.parabole.texte} »\nInterprétation : ${echange.interpretation || ''}\nHistoire : ${(echange.histoire || '').slice(0, 600)}`,
        },
      ],
      { timeoutMs: 25000, temperature: 0.8, maxTokens: 300 }
    );

    return NextResponse.json({ perspective: perspective.trim() });
  } catch (err) {
    console.error('[api/perspective]', err);
    return NextResponse.json({ error: "La perspective n'est pas disponible pour l'instant. Réessaie dans un instant." }, { status: 503 });
  }
}

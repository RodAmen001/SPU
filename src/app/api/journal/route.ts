// GET /api/journal?sessionId=… — Journal de bord (Partie 6.1 du cahier)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FAMILLES } from '@/lib/spu/constants';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        echanges: {
          orderBy: { createdAt: 'desc' },
          include: { parabole: { select: { code: true, texte: true, culture: true, famille: true } } },
        },
      },
    });
    if (!session) return NextResponse.json({ echanges: [] });

    return NextResponse.json({
      sessionId: session.id,
      cree: session.createdAt,
      expire: session.expiresAt,
      echanges: session.echanges.map((e) => ({
        id: e.id,
        date: e.createdAt,
        mode: e.mode,
        etape: e.etape,
        question: e.question,
        synthese: e.synthese,
        sources: (() => { try { return JSON.parse(e.sourcesReponse || '[]'); } catch { return []; } })(),
        parabole: e.parabole
          ? {
              code: e.parabole.code,
              enonce: e.parabole.texte,
              culture: e.parabole.culture,
              famille: `${e.parabole.famille} — ${FAMILLES[e.parabole.famille] || ''}`,
            }
          : null,
        interpretation: e.interpretation,
        histoire: e.histoire,
      })),
    });
  } catch (err) {
    console.error('[api/journal]', err);
    return NextResponse.json({ error: 'Journal indisponible' }, { status: 500 });
  }
}

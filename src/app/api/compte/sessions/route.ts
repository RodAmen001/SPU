// GET /api/compte/sessions?sessionId=… — Journal d'une session rattachée au compte
// (lecture protégée : le propriétaire du compte uniquement) — pour rouvrir une
// session sauvegardée depuis n'importe quel appareil.
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { FAMILLES } from '@/lib/spu/constants';

export async function GET(req: NextRequest) {
  try {
    const user = await utilisateurDeReq(req);
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });

    const session = await db.session.findFirst({
      where: { id: sessionId, userId: user.id },
      include: {
        echanges: {
          orderBy: { createdAt: 'asc' },
          include: { parabole: { select: { code: true, texte: true, culture: true, famille: true } } },
        },
      },
    });
    if (!session) return NextResponse.json({ error: 'Session introuvable dans ton compte' }, { status: 404 });

    return NextResponse.json({
      sessionId: session.id,
      cree: session.createdAt,
      mode: session.mode,
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
    console.error('[api/compte/sessions]', err);
    return NextResponse.json({ error: 'Lecture impossible' }, { status: 500 });
  }
}

// GET /api/compte/moi — Profil authentifié + résumé des sessions rattachées
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { utilisateurDeReq } from '@/lib/spu/compte';

export async function GET(req: NextRequest) {
  try {
    const user = await utilisateurDeReq(req);
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    const sessions = await db.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, mode: true, _count: { select: { echanges: true } } },
      take: 50,
    });
    return NextResponse.json({
      utilisateur: { pseudo: user.pseudo, cree: user.createdAt },
      sessions: sessions.map((s) => ({
        id: s.id,
        cree: s.createdAt,
        mode: s.mode,
        echanges: s._count.echanges,
      })),
    });
  } catch (err) {
    console.error('[api/compte/moi]', err);
    return NextResponse.json({ error: 'Profil indisponible' }, { status: 500 });
  }
}

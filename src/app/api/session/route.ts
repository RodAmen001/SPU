// DELETE /api/session?sessionId=… — Droit à l'effacement RGPD (Partie 7.6)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });
    const supprime = await db.session.delete({ where: { id: sessionId } }).catch(() => null);
    if (!supprime) return NextResponse.json({ ok: true, message: 'Session déjà inexistante' });
    return NextResponse.json({ ok: true, message: 'Session et journal supprimés définitivement' });
  } catch (err) {
    console.error('[api/session]', err);
    return NextResponse.json({ error: "La suppression a échoué" }, { status: 500 });
  }
}

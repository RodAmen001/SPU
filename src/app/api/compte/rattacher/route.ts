// POST /api/compte/rattacher — Exporte la (ou les) session(s) anonyme(s) courante(s)
// vers le compte SPU de l'utilisateur authentifié : elles y sont conservées et
// récupérables depuis n'importe quel appareil. {sessionId} ou {sessions: [...]}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { PURGE_SESSIONS_JOURS } from '@/lib/spu/constants';

export async function POST(req: NextRequest) {
  try {
    const user = await utilisateurDeReq(req);
    if (!user) return NextResponse.json({ error: 'Connecte-toi d\'abord à ton compte SPU.' }, { status: 401 });

    const corps = (await req.json().catch(() => ({}))) as { sessionId?: string; sessions?: string[] };
    const ids = [...new Set([...(corps.sessions || []), ...(corps.sessionId ? [corps.sessionId] : [])])].filter(Boolean);
    if (!ids.length) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });

    // Seules les sessions anonymes (non rattachées à un autre compte) sont exportables.
    const resultat = await db.session.updateMany({
      where: { id: { in: ids }, userId: null },
      data: {
        userId: user.id,
        anonymized: false,
        userConsent: true,
        expiresAt: new Date(Date.now() + PURGE_SESSIONS_JOURS * 24 * 3600 * 1000), // durée étendue sur compte
      },
    });
    const rattachees = resultat.count;
    return NextResponse.json({
      ok: true,
      rattachees,
      message: rattachees > 0
        ? `${rattachees} session${rattachees > 1 ? 's exportée' + (rattachees > 1 ? 's' : '') : ''} vers ton compte SPU. Tu la retrouveras dans « Mon compte », depuis n'importe quel appareil.`
        : 'Aucune session à exporter (déjà rattachée ou introuvable).',
    });
  } catch (err) {
    console.error('[api/compte/rattacher]', err);
    return NextResponse.json({ error: "L'export vers le compte a échoué" }, { status: 500 });
  }
}

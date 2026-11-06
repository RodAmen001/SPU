// POST /api/compte/sauvegarder — copie le journal de la session anonyme
// dans le compte SPU connecté (droit à la portabilité, RGPD 6.2)
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { versEchangeExport } from '@/lib/spu/export-format';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const compte = await utilisateurDeReq(req);
    if (!compte) return NextResponse.json({ error: 'Connecte-toi d’abord à ton compte SPU.' }, { status: 401 });

    const { sessionId, titre } = (await req.json()) as { sessionId?: string; titre?: string };
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        echanges: {
          orderBy: { createdAt: 'asc' },
          include: { parabole: { select: { code: true, texte: true, culture: true, famille: true } } },
        },
      },
    });
    if (!session || !session.echanges.length) {
      return NextResponse.json({ error: 'Journal introuvable ou vide' }, { status: 404 });
    }

    const echanges = session.echanges.map((e) => versEchangeExport(e));
    const date = new Date().toLocaleDateString('fr-FR');
    const sauvegarde = await db.sauvegarde.create({
      data: {
        compteId: compte.id,
        titre: (titre || `Journal du ${date} — ${session.echanges.length} échange(s)`).slice(0, 120),
        mode: session.mode || 'oracle',
        nbEchanges: echanges.length,
        payload: JSON.stringify({ exporte: new Date().toISOString(), mode: session.mode, echanges }),
      },
    });
    const nb = await db.sauvegarde.count({ where: { compteId: compte.id } });
    return NextResponse.json({ ok: true, id: sauvegarde.id, titre: sauvegarde.titre, nbEchanges: sauvegarde.nbEchanges, total: nb });
  } catch (err) {
    console.error('[api/compte/sauvegarder]', err);
    return NextResponse.json({ error: "La sauvegarde a échoué" }, { status: 500 });
  }
}

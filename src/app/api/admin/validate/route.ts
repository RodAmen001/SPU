// POST /api/admin/validate — Validation manuelle des paraboles en quarantaine (Partie 15.5)
// Réservé au token ADMIN_TOKEN (variable d'environnement).
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const { quarantaineId, decision, motif } = (await req.json()) as { quarantaineId?: string; decision?: string; motif?: string };
    if (!quarantaineId || !['validated', 'rejected'].includes(decision || '')) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    await db.quarantaine.update({
      where: { id: quarantaineId },
      data: { statut: decision!, motifRejet: decision === 'rejected' ? motif : null, reviewedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[api/admin/validate]', err);
    return NextResponse.json({ error: "La validation a échoué" }, { status: 500 });
  }
}

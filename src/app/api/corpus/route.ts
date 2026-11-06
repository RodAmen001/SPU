// GET /api/corpus — Consultation du corpus (public, consultable hors-ligne via SW)
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FAMILLES } from '@/lib/spu/constants';

export async function GET() {
  try {
    const paraboles = await db.parabole.findMany({
      where: { statut: { in: ['validated', 'pending'] } },
      orderBy: { code: 'asc' },
      select: { code: true, texte: true, culture: true, famille: true, interpretations: true, sources: true, mode: true, statut: true, dateAjout: true },
    });
    return NextResponse.json({
      familles: Object.entries(FAMILLES).map(([code, nom]) => ({ code, nom })),
      total: paraboles.length,
      paraboles: paraboles.map((p) => ({
        ...p,
        interpretations: (() => { try { return JSON.parse(p.interpretations); } catch { return []; } })(),
        sources: (() => { try { return JSON.parse(p.sources); } catch { return []; } })(),
      })),
    });
  } catch (err) {
    console.error('[api/corpus]', err);
    return NextResponse.json({ error: 'Corpus indisponible' }, { status: 500 });
  }
}

// GET /api/health — État des sources (Partie 15.4) — ping léger, caché 5 min
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

let cache: { t: number; data: Record<string, unknown> } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.t < 5 * 60 * 1000) {
    return NextResponse.json(cache.data);
  }
  const data: Record<string, unknown> = { status: 'ok', checkedAt: new Date().toISOString() };
  try {
    data.sources = {
      baseDeDonnees: 'up',
      corpus: await db.parabole.count(),
      note: "Wikipedia et la Recherche Web passent par le lecteur SDK (accès direct à Wikimedia limité dans l'environnement)",
    };
    cache = { t: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    data.status = 'degraded';
    data.sources = { baseDeDonnees: 'down' };
    return NextResponse.json(data, { status: 200 });
  }
}

// GET /api/health — État des sources (Partie 15.4) — ping léger, caché 5 min
// v4.9 (exigence du bilan de test) : les sondes sont RÉELLES — chaque source
// externe est testée en direct, pour qu'une panne devienne visible le jour où
// elle arrive, pas des semaines plus tard.
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UA_SPU } from '@/lib/spu/constants';

let cache: { t: number; data: Record<string, unknown> } | null = null;

async function sondeWikipedia(): Promise<boolean> {
  try {
    const url = 'https://fr.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&srsearch=parabole';
    const res = await fetch(url, { headers: { 'User-Agent': UA_SPU, 'Api-User-Agent': UA_SPU }, signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function sondePollinations(): Promise<boolean> {
  try {
    const res = await fetch('https://text.pollinations.ai/models', { signal: AbortSignal.timeout(6000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function sondeDuckDuckGo(): Promise<boolean> {
  try {
    const res = await fetch('https://api.duckduckgo.com/?q=parabole&format=json&no_html=1', { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  if (cache && Date.now() - cache.t < 5 * 60 * 1000) {
    return NextResponse.json(cache.data);
  }
  const data: Record<string, unknown> = { status: 'ok', checkedAt: new Date().toISOString() };
  try {
    const [wiki, poll, ddg] = await Promise.all([sondeWikipedia(), sondePollinations(), sondeDuckDuckGo()]);
    const sondes = { wikipédia: wiki ? 'ok' : 'ko', 'ia-libre': poll ? 'ok' : 'ko', duckduckgo: ddg ? 'ok' : 'ko' };
    data.sources = {
      baseDeDonnees: 'up',
      corpus: await db.parabole.count(),
      sondes,
      note: 'Sondes actives : chaque source externe est testée réellement (identification User-Agent conforme pour Wikipédia). « ko » peut être un incident temporaire.',
    };
    if (!wiki && !poll) data.status = 'degraded';
    cache = { t: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    data.status = 'degraded';
    data.sources = { baseDeDonnees: 'down' };
    return NextResponse.json(data, { status: 200 });
  }
}

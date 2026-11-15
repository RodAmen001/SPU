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
    // v4.9 : sonde RÉELLE — une vraie génération, pas juste /models (qui peut
    // répondre ok pendant que la génération est limitée par le quota anonyme).
    const res = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai-fast', messages: [{ role: 'user', content: 'ping' }], max_tokens: 5, private: true }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sondeGithubModels(): Promise<boolean> {
  const jeton = process.env.GITHUB_MODELS_TOKEN || '';
  if (!jeton) return false; // moteur non configuré — la sonde le signale comme ko
  try {
    const res = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.GITHUB_MODELS_MODELE || 'openai/gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }),
      signal: AbortSignal.timeout(8000),
    });
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
    const [wiki, poll, gh, ddg] = await Promise.all([sondeWikipedia(), sondePollinations(), sondeGithubModels(), sondeDuckDuckGo()]);
    const sondes = {
      wikipédia: wiki ? 'ok' : 'ko',
      'ia-pollinations': poll ? 'ok' : 'ko',
      'ia-github-models': gh ? 'ok' : 'ko',
      duckduckgo: ddg ? 'ok' : 'ko',
    };
    data.sources = {
      baseDeDonnees: 'up',
      corpus: await db.parabole.count(),
      sondes,
      note: 'Sondes actives : chaque source est testée par une vraie requête (génération réelle pour les IA, identification User-Agent conforme pour Wikipédia). « ko » peut être un incident temporaire.',
    };
    if (!wiki && !poll && !gh) data.status = 'degraded';
    cache = { t: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    data.status = 'degraded';
    data.sources = { baseDeDonnees: 'down' };
    return NextResponse.json(data, { status: 200 });
  }
}

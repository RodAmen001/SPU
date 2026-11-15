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
    // v5.0 : sonde RÉELLE via l'endpoint GET (le POST /openai avec `private`
    // renvoie désormais 402 depuis les IP d'hébergement — même mécanisme que
    // les sources du pipeline).
    const res = await fetch('https://text.pollinations.ai/Dis%20bonjour%20en%20un%20mot?model=openai-fast', {
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sondeGithubModels(): Promise<string> {
  const jeton = process.env.GITHUB_MODELS_TOKEN || '';
  if (!jeton) return 'ko (GITHUB_MODELS_TOKEN non configuré)';
  // v5.0 : le premier modèle de la liste de rotation suffit à la sonde
  const modele = (process.env.GITHUB_MODELS_MODELES || 'openai/gpt-4o-mini,openai/gpt-4.1-nano,openai/gpt-4.1-mini,openai/gpt-4o').split(',')[0].trim();
  try {
    const res = await fetch('https://models.github.ai/inference/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modele, messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? 'ok' : `ko (${modele} HTTP ${res.status})`;
  } catch {
    return `ko (${modele} réseau)`;
  }
}

async function sondeGroq(): Promise<string> {
  const cle = process.env.GROQ_API_KEY || '';
  if (!cle) return 'ko (GROQ_API_KEY non configurée)';
  // v5.0 : les modèles Groq évoluent — on essaie la même liste de rotation que
  // le moteur et on signale celui qui répond.
  const modeles = (process.env.GROQ_MODELES ||
    'llama-3.1-8b-instant,llama-3.3-70b-versatile,openai/gpt-oss-20b,meta-llama/llama-4-scout-17b-16e-instruct,deepseek-r1-distill-llama-70b')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const echecs: string[] = [];
  for (const modele of modeles) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modele, messages: [{ role: 'user', content: 'ping' }], max_tokens: 5 }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return `ok (${modele})`;
      echecs.push(`${modele}: HTTP ${res.status}`);
    } catch {
      echecs.push(`${modele}: réseau`);
    }
  }
  return `ko (${echecs.join(' ; ')})`;
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
    const [wiki, poll, gh, ddg, groq] = await Promise.all([sondeWikipedia(), sondePollinations(), sondeGithubModels(), sondeDuckDuckGo(), sondeGroq()]);
    const sondes = {
      wikipédia: wiki ? 'ok' : 'ko',
      'ia-pollinations': poll ? 'ok' : 'ko',
      'ia-github-models': gh,
      'ia-groq': groq,
      duckduckgo: ddg ? 'ok' : 'ko',
    };
    data.sources = {
      baseDeDonnees: 'up',
      corpus: await db.parabole.count(),
      sondes,
      note: 'Sondes actives : chaque source est testée par une vraie requête (génération réelle pour les IA, identification User-Agent conforme pour Wikipédia). « ko » peut être un incident temporaire.',
    };
    if (!wiki && !poll && gh !== 'ok') data.status = 'degraded';
    cache = { t: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    data.status = 'degraded';
    data.sources = { baseDeDonnees: 'down' };
    return NextResponse.json(data, { status: 200 });
  }
}

// GET /api/diagnostic — v4.9 : exécute chaque moteur EXACTEMENT comme le
// pipeline et renvoie l'issue réelle de chacun (aucun secret exposé).
// Sert à comprendre pourquoi les sondes passent quand le pipeline échoue.
import { NextResponse } from 'next/server';
import { llmChat, withTimeout } from '@/lib/spu/llm';
import { sourceIaLibre, sourceEncyclopedie, sourceDuckDuckGo } from '@/lib/spu/sources';

export const dynamic = 'force-dynamic';

async function essai(nom: string, fn: () => Promise<string | null>) {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { moteur: nom, issue: r ? 'ok' : 'null/void', ms: Date.now() - t0, extrait: r ? r.slice(0, 110) : null };
  } catch (e) {
    return { moteur: nom, issue: 'erreur', ms: Date.now() - t0, erreur: e instanceof Error ? e.message.slice(0, 140) : String(e).slice(0, 140) };
  }
}

export async function GET() {
  const resultats: unknown[] = [];

  // 1) GitHub Models en direct (les deux hôtes, codes HTTP inclus)
  const jeton = process.env.GITHUB_MODELS_TOKEN || '';
  resultats.push({ moteur: 'env GITHUB_MODELS_TOKEN', issue: jeton ? 'présent' : 'ABSENT' });
  for (const [nom, hote, modele] of [
    ['github.ai', 'https://models.github.ai/inference/chat/completions', 'openai/gpt-4o-mini'],
    ['azure', 'https://models.inference.ai.azure.com/chat/completions', 'gpt-4o-mini'],
  ] as const) {
    if (!jeton) break;
    const t0 = Date.now();
    try {
      const res = await withTimeout(
        fetch(hote, {
          method: 'POST',
          headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modele, messages: [{ role: 'user', content: 'Dis bonjour en un mot.' }], max_tokens: 20 }),
          signal: AbortSignal.timeout(12000),
        }),
        12000, nom
      );
      const j = (await res.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[] };
      resultats.push({ moteur: nom, issue: `HTTP ${res.status}`, ms: Date.now() - t0, extrait: (j.choices?.[0]?.message?.content || '').slice(0, 80) });
    } catch (e) {
      resultats.push({ moteur: nom, issue: 'erreur', ms: Date.now() - t0, erreur: e instanceof Error ? e.message.slice(0, 120) : String(e) });
    }
  }

  // 2) le chemin EXACT du pipeline : llmChat complet (SDK → chaîne de secours)
  resultats.push(await essai('llmChat (chemin pipeline)', () =>
    llmChat([{ role: 'user', content: 'Dis bonjour en un mot.' }], { timeoutMs: 22000, maxTokens: 30 })));

  // 3) les trois sources clés
  resultats.push(await essai('sourceIaLibre', () => sourceIaLibre('Donne un conseil bref et neutre pour garder le moral.')));
  resultats.push(await essai('sourceEncyclopedie', () => sourceEncyclopedie('Quelle est l histoire de la tour Eiffel à Paris ?')));
  resultats.push(await essai('sourceDuckDuckGo', () => sourceDuckDuckGo('Paris')));

  return NextResponse.json({ horodatage: new Date().toISOString(), resultats });
}

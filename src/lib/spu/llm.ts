// Wrapper LLM (SDK z-ai, backend uniquement) + utilitaires JSON/timeout
import ZAI from 'z-ai-web-dev-sdk';

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZai() {
  if (!_zai) _zai = await ZAI.create();
  return _zai;
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'opération'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout ${label} (${ms}ms)`)), ms)),
  ]);
}

/** Appel LLM simple avec timeout, un retry et temporisation sur 429 (quota temporaire). */
export async function llmChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { timeoutMs?: number; temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  const { timeoutMs = 30000, temperature = 0.7, maxTokens = 1200 } = opts;
  const zai = await getZai();
  let derniereErreur: unknown = null;
  for (let essai = 0; essai < 3; essai++) {
    try {
      const call = zai.chat.completions.create({
        messages: messages as never,
        thinking: { type: 'disabled' },
        temperature,
        max_tokens: maxTokens,
      } as never);
      const completion = await withTimeout(call, timeoutMs, 'llm');
      return completion.choices[0]?.message?.content ?? '';
    } catch (e) {
      derniereErreur = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (/429|too many/i.test(msg) && essai < 2) {
        await new Promise((r) => setTimeout(r, 2500 * (essai + 1))); // temporisation progressive
        continue;
      }
      throw e;
    }
  }
  throw derniereErreur;
}

/** Extrait le premier objet JSON d'un texte (robuste aux ```json ... ```). */
export function extractJson<T>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, '```').split('```').join('\n');
  const start = cleaned.indexOf('{');
  if (start === -1) return null;
  // essais progressifs : du 1er "{" au dernier "}" en rétrécissant
  let end = cleaned.lastIndexOf('}');
  while (end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      end = cleaned.lastIndexOf('}', end - 1);
    }
  }
  return null;
}

// Wrapper LLM (SDK z-ai, backend uniquement) + utilitaires JSON/timeout
import ZAI from 'z-ai-web-dev-sdk';

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZai() {
  if (!_zai) _zai = await ZAI.create();
  return _zai;
}

/**
 * Recrée l'instance SDK : si la configuration de l'environnement a été
 * re-provisionnée en cours de session (jeton absent → 401 « missing X-Token »,
 * fichier de config absent), l'ancienne instance mise en cache est morte pour
 * toujours. Un redémarrage du SDK suffit à repartir sur la config fraîche.
 */
function estErreurAuth(msg: string): boolean {
  return /401|403|X-Token|Configuration file|unauthor|forbidden|invalid api key|missing.*token/i.test(msg);
}

export async function recreeZai(): Promise<void> {
  _zai = null;
}

// ── Moteur de secours gratuit, sans clé ni configuration (Pollinations) ──
// Permet au SPU de répondre même HORS Z.AI (hébergement externe, serveur
// personnel, conteneur) : si le SDK z-ai est absent ou rejeté, la synthèse
// passe par ce moteur communautaire libre. Déjà éprouvé par SPU Pocket.
const SECOURS_BASE = 'https://text.pollinations.ai';

async function appelSecours(
  messages: { role: string; content: string }[],
  timeoutMs: number,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const res = await withTimeout(
    fetch(`${SECOURS_BASE}/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, temperature, max_tokens: maxTokens, private: true }),
      signal: AbortSignal.timeout(timeoutMs),
    }),
    timeoutMs,
    'secours',
  );
  if (!res.ok) throw new Error(`secours HTTP ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const texte = j.choices?.[0]?.message?.content ?? '';
  if (!texte) throw new Error('secours réponse vide');
  return texte;
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
  let derniereErreur: unknown = null;
  for (let essai = 0; essai < 4; essai++) {
    try {
      const zai = await getZai();
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
      if (estErreurAuth(msg)) {
        // Config périmée : on jette l'instance et on retente immédiatement avec la fraîche.
        await recreeZai();
        continue;
      }
      if (/429|too many/i.test(msg) && essai < 3) {
        await new Promise((r) => setTimeout(r, 2500 * (essai + 1))); // temporisation progressive
        continue;
      }
      // SDK indisponible (pas de configuration, hébergement externe…) :
      // inutile d'insister, on passe directement au moteur de secours.
      if (/Configuration file|not found|ECONNREFUSED|ENOTFOUND|fetch failed/i.test(msg)) break;
      throw e;
    }
  }
  // ── Secours gratuit (aucune clé requise) : le SPU répond partout ──
  try {
    return await appelSecours(messages, timeoutMs + 20000, temperature, maxTokens);
  } catch {
    throw derniereErreur;
  }
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

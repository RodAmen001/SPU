// Wrapper LLM (SDK z-ai, backend uniquement) + utilitaires JSON/timeout
// v4.6 : respecte le budget de temps global de la requête (budget.ts) —
// un appel qui dépasse son délai utile est abandonné sans insister.
import ZAI from 'z-ai-web-dev-sdk';
import { budgetEpuise, delaiEffectif } from './budget';

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

// ── Moteurs de secours gratuits, sans clé ni configuration ──
// Permet au SPU de répondre même HORS Z.AI (hébergement externe, serveur
// personnel, conteneur). v4.9 (exigence du concepteur) : si Pollinations ne
// répond pas ou est inaccessible, on essaie AUTOMATIQUEMENT le moteur suivant —
// plusieurs modèles d'un même service, puis un appel texte direct. Chaque moteur
// a son délai propre ; la chaîne s'arrête au premier succès ou au budget épuisé.
const SECOURS_BASE = 'https://text.pollinations.ai';

interface CorpsSecours {
  messages: { role: string; content: string }[];
  timeoutMs: number;
  temperature: number;
  maxTokens: number;
}

async function appelPollinations(model: string, c: CorpsSecours): Promise<string> {
  const res = await withTimeout(
    fetch(`${SECOURS_BASE}/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: c.messages, temperature: c.temperature, max_tokens: c.maxTokens, private: true }),
      signal: AbortSignal.timeout(c.timeoutMs),
    }),
    c.timeoutMs,
    'secours',
  );
  if (!res.ok) throw new Error(`secours ${model} HTTP ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const texte = j.choices?.[0]?.message?.content ?? '';
  if (!texte || /^(Free limit|HTTP|Error)/i.test(texte)) throw new Error(`secours ${model} indisponible`);
  return texte;
}

/** Dernier repli : l'API GET simple de Pollinations (chemin différent du POST). */
async function appelPollinationsGet(c: CorpsSecours): Promise<string> {
  const systeme = c.messages.find((m) => m.role === 'system')?.content || '';
  const question = c.messages.filter((m) => m.role !== 'system').map((m) => m.content).join(' ');
  const url = `${SECOURS_BASE}/${encodeURIComponent(question.slice(0, 500))}?model=openai-fast&system=${encodeURIComponent(systeme.slice(0, 400))}&private=true`;
  const res = await withTimeout(fetch(url, { signal: AbortSignal.timeout(c.timeoutMs) }), c.timeoutMs, 'secours-get');
  if (!res.ok) throw new Error(`secours GET HTTP ${res.status}`);
  const t = (await res.text()).trim();
  if (!t || /^(Free limit|HTTP|Error)/i.test(t)) throw new Error('secours GET indisponible');
  return t;
}

/** v4.9 — Moteur « GitHub Models » : inférence incluse dans tout jeton GitHub
 *  (aucune clé supplémentaire à payer). Activé dès que la variable
 *  GITHUB_MODELS_TOKEN est posée sur l'hébergement ; sinon échec immédiat et
 *  passage au moteur suivant — la chaîne reste toujours essayée en entier.
 *  Deux hôtes sont essayés à la suite (résolution DNS variable selon l'hébergeur). */
const HOTES_GITHUB_MODELS = [
  'https://models.github.ai/inference/chat/completions',
  'https://models.inference.ai.azure.com/chat/completions',
];

async function appelGithubModels(c: CorpsSecours): Promise<string> {
  const jeton = process.env.GITHUB_MODELS_TOKEN || '';
  if (!jeton) throw new Error('GITHUB_MODELS_TOKEN non configuré');
  const modele = process.env.GITHUB_MODELS_MODELE || 'openai/gpt-4o-mini';
  const reponseParHote = modele.startsWith('openai/') ? modele.slice('openai/'.length) : modele;
  let derniere = new Error('aucun hôte essayé');
  for (const hote of HOTES_GITHUB_MODELS) {
    // le modèle « openai/gpt-4o-mini » devient « gpt-4o-mini » sur l'hôte Azure historique
    const corpsModele = hote.includes('azure') ? reponseParHote : modele;
    try {
      const res = await withTimeout(
        fetch(hote, {
          method: 'POST',
          headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: corpsModele, messages: c.messages, temperature: c.temperature, max_tokens: c.maxTokens }),
          signal: AbortSignal.timeout(c.timeoutMs),
        }),
        c.timeoutMs,
        'github-models'
      );
      if (!res.ok) throw new Error(`github-models HTTP ${res.status} (${hote.split('/')[2]})`);
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const texte = j.choices?.[0]?.message?.content ?? '';
      if (!texte || /^(Free limit|HTTP|Error)/i.test(texte)) throw new Error('github-models indisponible');
      return texte;
    } catch (e) {
      derniere = e instanceof Error ? e : new Error(String(e));
      continue; // hôte suivant
    }
  }
  throw derniere;
}

// La chaîne : chaque moteur est essayé l'un après l'autre, dans l'ordre —
// GitHub Models d'abord (fiable si configuré), puis Pollinations multi-modèles.
// v4.9 (exigence du concepteur) : jusqu'à ~20 s par moteur est accepté.
const CHAINE_SECOURS: { nom: string; appeler: (c: CorpsSecours) => Promise<string>; delaiMs: number }[] = [
  { nom: 'GitHub Models (openai/gpt-4o-mini)', appeler: appelGithubModels, delaiMs: 20000 },
  { nom: 'Pollinations openai-fast', appeler: (c) => appelPollinations('openai-fast', c), delaiMs: 15000 },
  { nom: 'Pollinations openai', appeler: (c) => appelPollinations('openai', c), delaiMs: 15000 },
  { nom: 'Pollinations texte direct', appeler: appelPollinationsGet, delaiMs: 15000 },
];

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
  if (budgetEpuise()) {
    // Plus de temps utile : on cède tout de suite la place aux modèles locaux.
    throw new Error('budget épuisé — repli local');
  }
  let derniereErreur: unknown = null;
  let retentations429 = 0;
  for (let essai = 0; essai < 4; essai++) {
    const delai = delaiEffectif(timeoutMs);
    if (delai === null) throw new Error('budget épuisé — repli local');
    try {
      const zai = await getZai();
      const call = zai.chat.completions.create({
        messages: messages as never,
        thinking: { type: 'disabled' },
        temperature,
        max_tokens: maxTokens,
      } as never);
      const completion = await withTimeout(call, delai, 'llm');
      return completion.choices[0]?.message?.content ?? '';
    } catch (e) {
      derniereErreur = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (estErreurAuth(msg)) {
        // Config périmée : on jette l'instance et on retente immédiatement avec la fraîche.
        await recreeZai();
        continue;
      }
      if (/429|too many/i.test(msg)) {
        // Quota momentané : UNE seule petite attente, puis on bascule au secours —
        // insister longtemps ne fait que gonfler la latence totale.
        if (retentations429 < 1) {
          retentations429++;
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        break;
      }
      // v4.9 : quelle que soit l'erreur du SDK (configuration absente, hébergement
      // externe, réseau, format inattendu…), on passe TOUJOURS à la chaîne de
      // secours — jamais de rejet direct qui priverait le SPU de ses moteurs.
      break;
    }
  }
  // ── Chaîne de secours gratuite (aucune clé requise) : le SPU répond partout.
  // v4.9 : plusieurs moteurs essayés à la suite — l'échec de l'un bascule sur
  // le suivant, jusqu'à ~20 s de patience acceptées par le concepteur.
  for (const moteur of CHAINE_SECOURS) {
    if (budgetEpuise(3000)) break;
    const delaiSecours = delaiEffectif(Math.min(moteur.delaiMs, timeoutMs + 20000), 2000);
    if (!delaiSecours) break;
    try {
      return await moteur.appeler({ messages, timeoutMs: delaiSecours, temperature, maxTokens });
    } catch (e) {
      derniereErreur = e;
      continue;
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

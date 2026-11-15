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

// v5.0 — Pollinations gratuit : « 1 réponse toutes les 45 secondes par IP »
// (402 « Free limit reached » sinon, vérifié en direct). Un portail partagé
// évite de brûler la fenêtre : un seul appel Pollinations peut réussir par
// question de toute façon — les suivants sautent directement l'étape.
let pollinationsFenetreJusqua = 0;

function pollinationsDisponible(): boolean {
  return Date.now() >= pollinationsFenetreJusqua;
}

function noterReponsePollinations() {
  pollinationsFenetreJusqua = Date.now() + 45000;
}

interface CorpsSecours {
  messages: { role: string; content: string }[];
  timeoutMs: number;
  temperature: number;
  maxTokens: number;
}

async function appelPollinations(model: string, c: CorpsSecours): Promise<string> {
  if (!pollinationsDisponible()) throw new Error('pollinations en fenêtre 45 s (quota gratuit)');
  // v5.0 — plus de paramètre `private` : il déclenche désormais une 402
  // (endpoint devenu payant) depuis les IP d'hébergement.
  const res = await withTimeout(
    fetch(`${SECOURS_BASE}/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: c.messages, temperature: c.temperature, max_tokens: c.maxTokens }),
      signal: AbortSignal.timeout(c.timeoutMs),
    }),
    c.timeoutMs,
    'secours',
  );
  if (!res.ok) throw new Error(`secours ${model} HTTP ${res.status}`);
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const texte = j.choices?.[0]?.message?.content ?? '';
  if (!texte || /^(Free limit|HTTP|Error)/i.test(texte)) throw new Error(`secours ${model} indisponible`);
  noterReponsePollinations();
  return texte;
}

/** Le variant GET simple de Pollinations — le plus fiable depuis les IP
 *  d'hébergement (testé en direct : 200 quasi constant). */
async function appelPollinationsGet(c: CorpsSecours): Promise<string> {
  if (!pollinationsDisponible()) throw new Error('pollinations en fenêtre 45 s (quota gratuit)');
  const systeme = c.messages.find((m) => m.role === 'system')?.content || '';
  const question = c.messages.filter((m) => m.role !== 'system').map((m) => m.content).join(' ');
  const url = `${SECOURS_BASE}/${encodeURIComponent(question.slice(0, 500))}?model=openai-fast&system=${encodeURIComponent(systeme.slice(0, 400))}`;
  const res = await withTimeout(fetch(url, { signal: AbortSignal.timeout(c.timeoutMs) }), c.timeoutMs, 'secours-get');
  if (!res.ok) throw new Error(`secours GET HTTP ${res.status}`);
  const t = (await res.text()).trim();
  if (!t || /^(Free limit|HTTP|Error)/i.test(t)) throw new Error('secours GET indisponible');
  noterReponsePollinations();
  return t;
}

/** v5.0 — Moteur « GitHub Models » : inférence incluse dans tout jeton GitHub
 *  (aucune clé supplémentaire à payer). Deux protections contre le quota
 *  (limite gratuite : ~15 req/min) :
 *  • MODÈLE COLLANT : le dernier modèle qui a répondu est retenu en tête de liste
 *    — en régime stable, chaque appel ne coûte QU'UNE requête de quota ;
 *  • REFROIDISSEMENT : après un 429, GitHub est mis en pause 35 s (la fenêtre de
 *    quota est commune) et la chaîne passe directement à Pollinations — on ne
 *    gaspille plus le quota en essais qui échouent. */
const MODELES_GITHUB = (process.env.GITHUB_MODELS_MODELES ||
  'openai/gpt-4o-mini,openai/gpt-4.1-nano,openai/gpt-4.1-mini,openai/gpt-4o')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

let modeleGithubCollant: string | null = null; // dernier modèle qui a répondu
let githubRefroiditJusqua = 0; // timestamp : pas d'appel GitHub avant ce moment

async function appelGithubModels(c: CorpsSecours): Promise<string> {
  const jeton = process.env.GITHUB_MODELS_TOKEN || '';
  if (!jeton) throw new Error('GITHUB_MODELS_TOKEN non configuré');
  if (Date.now() < githubRefroiditJusqua) throw new Error('github-models en refroidissement (429 récent)');
  // le modèle collant d'abord, puis les autres dans l'ordre de la liste
  const liste = modeleGithubCollant
    ? [modeleGithubCollant, ...MODELES_GITHUB.filter((m) => m !== modeleGithubCollant)]
    : MODELES_GITHUB;
  const fin = Date.now() + c.timeoutMs; // temps total distribué sur les modèles
  let derniere = new Error('aucun modèle essayé');
  for (const modele of liste) {
    const reste = fin - Date.now();
    if (reste < 3000) break; // plus de temps utile pour un nouvel essai
    const delai = Math.min(12000, reste);
    try {
      const res = await withTimeout(
        fetch('https://models.github.ai/inference/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modele, messages: c.messages, temperature: c.temperature, max_tokens: c.maxTokens }),
          signal: AbortSignal.timeout(delai),
        }),
        delai,
        'github-models'
      );
      if (res.status === 429) {
        // fenêtre de quota commune : on refroidit TOUT GitHub et on sort tout de suite
        githubRefroiditJusqua = Date.now() + 35000;
        throw new Error(`github-models ${modele} HTTP 429 — refroidissement 35 s`);
      }
      if (!res.ok) throw new Error(`github-models ${modele} HTTP ${res.status}`);
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const texte = j.choices?.[0]?.message?.content ?? '';
      if (!texte || /^(Free limit|HTTP|Error)/i.test(texte)) throw new Error('github-models indisponible');
      modeleGithubCollant = modele; // succès : ce modèle reste en tête pour la suite
      return texte;
    } catch (e) {
      derniere = e instanceof Error ? e : new Error(String(e));
      if (Date.now() < githubRefroiditJusqua) break; // 429 vient de survenir : stop
      continue; // modèle suivant
    }
  }
  throw derniere;
}

// La chaîne : chaque moteur est essayé l'un après l'autre, dans l'ordre —
// GitHub Models (modèle collant + refroidissement), puis le GET Pollinations
// (le plus fiable depuis les IP d'hébergement), puis les POST Pollinations.
// v5.0 (exigence du concepteur) : jusqu'à ~20 s par moteur est accepté.
const CHAINE_SECOURS: { nom: string; appeler: (c: CorpsSecours) => Promise<string>; delaiMs: number }[] = [
  { nom: 'GitHub Models (rotation multi-modèles)', appeler: appelGithubModels, delaiMs: 20000 },
  { nom: 'Pollinations texte direct (GET)', appeler: appelPollinationsGet, delaiMs: 15000 },
  { nom: 'Pollinations openai-fast (POST)', appeler: (c) => appelPollinations('openai-fast', c), delaiMs: 15000 },
  { nom: 'Pollinations openai (POST)', appeler: (c) => appelPollinations('openai', c), delaiMs: 15000 },
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

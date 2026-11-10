// PHASE 1 — Orchestration multi-IA (3.2) + PHASE 2 — Synthèse (3.3)
// Sources (sans clés API) :
//   1. Recherche Web (web_search du SDK)
//   2. Intelligence réflexive (LLM intégré)
//   3. Encyclopédie (Wikipedia via page_reader du SDK — accès direct 429 en sandbox)
//   4. DuckDuckGo Instant Answer API (accès direct)
// Règles : parallélisation Promise.allSettled, timeout 8 s/source, cache 24 h par hash,
// rate limiting 20 req/min/IP, aucune donnée personnelle transmise.

import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { llmChat, getZai, withTimeout, extractJson } from './llm';
import { PROMPT_SYNTHESE, TIMEOUT_SOURCE_MS, CACHE_TTL_MS, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS, MESSAGE_ERREUR_SOURCES } from './constants';

// ── Rate limiting (7.3 : 20 req/min/IP) ──────────────────────────────────────
const hits = new Map<string, number[]>();

export function verifierRateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) {
    hits.set(ip, arr);
    return false;
  }
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // garde-fou mémoire
  return true;
}

export function hashQuestion(question: string): string {
  return createHash('sha256').update(question.trim().toLowerCase()).digest('hex');
}

// ── Cache 24 h (table sources_cache) ─────────────────────────────────────────
async function lireCache(hash: string, sourceName: string): Promise<string | null> {
  try {
    const row = await db.sourcesCache.findUnique({ where: { questionHash_sourceName: { questionHash: hash, sourceName } } });
    if (row && row.expiresAt > new Date()) return row.responsePayload;
    return null;
  } catch {
    return null;
  }
}

async function ecrireCache(hash: string, sourceName: string, payload: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
    await db.sourcesCache.upsert({
      where: { questionHash_sourceName: { questionHash: hash, sourceName } },
      update: { responsePayload: payload, createdAt: new Date(), expiresAt },
      create: { questionHash: hash, sourceName, responsePayload: payload, expiresAt },
    });
  } catch {
    /* cache best-effort */
  }
}

// ── Source 1 : Recherche Web ─────────────────────────────────────────────────
interface ResultatRecherche {
  name?: string;
  snippet?: string;
  url?: string;
}

export async function sourceRechercheWeb(question: string): Promise<string | null> {
  const zai = await getZai();
  const res = await zai.functions.invoke('web_search', { query: question.slice(0, 300), num: 5 });
  const brut = res as unknown as { results?: ResultatRecherche[] } | ResultatRecherche[];
  const arr: ResultatRecherche[] = Array.isArray(brut) ? brut : brut?.results || [];
  if (!arr.length) return null;
  return arr
    .slice(0, 4)
    .map((r, i: number) => `[${(r.name || '').slice(0, 90)}] ${(r.snippet || '').slice(0, 350)} (${r.url || ''})`)
    .join('\n');
}

// ── Source 2 : Intelligence réflexive (LLM intégré) ──────────────────────────
export async function sourceLlmReflexif(question: string): Promise<string | null> {
  return llmChat(
    [
      {
        role: 'system',
        content:
          "Tu es une intelligence réflexive consultée parmi d'autres sources. Donne un éclairage bref (80 mots maximum), nuancé et neutre sur la question posée. Ne prends pas position, ne donne pas de conseil médical, juridique ou financier personnalisé. N'invente aucun fait. Écris en français.",
      },
      { role: 'user', content: question.slice(0, 1500) },
    ],
    { timeoutMs: TIMEOUT_SOURCE_MS + 4000, temperature: 0.6, maxTokens: 220 }
  );
}

// ── Source 3 : Encyclopédie (Wikipedia via SDK page_reader) ──────────────────
function htmlVersTexte(html: string, maxLen = 1200): string {
  const sansBalises = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  // saute le bandeau d'introduction, prend le premier paragraphe utile
  return sansBalises.slice(0, maxLen);
}

export async function sourceEncyclopedie(question: string): Promise<string | null> {
  // 1) cherche la page Wikipedia la plus pertinente via web_search
  const zai = await getZai();
  const res = await zai.functions.invoke('web_search', {
    query: `wikipédia ${question.slice(0, 200)}`.slice(0, 300),
    num: 5,
  });
  const brut = res as unknown as { results?: ResultatRecherche[] } | ResultatRecherche[];
  const arr: ResultatRecherche[] = Array.isArray(brut) ? brut : brut?.results || [];
  const wiki = arr.find((r) => /wikipedia\.org\/wiki\//.test(r.url || ''));
  if (!wiki?.url) return null;
  // 2) lit la page via page_reader
  const page = await zai.functions.invoke('page_reader', { url: wiki.url });
  const texte = htmlVersTexte(page?.data?.html || '');
  return texte.length > 80 ? `Wikipédia — ${page?.data?.title || ''} : ${texte}` : null;
}

// ── Source 4 : DuckDuckGo Instant Answer ─────────────────────────────────────
export async function sourceDuckDuckGo(question: string): Promise<string | null> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(question.slice(0, 250))}&format=json&no_html=1&no_redirect=1`;
  const res = await withTimeout(fetch(url, { signal: AbortSignal.timeout(TIMEOUT_SOURCE_MS) }), TIMEOUT_SOURCE_MS, 'duckduckgo');
  if (!res.ok) return null;
  const j = (await res.json()) as { AbstractText?: string; AbstractSource?: string; RelatedTopics?: { Text?: string }[] };
  const morceaux: string[] = [];
  if (j.AbstractText) morceaux.push(`${j.AbstractSource || 'DuckDuckGo'} : ${j.AbstractText}`);
  for (const t of (j.RelatedTopics || []).slice(0, 2)) if (t.Text) morceaux.push(t.Text.slice(0, 250));
  return morceaux.length ? morceaux.join('\n').slice(0, 900) : null;
}

// ── Source 5 : IA libre (Pollinations — gratuite, sans clé) ──────────────────
// Ajoutée à la demande du concepteur : 5 sources libres et gratuites au total.
// Utilisée uniquement quand l'escalade de confiance le demande (voir plus bas).
export async function sourceIaLibre(question: string): Promise<string | null> {
  const systeme =
    "Tu es une source d'information consultée parmi d'autres. Donne un éclairage bref (80 mots maximum), nuancé et neutre sur la question posée. Ne prends pas position, ne donne pas de conseil médical, juridique ou financier personnalisé. N'invente aucun fait. Écris en français.";
  const url = `https://text.pollinations.ai/${encodeURIComponent(question.slice(0, 250))}?model=openai&system=${encodeURIComponent(systeme)}`;
  const res = await withTimeout(fetch(url, { signal: AbortSignal.timeout(TIMEOUT_SOURCE_MS) }), TIMEOUT_SOURCE_MS, 'ia-libre');
  if (!res.ok) return null;
  const t = (await res.text()).trim();
  if (!t || t.length < 30 || /^(Free limit|HTTP|Error)/i.test(t)) return null;
  return `IA libre (Pollinations) : ${t.slice(0, 900)}`;
}

// ── Orchestrateur ────────────────────────────────────────────────────────────
export interface SourceResultat {
  nom: string;
  texte: string;
}

async function avecCache(question: string, nom: string, fn: () => Promise<string | null>): Promise<SourceResultat | null> {
  const hash = hashQuestion(question);
  try {
    const enCache = await lireCache(hash, nom);
    if (enCache) return { nom, texte: enCache };
  } catch { /* ignore */ }
  try {
    const texte = await withTimeout(fn(), TIMEOUT_SOURCE_MS, nom);
    if (texte && texte.trim().length > 20) {
      ecrireCache(hash, nom, texte).catch(() => {});
      return { nom, texte };
    }
    console.warn(`[orchestrateur] source ${nom} : réponse vide ou trop courte`);
    return null;
  } catch (e) {
    console.error(`[orchestrateur] source ${nom} en échec:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export interface ResultatOrchestration {
  sources: SourceResultat[]; // toutes les sources consultées avec succès (journalisation)
  synthese: Synthese | null; // LA synthèse retenue (configuration gagnante)
  toutesEchouees: boolean;
  dureeMs: number;
  niveauSources: number; // nombre de sources de la configuration retenue
  historique: { niveau: number; confiance: number }[]; // trace honnête de l'escalade
}

// ── Les 5 sources libres et gratuites du SPU ─────────────────────────────────
const SOURCES_SPU: { nom: string; fn: (q: string) => Promise<string | null> }[] = [
  { nom: 'Recherche Web', fn: sourceRechercheWeb },
  { nom: 'Intelligence réflexive', fn: sourceLlmReflexif },
  { nom: 'Encyclopédie', fn: sourceEncyclopedie },
  { nom: 'DuckDuckGo', fn: sourceDuckDuckGo },
  { nom: 'IA libre', fn: sourceIaLibre },
];

export const SEUIL_CONFIANCE_SOURCES = 0.5; // 50 % — critère d'escalade du concepteur

/**
 * Orchestration ADAPTIVE (critère du concepteur v4.5) :
 *   • on démarre avec 2 sources et on synthétise ;
 *   • confiance < 50 % → on ajoute une 3ᵉ source et on re-synthétise ;
 *     si ≥ 50 % avec 3 sources → on garde ces 3 sources ;
 *   • sinon → 4ᵉ source ; si ≥ 50 % avec 4 → on garde ces 4 sources ;
 *   • sinon → 5ᵉ source ; si ≥ 50 % avec 5 → on garde ces 5 sources ;
 *   • sinon → on retient la configuration dont le score de confiance est le plus élevé.
 * Chaque source n'est tentée qu'une fois (cache 24 h conservé).
 */
export async function orchestrerSources(question: string): Promise<ResultatOrchestration> {
  const t0 = Date.now();
  const consultees: SourceResultat[] = [];
  const historique: { niveau: number; confiance: number }[] = [];
  const syntheses: { niveau: number; synthese: Synthese }[] = [];

  for (let cible = 2; cible <= SOURCES_SPU.length; cible++) {
    // tente les sources pas encore consultées jusqu'à atteindre la cible
    const manquantes = SOURCES_SPU.slice(consultees.length, cible);
    if (manquantes.length) {
      const resultats = await Promise.allSettled(
        manquantes.map((s) => avecCache(question, s.nom, () => s.fn(question)))
      );
      for (const r of resultats) {
        if (r.status === 'fulfilled' && r.value) consultees.push(r.value);
      }
    }
    if (!consultees.length) continue; // aucune source vivante pour l'instant

    const synthese = await synthetiser(question, consultees);
    const niveau = consultees.length;
    syntheses.push({ niveau, synthese });
    historique.push({ niveau, confiance: synthese.confiance });

    // critère d'arrêt : confiance ≥ 50 % pour ce niveau de sources
    if (synthese.confiance >= SEUIL_CONFIANCE_SOURCES) break;
  }

  // aucune source joignable → mode dégradé honnête
  if (!consultees.length || !syntheses.length) {
    return { sources: [], synthese: null, toutesEchouees: true, dureeMs: Date.now() - t0, niveauSources: 0, historique };
  }

  // sélection finale : première config ≥ 50 % (déjà en tête) sinon le score le plus élevé
  let retenue = syntheses[0];
  for (const s of syntheses) {
    if (s.synthese.confiance >= SEUIL_CONFIANCE_SOURCES) { retenue = s; break; }
    if (s.synthese.confiance > retenue.synthese.confiance) retenue = s;
  }

  return {
    sources: consultees,
    synthese: retenue.synthese,
    toutesEchouees: false,
    dureeMs: Date.now() - t0,
    niveauSources: retenue.niveau,
    historique,
  };
}

// ── PHASE 2 : Synthèse sourcée ───────────────────────────────────────────────
export interface Synthese {
  texte: string;
  sources: string[];
  confiance: number;
}

export async function synthetiser(question: string, sources: SourceResultat[]): Promise<Synthese> {
  const extraits = sources
    .map((s, i) => `--- SOURCE [${i + 1}] (${s.nom}) ---\n${s.texte.slice(0, 900)}`)
    .join('\n\n');
  const consigne = `${PROMPT_SYNTHESE.replace('[QUESTION]', question)}

Réponses des sources :
${extraits}

Réponds UNIQUEMENT avec un JSON exact : {"synthese": "…", "sources_utilisees": [1, 2], "confiance": 0.0 à 1.0}
Confiance = cohérence entre sources (1.0 = convergentes, 0.3 = contradictoires, plus bas si sources pauvres).`;
  let reponse = '';
  try {
    reponse = await llmChat([{ role: 'user', content: consigne }], { timeoutMs: 15000, temperature: 0.3, maxTokens: 350 });
  } catch (e) {
    // dégradation gracieuse : le LLM de synthèse est indisponible (quota réseau…) →
    // on livre une synthèse minimale honnête à partir des extraits, sans inventer.
    console.error('[synthèse] LLM indisponible, repli sur extraits:', e instanceof Error ? e.message : e);
    return {
      texte: `Je n'ai pas pu produire ma synthèse habituelle, voici les éléments bruts recueillis : ${sources
        .slice(0, 2)
        .map((s) => s.texte.slice(0, 220).replace(/\s+/g, ' '))
        .join(' … ')}`,
      sources: sources.map((s) => s.nom),
      confiance: 0.35,
    };
  }
  const json = extractJson<{ synthese: string; sources_utilisees: number[]; confiance: number }>(reponse);
  if (json?.synthese) {
    const idxUtil = (json.sources_utilisees || []).map((n) => sources[n - 1]?.nom).filter(Boolean) as string[];
    return {
      texte: json.synthese.trim(),
      sources: idxUtil.length ? idxUtil : sources.map((s) => s.nom),
      confiance: typeof json.confiance === 'number' ? Math.max(0, Math.min(1, json.confiance)) : 0.6,
    };
  }
  // repli : synthèse tronquée brute (jamais de position)
  return {
    texte: `Voici ce que j'ai rassemblé de mes sources sur cette question : ${sources[0]?.texte.slice(0, 180) || ''}…`,
    sources: sources.map((s) => s.nom),
    confiance: 0.4,
  };
}

export { MESSAGE_ERREUR_SOURCES };

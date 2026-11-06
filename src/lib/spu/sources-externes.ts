// Sources d'intelligence EXTERNES OPTIONNELLES — Grok (xAI) et Gemini (Google).
// Aucune clé n'est requise pour que le SPU fonctionne : si les clés sont
// présentes dans .env (XAI_API_KEY / GEMINI_API_KEY), ces intelligences sont
// simplement consultées EN PLUS des sources intégrées, enrichissant la synthèse.
// Règles du cahier respectées : timeout 8 s, aucune donnée personnelle transmise
// (seule la question anonymisée part), cache 24 h géré par l'orchestrateur.

import { withTimeout } from './llm';
import { TIMEOUT_SOURCE_MS } from './constants';

interface ConfigExterne {
  actif: boolean;
  nom: string;
  url: string;
  modele: string;
  cle: string;
  enTetes: Record<string, string>;
  corps: (question: string) => unknown;
  extraire: (j: unknown) => string;
}

function configGrok(): ConfigExterne | null {
  const cle = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
  if (!cle.trim()) return null;
  const modele = process.env.GROK_MODELE || 'grok-3-mini';
  return {
    actif: true,
    nom: 'Grok (xAI)',
    url: 'https://api.x.ai/v1/chat/completions',
    modele,
    cle,
    enTetes: { 'Content-Type': 'application/json', Authorization: `Bearer ${cle}` },
    corps: (q) => ({
      model: modele,
      temperature: 0.6,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content:
            "Tu es une intelligence consultée parmi d'autres par un orchestrateur. Donne un éclairage bref (80 mots maximum), nuancé et neutre sur la question posée. Ne prends pas position, ne donne pas de conseil médical, juridique ou financier personnalisé. N'invente aucun fait. Écris en français.",
        },
        { role: 'user', content: q.slice(0, 1500) },
      ],
    }),
    extraire: (j) => {
      const r = j as { choices?: { message?: { content?: string } }[] };
      return r?.choices?.[0]?.message?.content || '';
    },
  };
}

function configGemini(): ConfigExterne | null {
  const cle = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!cle.trim()) return null;
  const modele = process.env.GEMINI_MODELE || 'gemini-2.0-flash';
  return {
    actif: true,
    nom: 'Gemini (Google)',
    url: `https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`,
    modele,
    cle,
    enTetes: { 'Content-Type': 'application/json' },
    corps: (q) => ({
      systemInstruction: {
        parts: [
          {
            text: "Tu es une intelligence consultée parmi d'autres par un orchestrateur. Donne un éclairage bref (80 mots maximum), nuancé et neutre sur la question posée. Ne prends pas position, ne donne pas de conseil médical, juridique ou financier personnalisé. N'invente aucun fait. Écris en français.",
          },
        ],
      },
      contents: [{ role: 'user', parts: [{ text: q.slice(0, 1500) }] }],
      generationConfig: { temperature: 0.6, maxOutputTokens: 220 },
    }),
    extraire: (j) => {
      const r = j as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return r?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
    },
  };
}

function configs(): ConfigExterne[] {
  return [configGrok(), configGemini()].filter((c): c is ConfigExterne => c !== null);
}

/** Les sources externes sont-elles configurées ? (page Transparence) */
export function sourcesExternesActives(): string[] {
  return configs().map((c) => c.nom);
}

/** Interroge Grok/Gemini si les clés sont fournies dans .env — sinon null. */
export async function sourceExterne(question: string, nom: 'grok' | 'gemini'): Promise<string | null> {
  const conf = configs().find((c) => c.nom.toLowerCase().startsWith(nom));
  if (!conf) return null;
  try {
    const res = await withTimeout(
      fetch(conf.url, {
        method: 'POST',
        headers: conf.enTetes,
        body: JSON.stringify(conf.corps(question)),
        signal: AbortSignal.timeout(TIMEOUT_SOURCE_MS),
      }),
      TIMEOUT_SOURCE_MS,
      conf.nom
    );
    if (!res.ok) {
      console.warn(`[source externe] ${conf.nom} : HTTP ${res.status}`);
      return null;
    }
    const j = await res.json();
    const texte = conf.extraire(j);
    return texte.trim().length > 20 ? texte.trim() : null;
  } catch (e) {
    console.warn(`[source externe] ${conf.nom} indisponible :`, e instanceof Error ? e.message : e);
    return null;
  }
}

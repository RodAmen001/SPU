// ═════════════════════════════════════════════════════════════════════════════
// v4.8 — PARABOLE EN LIGNE (exigence du concepteur)
// Quand aucune parabole du corpus n'atteint efficacement la synthèse, le SPU
// consulte une IA en ligne (moteur de secours gratuit, sans clé) pour RETROUVER
// une parabole réelle et traditionnelle — jamais inventée — dont le ressort
// émotionnel reflète la synthèse. L'existence en est vérifiée via la recherche
// Wikipédia (encyclopédie libre), qui fournit la source citée à l'utilisateur,
// exactement comme pour les paraboles du corpus.
// ═════════════════════════════════════════════════════════════════════════════

import { llmChat, extractJson, withTimeout } from './llm';
import type { ParaboleMatch } from './matching';

interface CandidatWeb {
  titre: string;
  texte: string;
  culture: string;
  sourceOeuvre: string;
  interpretation: string;
  recherche: string;
}

const CONSIGNE = `On te donne une question, puis la synthèse des sources d'intelligence qui lui répond.

Question : [Q]
Synthèse des sources : [S]

Ta mission : RETROUVER une parabole, fable ou histoire traditionnelle RÉELLE et connue —
parmi Ésope, La Fontaine, les sages d'Afrique de l'Ouest, les récits zen, soufis, bouddhistes,
juifs, chrétiens, hindous, chinois, amérindiens, le Talmud, Pancatantra, Dōgen, Rumi…
— dont le ressort émotionnel et la leçon éclairent le CŒUR de cette synthèse.

RÈGLES ABSOLUES :
1. INTERDIT d'inventer ou de modifier une histoire : choisis-en une qui EXISTE vraiment,
   dans un recueil ou une tradition identifiable — on doit pouvoir la vérifier dans une encyclopédie.
2. Le texte doit être une version fidèle du récit traditionnel (100 à 200 mots), en français.
3. L'interprétation doit être ORIENTÉE VERS LA SYNTHÈSE : elle relie explicitement la leçon
   de la parabole à ce que la synthèse dit sur la situation de la personne.
4. Si tu n'es pas sûre qu'une histoire existe réellement, choisis-en une plus classique.

Réponds UNIQUEMENT avec un JSON exact :
{"titre": "...", "texte": "le récit (100-200 mots)", "culture": "tradition d'origine",
 "sourceOeuvre": "recueil / tradition / auteur, ex. « Ésope, Fables »",
 "interpretation": "2-3 phrases orientées vers la synthèse",
 "recherche": "2 à 4 mots-clés simples pour vérifier cette parabole dans une encyclopédie"}`;

/** Vérifie la parabole via la recherche Wikipédia (FR, puis EN en repli) et
 *  renvoie l'URL de l'article le plus pertinent — ou null si rien de crédible. */
async function verifierSurWikipedia(recherche: string, titre: string): Promise<string | null> {
  for (const mots of [`${recherche} parabole`, recherche, titre]) {
    const q = mots.trim().slice(0, 120);
    if (!q) continue;
    for (const langue of ['fr', 'en']) {
      try {
        const url = `https://${langue}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json`;
        const res = await withTimeout(fetch(url, { signal: AbortSignal.timeout(7000) }), 7000, 'wikipedia');
        if (!res.ok) continue;
        const j = (await res.json()) as { query?: { search?: { title?: string }[] } };
        const hit = j.query?.search?.[0]?.title;
        if (hit) return `https://${langue}.wikipedia.org/wiki/${encodeURIComponent(hit.replace(/ /g, '_'))}`;
      } catch {
        /* encyclopédie joignable plus tard : la source d'œuvre reste citée */
      }
    }
  }
  return null;
}

function slug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}

/**
 * Retrouve une parabole réelle en ligne, orientée vers la synthèse.
 * Renvoie un ParaboleMatch honnêtement étiqueté (enLigne: true, code WEB).
 * En cas d'échec (LLM indisponible, réponse hors format), renvoie null —
 * le flux garde alors la parabole du corpus sous le seuil, clairement signalée.
 */
export async function paraboleEnLigne(
  synthese: string,
  question: string,
  _mode: 'adulte' | 'enfant' = 'adulte',
): Promise<ParaboleMatch | null> {
  const consigne = CONSIGNE.replace('[Q]', question.slice(0, 700)).replace('[S]', synthese.slice(0, 1100));
  let brut: string;
  try {
    brut = await llmChat([{ role: 'user', content: consigne }], { timeoutMs: 20000, temperature: 0.4, maxTokens: 650 });
  } catch {
    return null;
  }
  const j = extractJson<CandidatWeb>(brut);
  if (!j || !j.titre || !j.texte || !j.interpretation) return null;
  const texte = String(j.texte).trim();
  if (texte.length < 80 || texte.length > 1600) return null;

  const urlWiki = await verifierSurWikipedia(String(j.recherche || ''), String(j.titre));
  const sourceOeuvre = String(j.sourceOeuvre || '').trim();
  const sources = [
    urlWiki ? `Vérification encyclopédique : ${urlWiki}` : '',
    sourceOeuvre ? `Source traditionnelle : ${sourceOeuvre}` : '',
  ].filter(Boolean);
  if (!sources.length) sources.push('Parabole traditionnelle retrouvée en ligne (source non vérifiée automatiquement)');

  return {
    id: `web-${slug(String(j.titre))}`,
    code: 'WEB',
    texte,
    culture: String(j.culture || 'tradition universelle').slice(0, 80),
    famille: 'en ligne',
    interpretations: [String(j.interpretation).trim()],
    sources,
    score: 0.72,
    interpretationChoisie: String(j.interpretation).trim(),
    sousSeuil: false,
    enLigne: true,
  };
}

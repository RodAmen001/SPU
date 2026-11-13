// Budget de temps global par requête (garde-fou anti « 10 minutes sans réponse »)
// Chaque question reçoit un budget global ; quand il s'épuise, tous les appels IA
// renoncent immédiatement et le SPU bascule sur ses ressources locales
// (corpus 65 paraboles, histoire par template sûr, perspective locale).
// Résultat garanti : une réponse complète en moins de ~2 minutes, quel que soit
// l'état des sources (quota 429, réseau lent, moteur de secours saturé…).

import { AsyncLocalStorage } from 'node:async_hooks';

const als = new AsyncLocalStorage<{ fin: number }>();

// Budgets par parcours (marge incluse pour la journalisation et le streaming)
export const BUDGET_ORACLE_MS = 90_000; // /api/ask (étape unique) et /api/repondre
export const BUDGET_MENTOR_MS = 110_000; // /api/mentor (étape 1 la plus riche)
export const BUDGET_DEEP_MS = 100_000; // /api/deep

/** Exécute fn avec un budget global de ms millisecondes (ne remplace jamais
 *  un budget déjà actif — le plus contraignant reste en place). */
export async function avecBudget<T>(ms: number, fn: () => Promise<T>): Promise<T> {
  const dejaActif = als.getStore();
  if (dejaActif && dejaActif.fin - Date.now() <= ms) return fn(); // budget parent plus court : on le garde
  return als.run({ fin: Date.now() + ms }, fn);
}

/** Millisecondes restantes (Infini si aucun budget actif — appels hors requête). */
export function budgetRestant(): number {
  const s = als.getStore();
  if (!s) return Number.POSITIVE_INFINITY;
  return Math.max(0, s.fin - Date.now());
}

/** Vrai quand il ne reste pas assez de temps pour un appel IA utile. */
export function budgetEpuise(margeMs = 4000): boolean {
  return budgetRestant() < margeMs;
}

/** Délai effectif pour un appel : le plus petit du délai demandé et du temps
 *  restant (marge de sécurité déduite). Renvoie null si plus de budget. */
export function delaiEffectif(demandeMs: number, margeMs = 2500): number | null {
  const restant = budgetRestant();
  if (!Number.isFinite(restant)) return demandeMs;
  const dispo = restant - margeMs;
  if (dispo < 6000) return null; // pas assez de temps pour un appel utile
  return Math.max(6000, Math.min(demandeMs, dispo));
}

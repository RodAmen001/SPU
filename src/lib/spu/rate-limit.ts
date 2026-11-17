// ═════════════════════════════════════════════════════════════════════════════
// v6.6 — LIMITATION DE DÉBIT PAR IP (fenêtre glissante, en mémoire)
// Audit v6.5 §B1 : les routes coûteuses (IA, Piper, gravation BOOST) étaient
// publiques sans limite — quelques clients automatisés suffisaient à saturer
// le CPU gratuit de Render et à consommer les quotas IA. Chaque catégorie a
// son plafond ; le dépassement renvoie 429 avec un Retry-After honnête.
// En mémoire (Map) : suffisant car le service tourne en un seul processus
// (Next standalone) ; à plusieurs instances, passer à Redis.
// ═════════════════════════════════════════════════════════════════════════════

export type CategorieDebit = 'ia' | 'tts' | 'boost-audio' | 'musique';

const LIMITES: Record<CategorieDebit, { max: number; fenetreMs: number }> = {
  ia: { max: 20, fenetreMs: 60_000 },          // routes LLM : 20 requêtes / minute / IP
  tts: { max: 30, fenetreMs: 60_000 },         // synthèse Piper : 30 / minute / IP
  'boost-audio': { max: 5, fenetreMs: 60_000 }, // gravation du théâtre : 5 lancements / minute / IP
  musique: { max: 30, fenetreMs: 60_000 },     // notes musicales : 30 / minute / IP
};

const fenetres = new Map<string, number[]>();

/** L'IP du client : derrière le proxy Render (x-forwarded-for) ou en direct. */
export function ipDe(req: Request): string {
  const forwards = req.headers.get('x-forwarded-for');
  if (forwards) return forwards.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}

/**
 * Cœur PUR (testable) : ajoute l'instant courant à la fenêtre et décide.
 * Retourne ok, le nombre de requêtes restantes et le délai d'attente si refus.
 */
export function evaluerDebit(
  cle: string,
  max: number,
  fenetreMs: number,
  maintenant: number = Date.now()
): { ok: boolean; reste: number; attenteMs: number } {
  const horodatages = (fenetres.get(cle) || []).filter((t) => t > maintenant - fenetreMs);
  if (horodatages.length >= max) {
    fenetres.set(cle, horodatages);
    return { ok: false, reste: 0, attenteMs: Math.max(1000, fenetreMs - (maintenant - horodatages[0])) };
  }
  horodatages.push(maintenant);
  fenetres.set(cle, horodatages);
  // hygiène mémoire : si la table grossit trop, on retire les clés éteintes
  if (fenetres.size > 5000) {
    for (const [k, ts] of fenetres) {
      if (ts.length === 0 || ts[ts.length - 1] < maintenant - fenetreMs) fenetres.delete(k);
    }
  }
  return { ok: true, reste: max - horodatages.length, attenteMs: 0 };
}

/** Vérifie le débit d'une requête pour une catégorie. */
export function verifierDebit(req: Request, categorie: CategorieDebit): { ok: boolean; reste: number; attenteMs: number } {
  const { max, fenetreMs } = LIMITES[categorie];
  return evaluerDebit(`${categorie}:${ipDe(req)}`, max, fenetreMs);
}

/** Réponse 429 standard (fonctionne dans toutes les routes Next). */
export function reponse429(attenteMs: number): Response {
  return Response.json(
    { error: `Trop de requêtes — réessaie dans ${Math.ceil(attenteMs / 1000)} s.` },
    { status: 429, headers: { 'Retry-After': String(Math.ceil(attenteMs / 1000)) } }
  );
}

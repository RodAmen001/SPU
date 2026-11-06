// Compte SPU — authentification légère locale (aucune dépendance externe)
// Hachage : scrypt (node:crypto) avec sel aléatoire. Token : aléatoire 32 octets,
// conservé en mémoire serveur (TTL glissant 7 jours) et transmis par l'en-tête Authorization.
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';

const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000; // 7 jours

const _tokens = new Map<string, { userId: string; expire: number }>();

// ── Mots de passe ─────────────────────────────────────────────────────────────
export function hashMotDePasse(motDePasse: string): string {
  const sel = randomBytes(16).toString('hex');
  const derive = scryptSync(motDePasse, sel, 64).toString('hex');
  return `${sel}:${derive}`;
}

export function verifierMotDePasse(motDePasse: string, hashStocke: string): boolean {
  const [sel, derive] = hashStocke.split(':');
  if (!sel || !derive) return false;
  const calcule = scryptSync(motDePasse, sel, 64);
  const attendu = Buffer.from(derive, 'hex');
  return calcule.length === attendu.length && timingSafeEqual(calcule, attendu);
}

// ── Validation des identifiants ───────────────────────────────────────────────
export function pseudoValide(pseudo: string): boolean {
  return /^[a-zA-Z0-9_\-.àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]{3,24}$/.test(pseudo.trim());
}

export function motDePasseValide(motDePasse: string): boolean {
  return typeof motDePasse === 'string' && motDePasse.length >= 6 && motDePasse.length <= 128;
}

// ── Tokens ────────────────────────────────────────────────────────────────────
function purgerTokens() {
  const maintenant = Date.now();
  for (const [t, v] of _tokens) if (v.expire < maintenant) _tokens.delete(t);
}

export function creerToken(userId: string): string {
  purgerTokens();
  const token = randomBytes(32).toString('hex');
  _tokens.set(token, { userId, expire: Date.now() + TOKEN_TTL_MS });
  return token;
}

export function getUserIdDepuisToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const entree = _tokens.get(token);
  if (!entree) return null;
  if (entree.expire < Date.now()) {
    _tokens.delete(token);
    return null;
  }
  entree.expire = Date.now() + TOKEN_TTL_MS; // glissant
  return entree.userId;
}

export function revoquerToken(token: string | null | undefined): void {
  if (token) _tokens.delete(token);
}

/** Extrait le token depuis Authorization: Bearer … ou le cookie spu_token. */
export function extraireToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const cookie = req.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)spu_token=([a-f0-9]{64})/);
  return m ? m[1] : null;
}

/** Utilisateur authentifié pour cette requête, ou null. */
export async function utilisateurDeReq(req: Request) {
  const userId = getUserIdDepuisToken(extraireToken(req));
  if (!userId) return null;
  return db.user.findUnique({ where: { id: userId }, select: { id: true, pseudo: true, createdAt: true } });
}

// ── Limitation simple (anti brute-force local) ────────────────────────────────
const _tentatives = new Map<string, { n: number; fenetre: number }>();

export function verifierLimiteAuth(cle: string): boolean {
  const maintenant = Date.now();
  const e = _tentatives.get(cle);
  if (!e || maintenant - e.fenetre > 60000) {
    _tentatives.set(cle, { n: 1, fenetre: maintenant });
    return true;
  }
  e.n++;
  return e.n <= 15; // 15 essais / minute / clé
}

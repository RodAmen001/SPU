// Moteur de voix neuronales locales — Piper (T. Schürger & communauté Rhasspy, licence MIT).
// Modèles français téléchargés une fois dans voix-piper/modeles/ puis 100 % local :
// aucune clé API, aucune connexion au moment de la lecture.
// Tom (homme) · Pierre (homme) & Jessica (femme) · Siwis (femme) — les 10 profils
// du SPU sont mappés sur ces vraies voix, avec réglage fin (débit, hauteur via ffmpeg).
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const RACINE = process.cwd();
const BIN = process.env.SPU_PIPER_BIN || join(RACINE, 'voix-piper', 'piper', 'piper');
const DIR_MODELES = process.env.SPU_PIPER_VOIX || join(RACINE, 'voix-piper', 'modeles');

interface ConfigVoixNeurale {
  modele: string;
  locuteur?: number;
  longueur: number; // length_scale Piper : > 1 = plus lent
  pitch: number; // 1 = neutre ; > 1 = plus aigu (enfants), < 1 = plus grave (aînés)
}

// Priorité décroissante : le premier modèle présent sur le disque est utilisé.
const CONFIGURATIONS: Record<string, ConfigVoixNeurale[]> = {
  narrateur: [{ modele: 'fr_FR-tom-medium', longueur: 0.98, pitch: 0.97 }],
  conteur: [{ modele: 'fr_FR-tom-medium', longueur: 1.12, pitch: 0.95 }],
  sage: [{ modele: 'fr_FR-upmc-medium', locuteur: 1, longueur: 1.08, pitch: 0.92 }],
  'homme-jeune': [{ modele: 'fr_FR-upmc-medium', locuteur: 1, longueur: 1.0, pitch: 1.0 }],
  'homme-mure': [{ modele: 'fr_FR-tom-medium', longueur: 0.92, pitch: 0.95 }],
  'femme-jeune': [
    { modele: 'fr_FR-siwis-medium', longueur: 1.0, pitch: 1.0 },
    { modele: 'fr_FR-upmc-medium', locuteur: 0, longueur: 1.0, pitch: 1.0 },
  ],
  'femme-mure': [{ modele: 'fr_FR-siwis-medium', longueur: 1.06, pitch: 0.98 }],
  'vieille-femme': [{ modele: 'fr_FR-siwis-medium', longueur: 1.12, pitch: 0.96 }],
  'enfant-fille': [{ modele: 'fr_FR-siwis-medium', longueur: 1.05, pitch: 1.38 }],
  'enfant-garcon': [{ modele: 'fr_FR-tom-medium', longueur: 1.08, pitch: 1.45 }],
};

const NOMS_MODELES: Record<string, { nom: string; locuteurs?: Record<number, string> }> = {
  'fr_FR-tom-medium': { nom: 'Tom' },
  'fr_FR-upmc-medium': { nom: 'UPMC', locuteurs: { 0: 'Jessica', 1: 'Pierre' } },
  'fr_FR-siwis-medium': { nom: 'Siwis' },
};

// ── Disponibilité (re-vérifiée toutes les 30 s) ───────────────────────────────
let _etat: { ok: boolean; quand: number } | null = null;

export function etatNeurales(): boolean {
  if (_etat && Date.now() - _etat.quand < 30000) return _etat.ok;
  const ok = existsSync(BIN) && existsSync(join(DIR_MODELES, 'fr_FR-tom-medium.onnx'));
  _etat = { ok, quand: Date.now() };
  return ok;
}

function configPour(profilId: string): ConfigVoixNeurale | null {
  for (const c of CONFIGURATIONS[profilId] || []) {
    if (existsSync(join(DIR_MODELES, `${c.modele}.onnx`))) return c;
  }
  return null;
}

/** Pour l'interface : profil → { modele, locuteur } ou null si repli navigateur. */
export function voixDisponibles(): Record<string, { modele: string; locuteur?: number } | null> {
  const resultat: Record<string, { modele: string; locuteur?: number } | null> = {};
  for (const profilId of Object.keys(CONFIGURATIONS)) {
    const c = configPour(profilId);
    resultat[profilId] = c ? { modele: c.modele, locuteur: c.locuteur } : null;
  }
  return resultat;
}

/** Nom lisible : « Tom », « Pierre (UPMC) », « Siwis »… */
export function nomHumainModele(modele: string, locuteur?: number): string {
  const m = NOMS_MODELES[modele];
  if (!m) return modele;
  if (m.locuteurs && locuteur !== undefined && m.locuteurs[locuteur]) return m.locuteurs[locuteur];
  return m.nom;
}

// ── Exécution de processus (piper / ffmpeg) ───────────────────────────────────
function executer(cmd: string, args: string[], entree: Buffer | string, timeoutMs = 30000): Promise<Buffer> {
  return new Promise((resoudre, rejeter) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const morceaux: Buffer[] = [];
    let err = '';
    const timer = setTimeout(() => {
      p.kill('SIGKILL');
      rejeter(new Error(`délai dépassé (${cmd})`));
    }, timeoutMs);
    p.stdout.on('data', (d: Buffer) => morceaux.push(d));
    p.stderr.on('data', (d: Buffer) => {
      err = (err + d.toString()).slice(-2000);
    });
    p.on('error', (e) => {
      clearTimeout(timer);
      rejeter(e);
    });
    p.on('close', (code) => {
      clearTimeout(timer);
      const out = Buffer.concat(morceaux);
      if (code === 0 && out.length > 44) resoudre(out);
      else rejeter(new Error(`exit ${code} (${cmd}) : ${err.slice(-200)}`));
    });
    if (typeof entree === 'string') p.stdin.end(entree, 'utf8');
    else p.stdin.end(entree);
  });
}

const _sampleRates = new Map<string, number>();

function sampleRateDe(modele: string): number {
  const enCache = _sampleRates.get(modele);
  if (enCache) return enCache;
  let sr = 22050;
  try {
    const j = JSON.parse(readFileSync(join(DIR_MODELES, `${modele}.onnx.json`), 'utf8')) as {
      audio?: { sample_rate?: number };
    };
    if (j.audio?.sample_rate) sr = j.audio.sample_rate;
  } catch {
    /* défaut prudent */
  }
  _sampleRates.set(modele, sr);
  return sr;
}

/** Décale la hauteur sans changer la durée (asetrate + atempo correctif). */
async function decalerPitch(wav: Buffer, facteur: number, sr: number): Promise<Buffer> {
  if (Math.abs(facteur - 1) < 0.015) return wav;
  const atempo = 1 / facteur;
  if (atempo < 0.5 || atempo > 2) return wav; // hors limites ffmpeg : voix neutre
  const filtre = `asetrate=${Math.round(sr * facteur)},atempo=${atempo.toFixed(5)},aresample=${sr}`;
  return executer('ffmpeg', ['-loglevel', 'error', '-i', 'pipe:0', '-af', filtre, '-f', 'wav', 'pipe:1'], wav);
}

// ── Cache LRU des audios générés ──────────────────────────────────────────────
const CACHE = new Map<string, Buffer>();
const MAX_CACHE = 48;
const EN_COURS = new Map<string, Promise<Buffer>>();

/**
 * Génère (ou ressert depuis le cache) le WAV d'un segment pour un profil de voix SPU.
 * Retourne null si le moteur n'est pas installé ou le profil sans modèle → repli navigateur.
 */
export async function genererVoix(profilId: string, texte: string, debit = 1): Promise<Buffer | null> {
  if (!etatNeurales()) return null;
  const cfg = configPour(profilId);
  if (!cfg || !texte.trim()) return null;
  const t = texte.trim().slice(0, 1200);
  const longueurEffective = Math.max(0.5, Math.min(2, cfg.longueur / Math.max(0.5, Math.min(2, debit || 1))));
  const cle = createHash('sha1').update(`${profilId}|${longueurEffective.toFixed(3)}|${t}`).digest('hex');

  const enCache = CACHE.get(cle);
  if (enCache) {
    CACHE.delete(cle);
    CACHE.set(cle, enCache); // rafraîchit la position LRU
    return enCache;
  }
  const enVol = EN_COURS.get(cle);
  if (enVol) return enVol;

  const promesse = (async () => {
    const args = ['-m', join(DIR_MODELES, `${cfg.modele}.onnx`), '--length-scale', longueurEffective.toFixed(3), '-f', '-'];
    if (cfg.locuteur !== undefined) args.push('--speaker', String(cfg.locuteur));
    let wav = await executer(BIN, args, `${t}\n`);
    const sr = sampleRateDe(cfg.modele);
    wav = await decalerPitch(wav, cfg.pitch, sr);
    CACHE.set(cle, wav);
    if (CACHE.size > MAX_CACHE) {
      const premiere = CACHE.keys().next().value;
      if (premiere) CACHE.delete(premiere);
    }
    return wav;
  })();

  EN_COURS.set(cle, promesse);
  try {
    return await promesse;
  } finally {
    EN_COURS.delete(cle);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// v6.4 — LE BOOST EN AUDIO MP3 COMPLET, ASSEMBLÉ CÔTÉ SERVEUR (scène réelle)
// Exigence du concepteur : pendant la préparation du BOOST, TOUT le scénario est
// converti en un seul MP3 avec des voix DISTINCTES garanties — plus jamais une
// lecture monotone d'une seule voix. Sur le serveur, les générations Piper se
// font UNE PAR UNE (pas de course à quatre générations parallèles qui saturait
// le CPU et faisait tout échouer côté client), avec un délai élargi.
//
// LA PARTITION DU THÉÂTRE (plan audio) — le conteur installe chaque scène :
//   1. « {titre de la scène}. »            → voix du Conteur
//   2. didascalie PARLÉE (v6.4 — ex. « Léo marche dans la ville, les yeux
//      plissés. ») : l'annonce de la condition dans laquelle se trouve le
//      personnage, AVANT sa prise de parole → voix du Narrateur
//   3. « {nom}, {role}. » (première prise de parole du personnage seulement)
//                                           → voix du Conteur
//   4. la réplique                          → voix DU personnage
//
// REVUE IA DU RENDU (exigence du concepteur : « soumettre l'audio complet du
// BOOST et le Texte complet à une IA afin d'améliorer le rendu sonore ») :
//   après l'assemblage, le MP3 est transcrit (ASR Groq Whisper) et l'IA compare
//   la transcription au script segment par segment, corrige la grammaire et le
//   lexique, puis les segments corrigés sont régénérés et le MP3 ré-assemblé.
// ═════════════════════════════════════════════════════════════════════════════
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { mkdirSync, readFileSync, existsSync, statSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import type { ScenarioBoost } from './boost';
import { genererVoix } from './voix-neurales';
import { llmChat, extractJson, getZai } from './llm';

export interface SegmentPlan {
  type: 'scene' | 'didascalie' | 'annonce' | 'ligne';
  s: number; // index de scène
  i: number; // index de réplique dans la scène (-1 pour l'ouverture)
  perso: string;
  voix: string; // profil de voix SPU
  texte: string;
}

export interface SegmentManifest extends SegmentPlan {
  planIndex: number; // position dans la partition (pour les corrections IA)
  debut: number; // secondes
  duree: number; // secondes
}

export interface RevueIA {
  score: number; // 0-10
  problemes: string[];
  corrections: number; // segments régénérés après correction
  couverture: number; // % du script retrouvé dans l'audio transcrit
}

interface JobBoost {
  id: string;
  etat: 'en-cours' | 'pret' | 'echec';
  fait: number;
  total: number;
  phase: string; // ce que le serveur est en train de faire
  mp3?: string; // URL publique du MP3
  manifest?: SegmentManifest[];
  revue?: RevueIA | null;
  erreur?: string;
  demarre: number;
}

const JOBS = new Map<string, JobBoost>();
const DELAI_VIE_JOB_MS = 45 * 60 * 1000; // les jobs finis restent servis 45 min

function dossierTravail(id: string): string {
  return join(tmpdir(), 'spu-boost', id);
}

function cheminMp3(id: string): string {
  return join(dossierTravail(id), 'theatre.mp3');
}

/** ID stable : le même scénario → le même MP3 (cache, rejouage instantané). */
function idDe(scenario: ScenarioBoost): string {
  const empreinte = JSON.stringify({
    t: scenario.titre,
    h: scenario.heros,
    s: scenario.scenes.map((sc) => [sc.phase, sc.titre, sc.lignes.map((l) => [l.perso, l.voix, l.texte])]),
  });
  return createHash('sha1').update(empreinte).digest('hex').slice(0, 16);
}

// ── LA PARTITION (plan audio du théâtre) ──────────────────────────────────────

export function planifierBoost(scenario: ScenarioBoost): SegmentPlan[] {
  const cont = scenario.personnages.find((p) => p.voix === 'conteur' || /conteur|narrat/i.test(p.nom));
  const voixConteur = cont?.voix || 'narrateur';
  const roleDe = new Map(scenario.personnages.map((p) => [p.nom.toLowerCase(), p.role]));
  const dejaPresents = new Set<string>();
  const plan: SegmentPlan[] = [];

  const nettoyer = (t: string) => t.replace(/[«»()]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[,.…]+$/, '');

  scenario.scenes.forEach((sc, s) => {
    plan.push({ type: 'scene', s, i: -1, perso: 'Le Conteur', voix: voixConteur, texte: nettoyer(sc.titre) + '.' });
    sc.lignes.forEach((l, i) => {
      const cle = l.perso.toLowerCase();
      const conteurLuiMeme = l.voix === 'narrateur' || l.voix === voixConteur;
      // v6.4 — la didascalie est PARLÉE : c'est l'annonce de la condition du
      // personnage, dite par le narrateur AVANT sa prise de parole.
      const didascalie = (l.didascalie || '').trim();
      if (didascalie) {
        plan.push({ type: 'didascalie', s, i, perso: 'Le Narrateur', voix: 'narrateur', texte: nettoyer(didascalie) + '.' });
      }
      if (!dejaPresents.has(cle) && !conteurLuiMeme) {
        dejaPresents.add(cle);
        const role = roleDe.get(cle);
        plan.push({
          type: 'annonce',
          s, i,
          perso: 'Le Conteur',
          voix: voixConteur,
          texte: (role ? `${nettoyer(l.perso)}, ${nettoyer(role)}.` : `${nettoyer(l.perso)}.`),
        });
      }
      plan.push({ type: 'ligne', s, i, perso: l.perso, voix: l.voix, texte: nettoyer(l.texte) });
    });
  });
  return plan;
}

// ── Exécution ffmpeg (fichiers, pas pipes — concat et conversion MP3) ─────────
function executerFichier(cmd: string, args: string[], timeoutMs = 60000): Promise<void> {
  return new Promise((resoudre, rejeter) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    const timer = setTimeout(() => {
      p.kill('SIGKILL');
      rejeter(new Error(`délai dépassé (${cmd})`));
    }, timeoutMs);
    p.stderr.on('data', (d: Buffer) => {
      err = (err + d.toString()).slice(-2000);
    });
    p.on('error', (e) => {
      clearTimeout(timer);
      rejeter(e);
    });
    p.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resoudre();
      else rejeter(new Error(`exit ${code} (${cmd}) : ${err.slice(-200)}`));
    });
  });
}

/** Durée d'un WAV PCM (en-tête lu : chunk fmt → byteRate, chunk data → taille).
 *  v6.4 bis — ffmpeg en PIPE écrit 0xFFFFFFFF comme taille data (inconnue) :
 *  on retombe alors sur la taille réelle du fichier. */
function dureeWav(chemin: string): number {
  try {
    const b = readFileSync(chemin);
    let pos = 12;
    let byteRate = 0;
    let tailleDonnees = 0;
    while (pos + 8 <= b.length) {
      const idChunk = b.toString('ascii', pos, pos + 4);
      const taille = b.readUInt32LE(pos + 4);
      if (idChunk === 'fmt ') byteRate = b.readUInt32LE(pos + 8 + 8); // nAvgBytesPerSec : offset 8 du corps fmt
      if (idChunk === 'data') {
        // 0xFFFFFFFF = « taille inconnue » (écriture en pipe) → taille réelle du fichier
        tailleDonnees = taille === 0 || taille >= b.length - pos - 8 ? b.length - pos - 8 : taille;
        break;
      }
      pos += 8 + taille + (taille % 2);
    }
    if (byteRate <= 0) byteRate = 44100; // segments d'assemblage = 22050 Hz mono 16 bits
    if (tailleDonnees > 0 && byteRate > 0) return tailleDonnees / byteRate;
  } catch {
    /* estimation de secours */
  }
  return Math.max(0.6, statSync(chemin).size / 44100); // 44100 octets/s = 22050 Hz × 2 octets
}

/** Silence PCM mono 22050 Hz 16 bits, sans ffmpeg (écrit directement). */
function ecrireSilence(chemin: string, secondes: number): void {
  const sr = 22050;
  const echantillons = Math.round(sr * secondes);
  const entete = Buffer.alloc(44);
  entete.write('RIFF', 0, 'ascii');
  entete.writeUInt32LE(36 + echantillons * 2, 4);
  entete.write('WAVE', 8, 'ascii');
  entete.write('fmt ', 12, 'ascii');
  entete.writeUInt32LE(16, 16);
  entete.writeUInt16LE(1, 20); // PCM
  entete.writeUInt16LE(1, 22); // mono
  entete.writeUInt32LE(sr, 24);
  entete.writeUInt32LE(sr * 2, 28);
  entete.writeUInt16LE(2, 32);
  entete.writeUInt16LE(16, 34);
  entete.write('data', 36, 'ascii');
  entete.writeUInt32LE(echantillons * 2, 40);
  writeFileSync(chemin, Buffer.concat([entete, Buffer.alloc(echantillons * 2)]));
}

// ── Assemblage : une voix à la fois, concat ffmpeg, MP3 unique ────────────────
const PAUSE_LIGNE = 0.16; // respiration entre deux répliques (scène réelle)
const PAUSE_ANNONCE = 0.12; // l'annonce s'efface, la réplique part aussitôt
const PAUSE_SCENES = 0.55; // courte respiration de changement de scène

async function assembler(id: string, plan: SegmentPlan[], job: JobBoost, correctifs: Map<number, string> = new Map()): Promise<{ mp3: string; wav: string; manifest: SegmentManifest[]; echecs: number[] }> {
  const dir = dossierTravail(id);
  mkdirSync(dir, { recursive: true });
  const wavParIndex: (string | null)[] = new Array(plan.length).fill(null);
  const echecs: number[] = [];

  // 1) GÉNÉRATION — une voix à la fois (jamais de course CPU), délai élargi
  for (let k = 0; k < plan.length; k++) {
    const seg = plan[k];
    const texte = correctifs.get(k) ?? seg.texte;
    try {
      const wav = await genererVoix(seg.voix, texte, 1, { timeoutMs: 120000, normaliser: true });
      if (wav && wav.length > 2000) {
        const chemin = join(dir, `seg-${k}.wav`);
        writeFileSync(chemin, wav);
        wavParIndex[k] = chemin;
      }
    } catch {
      /* segment raté : il sera signalé, jamais bloquant */
    }
    job.fait = k + 1;
    job.phase = correctifs.size ? `Correction IA des voix… ${job.fait}/${plan.length}` : `Voix du théâtre… ${job.fait}/${plan.length} (${seg.perso})`;
  }

  // 2) CONCAT — silences calibrés + wavs, dans l'ordre de la partition
  ecrireSilence(join(dir, 'pause-ligne.wav'), PAUSE_LIGNE);
  ecrireSilence(join(dir, 'pause-annonce.wav'), PAUSE_ANNONCE);
  ecrireSilence(join(dir, 'pause-scene.wav'), PAUSE_SCENES);
  const liste: string[] = [];
  const manifest: SegmentManifest[] = [];
  let t = 0;
  for (let k = 0; k < plan.length; k++) {
    const seg = plan[k];
    const estOuverture = seg.type === 'scene';
    if (estOuverture) {
      liste.push(`file 'pause-scene.wav'`);
      t += PAUSE_SCENES;
    }
    if (seg.type === 'annonce' || seg.type === 'didascalie') {
      liste.push(`file 'pause-annonce.wav'`);
      t += PAUSE_ANNONCE;
    }
    if (wavParIndex[k]) {
      const duree = dureeWav(wavParIndex[k]!);
      liste.push(`file 'seg-${k}.wav'`);
      manifest.push({ ...seg, texte: correctifs.get(k) ?? seg.texte, planIndex: k, debut: Math.round(t * 100) / 100, duree: Math.round(duree * 100) / 100 });
      t += duree;
    } else {
      echecs.push(k);
    }
    if (k < plan.length - 1 && plan[k + 1].type !== 'scene') {
      liste.push(`file 'pause-ligne.wav'`);
      t += PAUSE_LIGNE;
    }
  }
  writeFileSync(join(dir, 'liste.txt'), liste.join('\n') + '\n', 'utf8');
  // v6.4 bis — le WAV 22050 Hz mono est le MAÎTRE (la revue IA transcrit un WAV :
  // l'ASR z-ai n'accepte que WAV/WebM) ; le MP3 est dérivé du WAV maître.
  const cheminWav = join(dir, 'theatre.wav');
  await executerFichier('ffmpeg', [
    '-loglevel', 'error', '-y',
    '-f', 'concat', '-safe', '0', '-i', join(dir, 'liste.txt'),
    '-ar', '22050', '-ac', '1', '-c:a', 'pcm_s16le',
    cheminWav,
  ], 120000);
  await executerFichier('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', cheminWav,
    '-codec:a', 'libmp3lame', '-q:a', '5',
    cheminMp3(id),
  ], 120000);

  // 3) Nettoyage des wavs intermédiaires (le MP3 reste en cache)
  for (const w of wavParIndex) {
    if (w) {
      try {
        unlinkSync(w);
      } catch {
        /* déjà parti */
      }
    }
  }
  return { mp3: cheminMp3(id), wav: cheminWav, manifest, echecs };
}

// ── REVUE IA DU RENDU (ASR + LLM) ─────────────────────────────────────────────
// v6.4 bis — la transcription passe par le SDK z-ai (le meilleur de ZAI, déjà
// configuré sur le serveur — la clé Groq du concepteur n'a pas accès aux modèles
// audio). LIMITE ASR : 30 s max → le WAV maître est découpé en morceaux de 25 s
// (ffmpeg -ss/-t), chaque morceau est transcrit, et les textes sont concaténés.
// Groq Whisper reste en repli si la clé audio devient disponible.
async function transcrireAudio(cheminWav: string): Promise<string | null> {
  const zai = await getZai().catch(() => null);
  const dir = dirname(cheminWav);
  const dureeTotale = statSync(cheminWav).size / 44100; // 22050 Hz mono 16 bits
  const TAILLE = 25;
  const morceaux: string[] = [];
  if (zai) {
    for (let d = 0; d < dureeTotale; d += TAILLE) {
      const part = join(dir, `asr-${Math.round(d)}.wav`);
      try {
        await executerFichier('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(d), '-t', String(TAILLE), '-i', cheminWav, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', part], 60000);
        const reponse = await zai.audio.asr.create({ file_base64: readFileSync(part).toString('base64') });
        if (reponse?.text?.trim()) morceaux.push(reponse.text.trim());
      } catch (e) {
        console.error('[boost-audio] ASR z-ai morceau', Math.round(d), ':', e instanceof Error ? e.message : e);
      } finally {
        try {
          unlinkSync(part);
        } catch {
          /* déjà parti */
        }
      }
    }
  }
  if (morceaux.length) return morceaux.join(' ');
  // repli Groq Whisper (la clé du concepteur n'autorise pas l'audio aujourd'hui)
  const cle = process.env.GROQ_API_KEY || '';
  if (!cle) return null;
  try {
    const fd = new FormData();
    fd.append('file', new Blob([readFileSync(cheminWav)], { type: 'audio/wav' }), 'theatre.wav');
    fd.append('model', 'whisper-large-v3-turbo');
    fd.append('language', 'fr');
    fd.append('response_format', 'text');
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cle}` },
      body: fd,
    });
    if (!res.ok) {
      console.error('[boost-audio] ASR Groq', res.status, ':', (await res.text()).slice(0, 200));
      return null;
    }
    return await res.text();
  } catch {
    return null;
  }
}

async function revueRendu(plan: SegmentPlan[], manifest: SegmentManifest[], transcript: string): Promise<{ revue: RevueIA; correctifs: Map<number, string> } | null> {
  try {
    const script = manifest
      .map((m, idx) => `#${idx} (${m.type} · ${m.perso} · voix ${m.voix}) : ${m.texte}`)
      .join('\n');
    const brut = await llmChat(
      [
        {
          role: 'system',
          content:
            "Tu es auditeur professionnel d'un théâtre audio en français. On te donne le SCRIPT complet d'un BOOST (segment par segment) et la TRANSCRIPTION automatique de son enregistrement MP3. Ton travail : (1) vérifier que chaque segment important a bien été prononcé (compare avec la transcription — les petites différences d'orthographe de la transcription ne comptent pas) ; (2) corriger toute faute de français du script (orthographe, conjugaison, lexique, syntaxe) ; (3) repérer les segments inaudibles, tronqués ou absents. Réponds UNIQUEMENT en JSON : {\"score\": 0-10, \"problemes\": [\"…\"], \"corrections\": [{\"index\": <numéro de segment>, \"texte\": \"texte corrigé, même longueur\"}]}. Ne corrige QUE les segments réellement fautifs ; si tout est bon, corrections est vide.",
        },
        { role: 'user', content: `SCRIPT :\n${script}\n\nTRANSCRIPTION DE L'AUDIO :\n${transcript.slice(0, 4000)}` },
      ],
      { timeoutMs: 45000, temperature: 0.2, maxTokens: 1600 }
    );
    const j = extractJson<{ score?: number; problemes?: string[]; corrections?: { index?: number; texte?: string }[] }>(brut);
    if (!j) return null;
    const correctifs = new Map<number, string>();
    for (const c of j.corrections || []) {
      if (typeof c.index === 'number' && c.texte && manifest[c.index]) {
        correctifs.set(manifest[c.index].planIndex, c.texte);
      }
    }
    // couverture : parts des textes du script retrouvées dans la transcription
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').trim();
    const tr = norm(transcript);
    const testes = manifest.filter((m) => m.type === 'ligne');
    const retrouves = testes.filter((m) => tr.includes(norm(m.texte).slice(0, 40))).length;
    const couverture = testes.length ? Math.round((retrouves / testes.length) * 100) : 100;
    return {
      revue: { score: Math.max(0, Math.min(10, Math.round(j.score ?? 8))), problemes: (j.problemes || []).slice(0, 6), corrections: correctifs.size, couverture },
      correctifs,
    };
  } catch {
    return null;
  }
}

// ── JOB COMPLET : partition → voix → MP3 → revue IA → corrections → MP3 final ─
async function executerJob(id: string, scenario: ScenarioBoost, job: JobBoost): Promise<void> {
  try {
    const plan = planifierBoost(scenario);
    job.total = plan.length;
    const premier = await assembler(id, plan, job);
    job.phase = 'Revue IA du rendu (transcription + correction)…';
    let revue: RevueIA | null = null;
    let mp3Final = premier.mp3;
    let manifestFinal = premier.manifest;
    try {
      const transcript = await transcrireAudio(premier.wav);
      if (transcript) {
        const r = await revueRendu(plan, premier.manifest, transcript);
        if (r && r.correctifs.size) {
          job.phase = `Correction IA : ${r.correctifs.size} segment(s) régénéré(s)…`;
          const seconde = await assembler(id, plan, job, r.correctifs);
          mp3Final = seconde.mp3;
          manifestFinal = seconde.manifest;
          r.revue.corrections = r.correctifs.size;
          revue = r.revue;
        } else if (r) {
          revue = r.revue;
        }
      }
    } catch {
      /* la revue est un plus : le théâtre reste servi sans elle */
    }
    job.mp3 = `/api/boost/audio?id=${id}&format=mp3`;
    job.manifest = manifestFinal;
    job.revue = revue;
    job.etat = 'pret';
    job.phase = 'Théâtre prêt';
    console.log(`[boost-audio] MP3 prêt : id=${id} segments=${manifestFinal.length} echecs=${premier.echecs.length} revue=${revue ? `score ${revue.score}, couverture ${revue.couverture}%` : 'absente'}`);
  } catch (e) {
    job.etat = 'echec';
    job.erreur = e instanceof Error ? e.message : String(e);
    console.error('[boost-audio] échec du job', id, ':', job.erreur);
  } finally {
    // purge des vieux jobs (le disque de travail reste propre)
    const maintenant = Date.now();
    for (const [jid, j] of JOBS) {
      if (j.demarre < maintenant - DELAI_VIE_JOB_MS) JOBS.delete(jid);
    }
  }
}

/** POST {scenario} → lance la conversion (idempotent : même scénario = même MP3). */
export function lancerConversion(scenario: ScenarioBoost): JobBoost {
  const id = idDe(scenario);
  const existant = JOBS.get(id);
  if (existant) {
    // le MP3 a pu être purgé du disque temporaire : on relance si besoin
    if (existant.etat === 'pret' && !existsSync(cheminMp3(id))) {
      JOBS.delete(id);
    } else {
      return existant;
    }
  }
  const job: JobBoost = { id, etat: 'en-cours', fait: 0, total: 0, phase: 'Partition du théâtre…', demarre: Date.now() };
  JOBS.set(id, job);
  // arrière-plan total : la route répond immédiatement, le client vient poller
  void executerJob(id, scenario, job);
  return job;
}

export function etatJob(id: string): JobBoost | null {
  return JOBS.get(id) || null;
}

export function fichierMp3(id: string): string | null {
  const chemin = cheminMp3(id);
  return existsSync(chemin) ? chemin : null;
}

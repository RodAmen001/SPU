// ═══════════════════════════════════════════════════════════════════════════
// SPU v4.0 — MOTEUR DE VOIX (théâtre sonore)
// 12 profils de voix paramétrés PAR LE SPU : narrateur distinct + personnages
// (enfant fille/garçon, adolescent, femme, homme, vieillard, vieille dame,
//  sage, créature…). Deux moteurs :
//   • « navigateur » : Web Speech API (instantané, toujours disponible)
//   • « neural » : Piper TTS local (voix françaises réelles, servies par
//     l'application /voix-neurales/, mises en cache OPFS par le navigateur)
// L'attribution personnage → voix est automatique (analyse âge/genre/type),
// stable, et chaque personnage garde la même voix partout.
// ═══════════════════════════════════════════════════════════════════════════

export type MoteurVoix = 'navigateur' | 'neural';

export interface ProfilVoix {
  id: string;
  nom: string;
  role: string; // description humaine (« Le narrateur, grave et posé »)
  emoji: string;
  genre: 'femme' | 'homme' | 'neutre';
  age: 'enfant' | 'jeune' | 'adulte' | 'age';
  // réglages Web Speech (pitch 0-2, rate 0.5-2)
  pitch: number;
  rate: number;
  // réglages neural Piper : modèle de base + transposition (cents) + vitesse
  modele: 'siwis' | 'tom' | 'gilles' | 'mls1840';
  detune: number;
  vitesse: number;
}

// ── Les 12 voix du SPU ───────────────────────────────────────────────────────
export const PROFILS_VOIX: ProfilVoix[] = [
  { id: 'narrateur', nom: 'Le Narrateur', role: 'Voix du récit — grave, lente, posée, distincte de tous les personnages', emoji: '📖', genre: 'homme', age: 'adulte', pitch: 0.68, rate: 0.86, modele: 'tom', detune: -120, vitesse: 0.92 },
  { id: 'conteur', nom: 'La Conteur', role: 'Voix secondaire du récit — chaleureuse, pour les passages doux', emoji: '🕯️', genre: 'femme', age: 'adulte', pitch: 0.92, rate: 0.9, modele: 'siwis', detune: -60, vitesse: 0.94 },
  { id: 'enfant-fille', nom: 'Petite Fille', role: 'Personnage enfant féminin — clair et vif', emoji: '👧', genre: 'femme', age: 'enfant', pitch: 1.55, rate: 1.08, modele: 'siwis', detune: 320, vitesse: 1.06 },
  { id: 'enfant-garcon', nom: 'Petit Garçon', role: 'Personnage enfant masculin — énergique', emoji: '👦', genre: 'homme', age: 'enfant', pitch: 1.5, rate: 1.1, modele: 'mls1840', detune: 360, vitesse: 1.08 },
  { id: 'adolescent', nom: 'Adolescent', role: 'Personnage jeune — agile', emoji: '🧑', genre: 'homme', age: 'jeune', pitch: 1.18, rate: 1.06, modele: 'mls1840', detune: 170, vitesse: 1.04 },
  { id: 'jeune-femme', nom: 'Jeune Femme', role: 'Personnage féminin jeune — lumineux', emoji: '👩', genre: 'femme', age: 'jeune', pitch: 1.22, rate: 1.02, modele: 'siwis', detune: 110, vitesse: 1.02 },
  { id: 'jeune-homme', nom: 'Jeune Homme', role: 'Personnage masculin jeune — franc', emoji: '👨', genre: 'homme', age: 'jeune', pitch: 1.02, rate: 1.02, modele: 'mls1840', detune: 40, vitesse: 1.0 },
  { id: 'femme', nom: 'Femme', role: 'Personnage féminin adulte — posé', emoji: '🧕', genre: 'femme', age: 'adulte', pitch: 1.05, rate: 0.98, modele: 'siwis', detune: 0, vitesse: 1.0 },
  { id: 'homme', nom: 'Homme', role: 'Personnage masculin adulte — ferme', emoji: '🧔', genre: 'homme', age: 'adulte', pitch: 0.9, rate: 0.97, modele: 'mls1840', detune: -40, vitesse: 0.98 },
  { id: 'vieille-dame', nom: 'Vieille Dame', role: 'Personnage féminin âgé — doux et caverneux', emoji: '👵', genre: 'femme', age: 'age', pitch: 0.8, rate: 0.9, modele: 'siwis', detune: -170, vitesse: 0.94 },
  { id: 'vieillard', nom: 'Vieillard', role: 'Personnage masculin âgé — grave et cassé', emoji: '👴', genre: 'homme', age: 'age', pitch: 0.72, rate: 0.88, modele: 'gilles', detune: -140, vitesse: 0.9 },
  { id: 'sage', nom: 'Le Sage', role: 'Sagesse et mystère — très grave, très lent', emoji: '🦉', genre: 'neutre', age: 'age', pitch: 0.6, rate: 0.8, modele: 'tom', detune: -260, vitesse: 0.88 },
  { id: 'creature', nom: 'La Créature', role: 'Animaux et êtres fantastiques — étonnant, chantant', emoji: '🦊', genre: 'neutre', age: 'jeune', pitch: 1.35, rate: 1.05, modele: 'gilles', detune: 220, vitesse: 1.04 },
];

export function profilParId(id: string): ProfilVoix {
  return PROFILS_VOIX.find((p) => p.id === id) || PROFILS_VOIX[0];
}

// ── Analyse : personnages → profils ──────────────────────────────────────────

// indices de genre / âge / type dans le texte français
const INDICES: { motif: RegExp; profils: string[] }[] = [
  { motif: /(grand-?m[èe]re|mamie|bonne femme|vieille (femme|dame|dame)|mère-grande|a[ïi]eule|sorci[èe]re|vieille)/i, profils: ['vieille-dame', 'femme'] },
  { motif: /(grand-?p[èe]re|papi|vieil (homme|monsieur|sage)|vieux (homme|roi|paysan|sage|porteur|bûcheron|berger)|vieux)/i, profils: ['vieillard', 'sage'] },
  { motif: /(petite fille|fillette|petite (sœur|fille)|jeune fille|petite)/i, profils: ['enfant-fille'] },
  { motif: /(petit gar[çc]on|gar[çc]onnet|petit (suisse|prince|berger|gars)|jeune gar[çc]on|petit)/i, profils: ['enfant-garcon'] },
  { motif: /(adolescent|adolescente|jeune homme|jeune femme|jeune)/i, profils: ['adolescent', 'jeune-femme'] },
  { motif: /(m[èe]re|maman|la femme|reine|princesse|épouse|tante|dame|laitière|berge[èr]e|femme)/i, profils: ['femme', 'jeune-femme'] },
  { motif: /(p[èe]re|papa|l'homme|le roi|prince|paysan|marchand|bûcheron|berger|monsieur|le pêcheur|le porteur|homme)/i, profils: ['homme', 'jeune-homme'] },
];

// animaux / êtres : profil sage pour les sages connus, créature pour les autres
const ANIMAUX_SAGES = /(hibou|chouette|tortue|serpent|sage|dragon ancien|phénix)/i;
const ANIMAUX = /(renard|corbeau|loup|lion|lapin|ours|chat|chien|oiseau|souris|fourmi|abeille|grue|canard|singe|dauphin|biche|hérisson|grenouille|cochon|âne|mouton|chèvre|dragon|esprit|fée|génie|monstre|créature)/i;

function hashStable(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Attribue un profil SPU stable à un personnage (nom + contexte). */
export function profilPourPersonnage(nom: string, contexte = ''): string {
  const tout = `${nom} ${contexte}`;
  if (ANIMAUX_SAGES.test(tout)) return 'sage';
  if (ANIMAUX.test(tout)) {
    // variété entre créature et sage pour un bestiaire vivant
    return hashStable(nom.toLowerCase()) % 5 === 0 ? 'sage' : 'creature';
  }
  for (const indice of INDICES) {
    if (indice.motif.test(tout)) return indice.profils[hashStable(nom.toLowerCase()) % indice.profils.length];
  }
  // humain sans indice : stabilité par nom, équilibre femme/homme
  return hashStable(nom.toLowerCase()) % 2 === 0 ? 'femme' : 'homme';
}

// ── Segments de théâtre ──────────────────────────────────────────────────────

export interface SegmentTheatre {
  type: 'narration' | 'dialogue';
  texte: string;
  personnage?: string;
  profilId?: string; // profil SPU attribué
}

const VERBES_PAROLE = /(?:dit|dire|demanda|demande|répondit|répond|cria|crie|souffla|souffle|murmura|murmure|s'écri|s’exclama|déclara|declara|chuchota|chuchote|expliqua|explique|raconta|raconte|conseilla|osé|ose)/;

/** Découpe une histoire en segments jouables (narration / répliques attribuées). */
export function analyserTheatre(texte: string): SegmentTheatre[] {
  const segments: SegmentTheatre[] = [];
  const morceaux = texte.split(/(?<=[.!?…])\s+|\n+/);
  let locuteurCourant: string | undefined;
  for (const brut of morceaux) {
    const phrase = brut.trim();
    if (!phrase) continue;
    const m = phrase.match(/«([^»]*)»/);
    if (m) {
      const citation = m[1].trim();
      const avant = phrase.slice(0, m.index || 0).trim();
      const apres = phrase.slice((m.index || 0) + m[0].length).trim();
      let perso: string | undefined;
      const apresM = apres.match(new RegExp(`${VERBES_PAROLE.source}\\s+([A-ZÉÈÀÂÎÔÛ][\\wéèêàçîôû'’-]*(?:\\s+(?:le|la|du|des|d'|au|aux|de)\\s+[\\wéèêàçîôû'’-]+)?)`));
      const avantM = avant.match(new RegExp(`([A-ZÉÈÀÂÎÔÛ][\\wéèêàçîôû'’-]*(?:\\s+(?:le|la|du|des|d'|au|aux|de)\\s+[\\wéèêàçîôû'’-]+)?)\\s+\\w*${VERBES_PAROLE.source}`));
      if (apresM) perso = apresM[1];
      else if (avantM) perso = avantM[1];
      if (!perso && locuteurCourant) perso = locuteurCourant;
      if (perso) locuteurCourant = perso;
      if (avant) segments.push({ type: 'narration', texte: avant, profilId: 'narrateur' });
      segments.push({ type: 'dialogue', texte: citation, personnage: perso, profilId: perso ? profilPourPersonnage(perso, `${avant} ${apres}`) : 'narrateur' });
      if (apres) segments.push({ type: 'narration', texte: apres, profilId: 'narrateur' });
    } else {
      segments.push({ type: 'narration', texte: phrase, profilId: 'narrateur' });
      const annonce = phrase.match(new RegExp(`([A-ZÉÈÀÂÎÔÛ][\\wéèêàçîôû'’-]*(?:\\s+(?:le|la|du|des|d'|au|aux|de)\\s+[\\wéèêàçîôû'’-]+)?)\\s+\\w*${VERBES_PAROLE.source}[^«]*:`));
      if (annonce) locuteurCourant = annonce[1];
    }
  }
  return segments;
}

// ── MOTEUR NAVIGATEUR (Web Speech) ───────────────────────────────────────────

function ttsSupporteBase(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let cacheVoix: SpeechSynthesisVoice[] = [];
function chargerVoix(): SpeechSynthesisVoice[] {
  if (!ttsSupporteBase()) return [];
  if (!cacheVoix.length) {
    const toutes = window.speechSynthesis.getVoices();
    cacheVoix = toutes.filter((v) => v.lang?.toLowerCase().startsWith('fr'));
    if (!cacheVoix.length) cacheVoix = toutes;
  }
  return cacheVoix;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cacheVoix = [];
    chargerVoix();
  };
}

/** Énonce un segment avec le profil demandé (moteur navigateur). */
function parlerNavigateur(texte: string, profil: ProfilVoix, onstart?: () => void, onend?: () => void) {
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = 'fr-FR';
  const voix = chargerVoix();
  // chaque profil choisit une voix système distincte et stable
  const h = hashStable(profil.id);
  const v = voix.length ? voix[h % voix.length] : null;
  if (v) u.voice = v;
  u.pitch = profil.pitch;
  u.rate = profil.rate;
  u.volume = 1;
  if (onstart) u.onstart = onstart;
  if (onend) u.onend = onend;
  window.speechSynthesis.speak(u);
}

// ── MOTEUR NEURAL (Piper local) ──────────────────────────────────────────────

const MODELES = { siwis: 'fr_FR-siwis-medium', tom: 'fr_FR-tom-medium', gilles: 'fr_FR-gilles-low', mls1840: 'fr_FR-mls_1840-low' } as const;
// Chemins HuggingFace (mêmes conventions que piper) : utilisés seulement si un
// fichier local manque (repli en ligne transparent).
const CHEMIN_MODELE = {
  siwis: 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx',
  tom: 'fr/fr_FR/tom/medium/fr_FR-tom-medium.onnx',
  gilles: 'fr/fr_FR/gilles/low/fr_FR-gilles-low.onnx',
  mls1840: 'fr/fr_FR/mls_1840/low/fr_FR-mls_1840-low.onnx',
} as const;
void CHEMIN_MODELE;
const HF_BASE = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main';
void HF_BASE;

type ModuleVits = typeof import('@diffusionstudio/vits-web');
let vits: ModuleVits | null = null;
let ctxNeural: AudioContext | null = null;
let prete: Promise<boolean> | null = null;
let fileAttente: FileSegment[] = [];
let enLecture = false;
let sourceCourant: AudioBufferSourceNode | null = null;

interface FileSegment {
  texte: string;
  profil: ProfilVoix;
  onstart?: () => void;
  onend?: () => void;
}

/** Charge vits-web + vérifie la disponibilité des voix locales. */
async function initialiserNeural(): Promise<boolean> {
  if (prete) return prete;
  prete = (async () => {
    try {
      if (!('storage' in navigator && 'getDirectory' in navigator.storage)) return false;
      // Import à la demande, hors bundler : résolu par la carte d'imports de layout.tsx
      // (le paquet vits-web contient un require('fs') Node que Turbopack ne peut pas regrouper).
      vits = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ '@diffusionstudio/vits-web')) as ModuleVits;
      // vérifie au moins un modèle local disponible côté serveur
      const probe = await fetch('/voix-neurales/fr_FR-gilles-low.onnx', { method: 'HEAD' });
      if (!probe.ok) return false; // paquet de voix non installé → navigateur
      return true;
    } catch {
      return false;
    }
  })();
  return prete;
}

// ── Cache OPFS (mêmes conventions que piper : dossier « piper », clé = nom de fichier) ──
// vits-web n'exporte pas writeBlob/readBlob : on écrit directement dans l'OPFS
// pour que predict() trouve nos fichiers locaux et ne télécharge pas sur Internet.
async function opfsExiste(nom: string): Promise<boolean> {
  try {
    const racine = await navigator.storage.getDirectory();
    const dossier = await racine.getDirectoryHandle('piper');
    await dossier.getFileHandle(nom);
    return true;
  } catch {
    return false;
  }
}

async function opfsEcrire(nom: string, blob: Blob): Promise<void> {
  const racine = await navigator.storage.getDirectory();
  const dossier = await racine.getDirectoryHandle('piper', { create: true });
  const fichier = await dossier.getFileHandle(nom, { create: true });
  // createWritable (Chromium) ; sur les autres navigateurs, on saute le pré-remplissage
  const accessible = fichier as FileSystemFileHandle & { createWritable?: () => Promise<FileSystemWritableFileStream> };
  if (!accessible.createWritable) throw new Error('createWritable indisponible');
  const flux = await accessible.createWritable();
  await flux.write(blob);
  await flux.close();
}

async function assurerModele(cle: keyof typeof MODELES): Promise<void> {
  if (!vits) throw new Error('vits indisponible');
  const nom = MODELES[cle];
  for (const suffixe of ['', '.json'] as const) {
    const nomFichier = `${nom}.onnx${suffixe}`;
    if (await opfsExiste(nomFichier)) continue;
    const local = await fetch(`/voix-neurales/${nomFichier}`);
    if (!local.ok) throw new Error(`fichier de voix manquant : ${nomFichier}`);
    await opfsEcrire(nomFichier, await local.blob());
  }
}

/** Synthétise un texte en WAV (Blob) avec la voix Piper du profil. */
async function synthetiserWav(texte: string, profil: ProfilVoix): Promise<AudioBuffer> {
  if (!vits) throw new Error('vits indisponible');
  await assurerModele(profil.modele);
  const blob = await vits.predict({ text: texte, voiceId: MODELES[profil.modele] });
  if (!ctxNeural) ctxNeural = new AudioContext();
  const tampon = await blob.arrayBuffer();
  return await ctxNeural.decodeAudioData(tampon);
}

function jouerTampon(tampon: AudioBuffer, profil: ProfilVoix, seg: FileSegment) {
  if (!ctxNeural) return;
  type SourceAvecDetune = AudioBufferSourceNode & { detune?: AudioParam };
  const source: SourceAvecDetune = ctxNeural.createBufferSource();
  source.buffer = tampon;
  // transposition : detune si supporté (Chrome/Firefox), sinon playbackRate seul
  const vitesse = Math.max(0.6, Math.min(1.6, profil.vitesse));
  if (source.detune) {
    source.detune.value = profil.detune;
    source.playbackRate.value = vitesse;
  } else {
    source.playbackRate.value = vitesse * Math.pow(2, profil.detune / 1200);
  }
  source.onended = () => {
    sourceCourant = null;
    seg.onend?.();
    lancerSuivant();
  };
  sourceCourant = source;
  source.connect(ctxNeural.destination);
  seg.onstart?.();
  source.start();
}

function lancerSuivant() {
  const seg = fileAttente.shift();
  if (!seg) {
    enLecture = false;
    return;
  }
  enLecture = true;
  if (!vits || !ctxNeural) {
    // repli instantané sur la voix navigateur
    parlerNavigateur(seg.texte, seg.profil, seg.onstart, () => { seg.onend?.(); lancerSuivant(); });
    return;
  }
  synthetiserWav(seg.texte, seg.profil)
    .then((tampon) => jouerTampon(tampon, seg.profil, seg))
    .catch(() => {
      // échec neural → voix navigateur, la file continue
      parlerNavigateur(seg.texte, seg.profil, seg.onstart, () => { seg.onend?.(); lancerSuivant(); });
    });
}

// ── FAÇADE PUBLIQUE ──────────────────────────────────────────────────────────

export function ttsSupporte(): boolean {
  return ttsSupporteBase();
}

export interface EtatMoteurVoix {
  moteur: MoteurVoix;
  neuralDisponible: boolean;
}

let moteurDemande: MoteurVoix = 'navigateur';
let etatNeural: 'inconnu' | 'pret' | 'indisponible' = 'inconnu';
const ECOUTEURS_ETAT: ((e: EtatMoteurVoix) => void)[] = [];

export function surChangementMoteur(cb: (e: EtatMoteurVoix) => void): () => void {
  ECOUTEURS_ETAT.push(cb);
  cb({ moteur: moteurDemande, neuralDisponible: etatNeural === 'pret' });
  return () => {
    const i = ECOUTEURS_ETAT.indexOf(cb);
    if (i >= 0) ECOUTEURS_ETAT.splice(i, 1);
  };
}

function notifierEtat() {
  const e = { moteur: moteurDemande, neuralDisponible: etatNeural === 'pret' };
  ECOUTEURS_ETAT.forEach((cb) => cb(e));
}

/** Change de moteur de voix (bascule dans la Régie). Retourne l'état réel. */
export async function definirMoteur(moteur: MoteurVoix): Promise<EtatMoteurVoix> {
  if (moteur === 'neural') {
    const ok = await initialiserNeural();
    etatNeural = ok ? 'pret' : 'indisponible';
    moteurDemande = ok ? 'neural' : 'navigateur';
  } else {
    moteurDemande = 'navigateur';
  }
  notifierEtat();
  return { moteur: moteurDemande, neuralDisponible: etatNeural === 'pret' };
}

export function moteurActuel(): EtatMoteurVoix {
  return { moteur: moteurDemande, neuralDisponible: etatNeural === 'pret' };
}

export interface OptionsParler {
  fin?: () => void;
  debit?: number;
  profilId?: string;
}

/** Parle avec une voix SPU précise (narrateur par défaut). */
export function ttsParler(texte: string, opts: OptionsParler = {}) {
  const profil = profilParId(opts.profilId || 'narrateur');
  const p = opts.debit ? { ...profil, rate: opts.debit, vitesse: opts.debit } : profil;
  arreterTout();
  if (moteurDemande === 'neural') {
    fileAttente = [{ texte, profil: p, onend: opts.fin }];
    if (!enLecture) lancerSuivant();
  } else {
    parlerNavigateur(texte, p, undefined, opts.fin);
  }
}

export interface OptionsTheatre {
  fin?: () => void;
  onSegment?: (segment: SegmentTheatre, index: number, total: number) => void;
}

/** Joue l'histoire en théâtre sonore : narrateur + voix distinctes par personnage. */
export function jouerTheatre(texte: string, opts: OptionsTheatre = {}) {
  if (!ttsSupporteBase()) {
    opts.fin?.();
    return;
  }
  arreterTout();
  const segments = analyserTheatre(texte);
  const fichier = segments.map((seg, i) => ({
    texte: seg.texte,
    profil: profilParId(seg.profilId || 'narrateur'),
    onstart: () => opts.onSegment?.(seg, i, segments.length),
    onend: i === segments.length - 1 ? opts.fin : undefined,
  }));
  if (moteurDemande === 'neural') {
    fileAttente = fichier;
    if (!enLecture) lancerSuivant();
  } else {
    // enchaînement Web Speech : chaque segment démarre le suivant
    let i = 0;
    const suivant = () => {
      if (i >= fichier.length) return;
      const seg = fichier[i++];
      parlerNavigateur(seg.texte, seg.profil, seg.onstart, () => {
        seg.onend?.();
        suivant();
      });
    };
    suivant();
  }
}

function arreterTout() {
  window.speechSynthesis?.cancel();
  fileAttente = [];
  enLecture = false;
  if (sourceCourant) {
    try { sourceCourant.stop(); } catch { /* déjà arrêté */ }
    sourceCourant = null;
  }
}

export function ttsPause() {
  if (ttsSupporteBase()) window.speechSynthesis.pause();
  ctxNeural?.suspend().catch(() => {});
}

export function ttsReprise() {
  if (ttsSupporteBase()) window.speechSynthesis.resume();
  ctxNeural?.resume().catch(() => {});
}

export function ttsStop() {
  arreterTout();
}

// TTS SPU — théâtre sonore à deux étages, 100 % local.
// 1) Voix neuronales Piper (serveur local) : vraies voix masculines (Tom, Pierre)
//    et féminines (Siwis, Jessica), aucun accès réseau après installation.
// 2) Repli automatique : Web Speech API du navigateur, si Piper est absent
//    (paquet portable sans voix téléchargées).
// 10 profils de voix distincts et réglables ; le SPU attribue les voix tout seul
// pendant l'histoire (narration ↔ dialogues « … » en voix de personnages).

export interface ProfilVoix {
  id: string;
  nom: string;
  role: string; // à quel usage la voix est destinée
  pitch: number; // hauteur 0–2 (Web Speech API, repli)
  rate: number; // débit 0,1–10 (Web Speech API, repli)
  emoji: string;
}

// ── Les 10 voix du SPU ────────────────────────────────────────────────────────
export const VOIX_SPU: ProfilVoix[] = [
  { id: 'narrateur', nom: 'Narrateur', role: 'Voix principale — raconte tout le récit', pitch: 0.85, rate: 0.92, emoji: '🎭' },
  { id: 'sage', nom: 'Le Sage', role: 'Vieil homme posé — mentors, aïeuls', pitch: 0.72, rate: 0.82, emoji: '🧙' },
  { id: 'vieille-femme', nom: 'Aïeule', role: 'Femme âgée — grands-mères, sages-femmes', pitch: 1.12, rate: 0.8, emoji: '👵' },
  { id: 'enfant-fille', nom: 'Petite fille', role: 'Enfant (6-12 ans) — voix claire et vive', pitch: 1.65, rate: 1.08, emoji: '👧' },
  { id: 'enfant-garcon', nom: 'Petit garçon', role: 'Enfant (6-12 ans) — voix gauche et curieuse', pitch: 1.45, rate: 1.04, emoji: '👦' },
  { id: 'femme-jeune', nom: 'Jeune femme', role: 'Adulte femme — héroïnes, compagnes', pitch: 1.28, rate: 1.0, emoji: '👩' },
  { id: 'femme-mure', nom: 'Femme expérimentée', role: 'Adulte femme — mères, guides', pitch: 1.05, rate: 0.95, emoji: '👩‍🦳' },
  { id: 'homme-jeune', nom: 'Jeune homme', role: 'Adulte homme — voyageurs, apprentis', pitch: 0.95, rate: 1.0, emoji: '👨' },
  { id: 'homme-mure', nom: 'Homme mûr', role: 'Adulte homme — pères, artisans', pitch: 0.8, rate: 0.94, emoji: '🧔' },
  { id: 'conteur', nom: 'Conteur du soir', role: 'Alternance du narrateur — ton feutré pour les passages de transition', pitch: 0.78, rate: 0.88, emoji: '🕯️' },
];

export const VOIX_PAR_DEFAUT = {
  narrateur: 'narrateur',
  personnages: ['homme-jeune', 'femme-jeune', 'enfant-fille'], // rotation pour les personnages parlants
};

export function profilParId(id: string): ProfilVoix {
  return VOIX_SPU.find((v) => v.id === id) || VOIX_SPU[0];
}

export function ttsSupporte(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

// ── Détection du moteur neuronal (une seule requête GET, mémoire) ─────────────
export interface EtatNeurales {
  verifie: boolean;
  disponible: boolean;
  moteur: 'piper' | 'navigateur';
  noms: Record<string, string | null>; // profilId → « Tom », « Pierre »… (ou null)
}

const ETAT_INITIAL: EtatNeurales = { verifie: false, disponible: false, moteur: 'navigateur', noms: {} };
let etatNeuralesClient: EtatNeurales = { ...ETAT_INITIAL };
let verificationEnVol: Promise<EtatNeurales> | null = null;

export async function verifierNeurales(force = false): Promise<EtatNeurales> {
  if (typeof window === 'undefined') return ETAT_INITIAL;
  if (etatNeuralesClient.verifie && !force) return etatNeuralesClient;
  if (verificationEnVol && !force) return verificationEnVol;
  verificationEnVol = (async () => {
    try {
      const res = await fetch('/api/tts', { cache: 'no-store' });
      const j = (await res.json()) as { disponible?: boolean; moteur?: string; noms?: Record<string, string | null> };
      etatNeuralesClient = {
        verifie: true,
        disponible: !!j.disponible,
        moteur: j.moteur === 'piper' ? 'piper' : 'navigateur',
        noms: j.noms || {},
      };
    } catch {
      etatNeuralesClient = { ...ETAT_INITIAL, verifie: true };
    }
    return etatNeuralesClient;
  })();
  return verificationEnVol;
}

// ── Lecture d'un segment : Piper d'abord, navigateur en secours ──────────────
function voixFrancaise(): SpeechSynthesisVoice | null {
  const voix = window.speechSynthesis.getVoices();
  return voix.find((v) => v.lang?.toLowerCase().startsWith('fr')) || null;
}

// Lecture neuronale en cours (pour pause / reprise / arrêt propres)
let lectureNeurale: { audio: HTMLAudioElement; url: string; terminer: () => void } | null = null;

function attacherDucking(): void {
  try {
    // import paresseux pour éviter tout cycle de module
    import('./audio-engine').then(({ getMoteurAudio }) => getMoteurAudio().attenuerPourVoix(true)).catch(() => {});
  } catch {
    /* jamais critique */
  }
}

function relacherDucking(): void {
  try {
    import('./audio-engine').then(({ getMoteurAudio }) => getMoteurAudio().attenuerPourVoix(false)).catch(() => {});
  } catch {
    /* jamais critique */
  }
}

async function parlerNeural(
  texte: string,
  profil: ProfilVoix,
  debitGlobal: number,
  fin?: () => void
): Promise<void> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voix: profil.id, texte, debit: debitGlobal }),
  });
  if (!res.ok) throw new Error('voix neuronale indisponible');
  const blob = await res.blob();
  if (lectureAnnulee) return;
  await new Promise<void>((resoudre) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    let fini = false;
    const terminer = () => {
      if (fini) return;
      fini = true;
      lectureNeurale = null;
      relacherDucking();
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* déjà libéré */
      }
      resoudre();
    };
    lectureNeurale = { audio, url, terminer };
    audio.onended = terminer;
    audio.onerror = terminer;
    attacherDucking();
    audio.play().catch(terminer);
  });
  fin?.();
}

interface OptionsParler {
  profil?: ProfilVoix;
  fin?: () => void;
  debitGlobal?: number; // multiplicateur réglé par l'utilisateur (0,6 – 1,4)
}

function parlerNavigateur(texte: string, opts: OptionsParler): Promise<void> {
  return new Promise((resoudre) => {
    if (!ttsSupporte() || !texte.trim()) return resoudre();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    const p = opts.profil || VOIX_SPU[0];
    u.pitch = Math.max(0, Math.min(2, p.pitch));
    u.rate = Math.max(0.1, Math.min(2, p.rate * (opts.debitGlobal ?? 1)));
    const v = voixFrancaise();
    if (v) u.voice = v;
    u.onend = () => resoudre();
    u.onerror = () => resoudre();
    window.speechSynthesis.speak(u);
  });
}

async function parlerUnSegment(texte: string, opts: OptionsParler): Promise<void> {
  if (!texte.trim()) return;
  const profil = opts.profil || VOIX_SPU[0];
  const debit = opts.debitGlobal ?? 1;
  if (etatNeuralesClient.disponible) {
    try {
      await parlerNeural(texte, profil, debit, opts.fin);
      return;
    } catch {
      /* moteur momentanément indisponible → repli navigateur */
    }
  }
  await parlerNavigateur(texte, opts);
}

const pauseMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Découpe un bloc de texte en segments de ~220 caractères aux frontières de phrases. */
function decouperNarration(texte: string): string[] {
  const phrases = texte.match(/[^.!?…]+[.!?…]+["»)\s]*|[^.!?…]+$/g) || [texte];
  const segments: string[] = [];
  let courant = '';
  for (const ph of phrases) {
    if ((courant + ph).length > 220 && courant) {
      segments.push(courant.trim());
      courant = ph;
    } else courant += ph;
  }
  if (courant.trim()) segments.push(courant.trim());
  return segments.filter(Boolean);
}

// ── Lecture simple (une voix) ─────────────────────────────────────────────────
let lectureAnnulee = false;

export async function ttsParler(texte: string, opts: OptionsParler = {}) {
  if (typeof window === 'undefined') return;
  ttsStop();
  await verifierNeurales();
  lectureAnnulee = false;
  for (const seg of decouperNarration(texte)) {
    if (lectureAnnulee) return;
    await parlerUnSegment(seg, opts);
    await pauseMs(120);
  }
}

// ── Théâtre sonore : narration + dialogues avec voix distinctes ───────────────
// Les passages entre « … » sont parlés par des personnages (voix en rotation),
// le reste par le narrateur. Respiration de 220 ms entre chaque prise de parole.
export async function lireTheatre(
  texte: string,
  reglages: { narrateur: string; personnages: string[]; debit: number } = { ...VOIX_PAR_DEFAUT, debit: 1 }
) {
  if (typeof window === 'undefined') return;
  ttsStop();
  await verifierNeurales();
  lectureAnnulee = false;

  const voixNarrateur = profilParId(reglages.narrateur);
  const voixPersos = (reglages.personnages.length ? reglages.personnages : VOIX_PAR_DEFAUT.personnages).map(profilParId);

  // Découpage : alternance narration / dialogues « … »
  const morceaux = texte.split(/(«[^»]*»)/g).filter((m) => m.trim());
  let indicePerso = 0;

  for (const morceau of morceaux) {
    if (lectureAnnulee) return;
    const estDialogue = /^«[^»]*»$/.test(morceau.trim());
    if (estDialogue) {
      const profil = voixPersos[indicePerso % Math.max(1, voixPersos.length)];
      indicePerso++;
      await parlerUnSegment(morceau, { profil, debitGlobal: reglages.debit });
    } else {
      for (const seg of decouperNarration(morceau)) {
        if (lectureAnnulee) return;
        await parlerUnSegment(seg, { profil: voixNarrateur, debitGlobal: reglages.debit });
      }
    }
    await pauseMs(220); // respiration entre les prises de parole
  }
}

/** Bouton « écouter » du panneau Voix : même chaîne que la lecture réelle. */
export async function ttsEssayer(idProfil: string, phrase: string, debit: number) {
  if (typeof window === 'undefined') return;
  ttsStop();
  await verifierNeurales();
  lectureAnnulee = false;
  await parlerUnSegment(phrase, { profil: profilParId(idProfil), debitGlobal: debit, fin: () => {} });
}

export function ttsPause() {
  if (lectureNeurale) {
    try {
      lectureNeurale.audio.pause();
    } catch {
      /* élément libéré */
    }
    return;
  }
  if (ttsSupporte()) window.speechSynthesis.pause();
}

export function ttsReprise() {
  if (lectureNeurale) {
    try {
      void lectureNeurale.audio.play();
    } catch {
      /* élément libéré */
    }
    return;
  }
  if (ttsSupporte()) window.speechSynthesis.resume();
}

export function ttsStop() {
  lectureAnnulee = true; // stoppe la boucle neuronale dès le segment courant
  if (lectureNeurale) {
    const l = lectureNeurale;
    lectureNeurale = null;
    try {
      l.audio.pause();
    } catch {
      /* élément libéré */
    }
    l.terminer();
  }
  if (!ttsSupporte()) return;
  window.speechSynthesis.cancel();
  // libère le flag après la fin du cancel (cancel est synchrone)
  setTimeout(() => {
    lectureAnnulee = false;
  }, 60);
}

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

// ── Les 12 voix principales du SPU (v6.0 — exigence du concepteur : 12 timbres
//    NETTEMENT distinctibles, hommes et femmes, hébergés dans le cloud) ─────────
export const VOIX_SPU: ProfilVoix[] = [
  { id: 'narrateur', nom: 'Narrateur', role: 'Voix principale — raconte tout le récit', pitch: 0.85, rate: 0.92, emoji: '🎭' },
  { id: 'conteur', nom: 'Conteur du soir', role: 'Alternance du narrateur — ton feutré pour les passages de transition', pitch: 0.78, rate: 0.88, emoji: '🕯️' },
  { id: 'sage', nom: 'Le Sage', role: 'Vieil homme posé — mentors, aïeuls, maîtres exhortants', pitch: 0.72, rate: 0.82, emoji: '🧙' },
  { id: 'homme-jeune', nom: 'Jeune homme', role: 'Adulte homme — voyageurs, apprentis, héros', pitch: 0.95, rate: 1.0, emoji: '👨' },
  { id: 'homme-mure', nom: 'Homme mûr', role: 'Adulte homme — pères, artisans', pitch: 0.8, rate: 0.94, emoji: '🧔' },
  { id: 'homme-vigoureux', nom: 'Homme vigoureux', role: 'Adulte homme — guerriers, chefs, voisins solides', pitch: 0.88, rate: 1.0, emoji: '💪' },
  { id: 'femme-jeune', nom: 'Jeune femme', role: 'Adulte femme — héroïnes, compagnes', pitch: 1.28, rate: 1.0, emoji: '👩' },
  { id: 'femme-mure', nom: 'Femme expérimentée', role: 'Adulte femme — mères, guides', pitch: 1.05, rate: 0.95, emoji: '👩‍🦳' },
  { id: 'femme-conteuse', nom: 'Raconteuse', role: 'Femme conteuse — transitions douces, voix du soir', pitch: 1.15, rate: 0.9, emoji: '📖' },
  { id: 'vieille-femme', nom: 'Aïeule', role: 'Femme âgée — grands-mères, sages-femmes', pitch: 1.12, rate: 0.8, emoji: '👵' },
  { id: 'enfant-fille', nom: 'Petite fille', role: 'Enfant (6-12 ans) — voix claire et vive', pitch: 1.65, rate: 1.08, emoji: '👧' },
  { id: 'enfant-garcon', nom: 'Petit garçon', role: 'Enfant (6-12 ans) — voix gauche et curieuse', pitch: 1.45, rate: 1.04, emoji: '👦' },
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

// Annulation de la lecture en cours : ttsStop() interrompt aussi les
// générations en vol (plus aucun fetch fantôme après un arrêt).
let controleLecture: AbortController | null = null;

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

/** GÉNÉRATION seule : produit le WAV d'un segment via Piper — SANS le jouer.
 *  C'est la clé de la narration CONTINUE (v6.1) : chaque segment est généré
 *  EN AVANCE, pendant que le précédent se joue, et la lecture enchaîne les
 *  fichiers déjà prêts — plus jamais un blanc de « génération » entre deux
 *  phrases. */
async function genererBlobNeural(texte: string, profil: ProfilVoix, debitGlobal: number): Promise<Blob> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voix: profil.id, texte, debit: debitGlobal }),
    signal: controleLecture?.signal,
  });
  if (!res.ok) throw new Error('voix neuronale indisponible');
  return await res.blob();
}

/** LECTURE seule : joue un WAV déjà prêt (le plus vite possible, sans latence). */
async function jouerBlobNeural(blob: Blob): Promise<void> {
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

interface PriseDeParole {
  texte: string;
  profil: ProfilVoix;
  pauseAvantMs?: number; // respiration VOLONTAIRE (changement de personnage)
}

/** Le moteur de narration CONTINUE (v6.1).
 *  Principe : une file d'attente de sons. Trois générations Piper tournent
 *  toujours EN AVANCE de la lecture ; dès qu'un segment finit de se jouer, le
 *  suivant est DÉJÀ prêt dans la file — la voix enchaîne sans aucun blanc.
 *  Si Piper tombe en cours de route : repli navigateur pour le reste du texte. */
async function lireEnContinu(prises: PriseDeParole[], debit: number) {
  if (!prises.length) return;
  const neurale = etatNeuralesClient.disponible;

  if (!neurale) {
    // navigateur : la synthèse locale est déjà continue (file interne du navigateur)
    for (const p of prises) {
      if (lectureAnnulee) return;
      if (p.pauseAvantMs) await pauseMs(p.pauseAvantMs);
      await parlerNavigateur(p.texte, { profil: p.profil, debitGlobal: debit });
    }
    return;
  }

  // File de génération : 3 segments préparés en permanence devant la lecture.
  const EN_AVANCE = 3;
  let curseur = 0; // prochain segment à générer
  let lus = 0; // segments déjà joués (et retirés de la file)
  let piperTombe = false; // Piper indisponible en cours de route → repli navigateur
  const file: Promise<Blob | null>[] = [];
  const lancerGeneration = () => {
    while (curseur < prises.length && file.length - lus < EN_AVANCE) {
      const p = prises[curseur];
      const promesse = genererBlobNeural(p.texte, p.profil, debit)
        .then((b) => b as Blob)
        .catch(() => null); // échec → null : le segment passera au repli navigateur
      file.push(promesse);
      curseur++;
    }
  };

  for (let i = 0; i < prises.length; i++) {
    if (lectureAnnulee) return;
    const p = prises[i];
    if (p.pauseAvantMs) await pauseMs(p.pauseAvantMs);
    lancerGeneration();
    const blob = await file.shift()!; // attend le son déjà en génération
    lus++;
    if (lectureAnnulee) return;
    if (blob && !piperTombe) {
      await jouerBlobNeural(blob);
    } else {
      // Piper indisponible pour ce segment → repli navigateur, et on y reste
      // (évite d'alterner voix neuronale et voix navigateur au fil du texte)
      piperTombe = true;
      await parlerNavigateur(p.texte, { profil: p.profil, debitGlobal: debit });
    }
  }
}

const pauseMs = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Découpe un bloc de texte en segments de ~300 caractères aux frontières de
 *  phrases — de grands segments = moins de jonctions = narration plus fluide.
 *  v6.3 — le PREMIER segment est court (≈130 caractères) : Piper le synthétise
 *  en une fraction de seconde, la voix démarre dès l'arrivée de la réponse,
 *  pendant que les segments suivants (grands) se préparent en cascade. */
function decouperNarration(texte: string, taillePremier = 300): string[] {
  const phrases = texte.match(/[^.!?…]+[.!?…]+["»)\s]*|[^.!?…]+$/g) || [texte];
  const segments: string[] = [];
  let courant = '';
  for (const ph of phrases) {
    const limite = segments.length === 0 ? taillePremier : 300;
    if ((courant + ph).length > limite && courant) {
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
  controleLecture = new AbortController();
  const profil = opts.profil || VOIX_SPU[0];
  try {
    // v6.3 — narration CONTINUE et DÉMARRAGE IMMÉDIAT : le premier segment est
    // court (≈130 caractères) pour que la voix commence en moins d'une seconde ;
    // les segments suivants, grands, se préparent pendant ce temps.
    await lireEnContinu(
      decouperNarration(texte, 130).map((seg) => ({ texte: seg, profil })),
      opts.debitGlobal ?? 1
    );
  } finally {
    controleLecture = null;
    opts.fin?.();
  }
}

// ── Préchauffage des voix neuronales (v6.3) ───────────────────────────────────
// Le premier appel Piper charge le modèle en mémoire (1 à 3 s) : ce préchauffage
// est lancé au démarrage du SPU (et à l'activation de la narration) avec une
// phrase minuscule — quand la réponse arrive, la voix démarre SANS délai.
let prechauffeFait = false;
export async function prechaufferNeurales(): Promise<void> {
  if (typeof window === 'undefined' || prechauffeFait) return;
  const etat = await verifierNeurales();
  if (!etat.disponible) return;
  prechauffeFait = true;
  try {
    const controle = new AbortController();
    const annuler = setTimeout(() => controle.abort(), 25000);
    await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voix: 'narrateur', texte: 'Bonjour.', debit: 1 }),
      signal: controle.signal,
    }).catch(() => {});
    clearTimeout(annuler);
  } catch {
    /* jamais critique : le préchauffage est un confort, pas une étape */
  }
}

// ── Théâtre sonore : narration + dialogues avec voix distinctes ───────────────
// Les passages entre « … » sont parlés par des personnages (voix en rotation),
// le reste par le narrateur — le tout DANS LE MÊME FLUX CONTINU (v6.1) : les
// voix des personnages se préparent pendant que le narrateur parle. Une seule
// respiration légère (120 ms) marque le changement de preneur de parole.
export async function lireTheatre(
  texte: string,
  reglages: { narrateur: string; personnages: string[]; debit: number } = { ...VOIX_PAR_DEFAUT, debit: 1 }
) {
  if (typeof window === 'undefined') return;
  ttsStop();
  await verifierNeurales();
  lectureAnnulee = false;
  controleLecture = new AbortController();

  const voixNarrateur = profilParId(reglages.narrateur);
  const voixPersos = (reglages.personnages.length ? reglages.personnages : VOIX_PAR_DEFAUT.personnages).map(profilParId);

  // Découpage : alternance narration / dialogues « … » — flatten en prises
  // (v6.3 : le premier morceau narré commence par un segment court → démarrage immédiat)
  const morceaux = texte.split(/(«[^»]*»)/g).filter((m) => m.trim());
  const prises: PriseDeParole[] = [];
  let indicePerso = 0;
  let dernier = '';
  for (const [mi, morceau] of morceaux.entries()) {
    const estDialogue = /^«[^»]*»$/.test(morceau.trim());
    if (estDialogue) {
      const profil = voixPersos[indicePerso % Math.max(1, voixPersos.length)];
      indicePerso++;
      prises.push({ texte: morceau.trim(), profil, pauseAvantMs: dernier === 'perso' ? 220 : 140 });
      dernier = 'perso';
    } else {
      for (const seg of decouperNarration(morceau, mi === 0 ? 130 : 300)) {
        prises.push({ texte: seg, profil: voixNarrateur, pauseAvantMs: dernier === 'perso' ? 140 : 0 });
        dernier = 'narr';
      }
    }
  }
  try {
    await lireEnContinu(prises, reglages.debit);
  } finally {
    controleLecture = null;
  }
}

/** Bouton « écouter » du panneau Voix : même chaîne que la lecture réelle. */
export async function ttsEssayer(idProfil: string, phrase: string, debit: number) {
  if (typeof window === 'undefined') return;
  await ttsParler(phrase, { profil: profilParId(idProfil), debitGlobal: debit });
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
  try {
    controleLecture?.abort(); // v6.1 — annule aussi les générations en vol
  } catch {
    /* déjà annulé */
  }
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

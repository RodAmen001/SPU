// ═════════════════════════════════════════════════════════════════════════════
// SPU v5.0 — MOTEUR AUDIO : 100 PISTES, MUSIQUE PARTOUT, SÉLECTION PAR PARABOLE
// Exigences du concepteur : (1) catalogue porté à 100 musiques libres vérifiées ;
// (2) la musique joue sur CHAQUE page (accueil et pages documentaires comprises) ;
// (3) la piste est choisie en fonction DE LA PARABOLE offerte (culture + famille) ;
// (4) rotation séquentielle sans répétition ; (5) son de transition doux (cloche
// de porcelaine) qui convient à toutes les ambiances. Repli hors-ligne : fonds
// SoundHelix embarqués.
// ═════════════════════════════════════════════════════════════════════════════

import CATALOGUE_MUSIQUES from '@/data/musiques-libres.json';

export type ModeMusique = 'oracle' | 'mentor' | 'deep' | 'enfant' | 'boost' | 'accueil';

export interface PisteLibre {
  titre: string;
  artiste: string;
  licence: string;
  source: string;
  url: string;
  usage: string;
  duree: string;
  ambiance: string;
}

const MUSIQUES = CATALOGUE_MUSIQUES as PisteLibre[];

/** v6.3 — la liste des pistes d'un mode (pour le cadre musique : écouter une
 *  piste précise, voir les notes globales de la liste). */
export function pistesDuMode(mode: ModeMusique): PisteLibre[] {
  return sacDePistes(mode);
}

/** Repli hors-ligne : fonds embarqués (SoundHelix, T. Schürger — usage libre). */
const REPLI_LOCAL: Record<ModeMusique, string> = {
  oracle: '/audio/fond-oracle.mp3',
  mentor: '/audio/fond-mentor.mp3',
  deep: '/audio/fond-deep.mp3',
  enfant: '/audio/fond-enfant.mp3',
  boost: '/audio/fond-oracle.mp3',
  accueil: '/audio/fond-oracle.mp3',
};

// v5.0 — son de transition doux : cloche de porcelaine (attaque lente, longue
// décroissance) qui respecte toutes les ambiances musicales.
const FICHIER_JINGLE = '/audio/reponse-douce.mp3';

const DUREE_FONDU_MS = 1800; // fondu enchaîné un peu plus long = transitions douces

// ── Sélection par parabole (exigence v5.0) ───────────────────────────────────
// Chaque famille de paraboles a son atmosphère ; la culture oriente aussi le
// choix. Les mots-clés sont comparés aux champs « ambiance » et « titre » du
// catalogue (catalogue v5.0 enrichi avec les « feel » du site source).
const MOOD_FAMILLE: Record<string, string[]> = {
  F1: ['calm', 'relaxed', 'gentle', 'peaceful', 'patient', 'slow'],
  F2: ['peaceful', 'meditat', 'contempl', 'calm', 'serene'],
  F3: ['epic', 'heroic', 'brave', 'determined', 'triumphant', 'courage'],
  F4: ['solemn', 'serious', 'mysterious', 'somber', 'justice'],
  F5: ['uplifting', 'bright', 'hopeful', 'morning', 'renewal', 'spring'],
  F6: ['calm', 'grounded', 'warm', 'traditional', 'rooted'],
  F7: ['playful', 'bouncy', 'cheerful', 'light', 'humorous', 'bright'],
  F8: ['reflective', 'pure', 'honest', 'gentle', 'clear'],
  F9: ['driving', 'grooving', 'energetic', 'motion', 'work'],
  F10: ['warm', 'tender', 'love', 'gentle', 'folk', 'together'],
};

const MOOD_CULTURE: Record<string, string[]> = {
  asie: ['oriental', 'asian', 'guzheng', 'koto', 'meditat', 'japan', 'china', 'pentatonic'],
  'afrique de l\'ouest': ['africa', 'african', 'kora', 'drum', 'balafon', 'tribal'],
  'méditerranée': ['classical', 'greek', 'oud', 'guitar', 'lute', 'harpsichord'],
  'nordique / celtique': ['celtic', 'irish', 'folk', 'fiddle', 'nordic', 'harp'],
  'amériques': ['native', 'flute', 'folk', 'american'],
  universaliste: ['ambient', 'piano', 'strings', 'orchestral'],
};

function normaliser(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Score d'une piste pour une parabole donnée (culture + famille). */
function scoreParabole(p: PisteLibre, culture?: string, famille?: string): number {
  const texte = normaliser(`${p.ambiance} ${p.titre}`);
  let score = 0;
  if (famille) for (const c of MOOD_FAMILLE[famille] || []) if (texte.includes(c)) score += 3;
  if (culture) {
    const cN = normaliser(culture);
    for (const [cle, cles] of Object.entries(MOOD_CULTURE)) {
      if (cN.includes(normaliser(cle)) || normaliser(cle).includes(cN)) {
        for (const c of cles) if (texte.includes(c)) score += 2;
      }
    }
  }
  return score;
}

/** Pistes d'un mode (usage peut être composé : "deep+oracle") — sac jamais vide.
 *  v6.0 — le mode BOOST a son sac SPÉCIAL : les pistes épiques, héroïques,
 *  triomphantes et lumineuses du catalogue (mots-clés d'ambiance), choisies pour
 *  satisfaire les attentes du BOOST : monter l'émotion, porter la déclaration. */
function sacDePistes(mode: ModeMusique): PisteLibre[] {
  if (mode === 'boost') {
    const clesBoost = ['epic', 'heroic', 'brave', 'triumph', 'courage', 'determined', 'uplifting', 'bright', 'energetic', 'hopeful', 'advent', 'victory', 'powerful', 'march', 'drum'];
    const sacBoost = MUSIQUES.filter((m) => {
      const texte = normaliser(`${m.ambiance} ${m.titre}`);
      return clesBoost.some((c) => texte.includes(c));
    });
    if (sacBoost.length >= 2) return sacBoost;
  }
  const sac = MUSIQUES.filter((m) => m.usage.split('+').includes(mode));
  return sac.length ? sac : MUSIQUES;
}

export class MoteurAudio {
  private fond: HTMLAudioElement | null = null;
  private jingle: HTMLAudioElement | null = null;
  private modeActuel: ModeMusique | null = null;
  private fonduTimer: ReturnType<typeof setInterval> | null = null;
  private _volume = 0.3;
  private rotation: Record<ModeMusique, number> = { oracle: 0, mentor: 0, deep: 0, enfant: 0, boost: 0, accueil: 0 };
  private dernieresJouees: string[] = []; // URLs récentes (anti-répétition immédiate)
  private infoCourante: PisteLibre | null = null;
  private paraboleCourante: { culture?: string; famille?: string } | null = null;

  get mode(): ModeMusique | null {
    return this.modeActuel;
  }

  get volume(): number {
    return this._volume;
  }

  get pisteCourante(): PisteLibre | null {
    return this.infoCourante;
  }

  /** Nom du morceau en cours — affichage « maintenant à l'écoute ». */
  pisteActuelle(): string | null {
    return this.infoCourante ? `${this.infoCourante.titre} · ${this.infoCourante.artiste}` : null;
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.fond && !this.enFondu) {
      try {
        this.fond.volume = this.volumeEffective;
      } catch {
        /* élément libéré */
      }
    }
  }

  /** Le fond tourne à 65 % du volume global pour laisser la place à la voix. */
  private get volumeEffective(): number {
    return Math.max(0, Math.min(1, this._volume * 0.65));
  }

  /**
   * Atténuation supplémentaire pendant la voix (théâtre sonore) : le fond descend
   * à 35 % de son niveau habituel pour que chaque prise de parole reste claire.
   */
  attenuerPourVoix(actif: boolean) {
    if (!this.fond) return;
    try {
      this.fond.volume = actif ? this.volumeEffective * 0.35 : this.volumeEffective;
    } catch {
      /* élément libéré */
    }
  }

  private get enFondu(): boolean {
    return !!this.fonduTimer;
  }

  /**
   * Rotation séquentielle (v5.0) : piste SUIVANTE du sac — les musiques se
   * déroulent les unes après les autres, sans répéter les 3 dernières.
   * `parabole` (culture + famille) oriente le choix vers l'ambiance qui
   * résonne avec elle : la musique devient le prolongement de la parabole.
   */
  private pisterSuivante(mode: ModeMusique): PisteLibre {
    let sac = sacDePistes(mode);
    const parabole = this.paraboleCourante;
    // sélection par parabole : parmi tout le catalogue, les meilleures résonances
    if (parabole && (parabole.culture || parabole.famille)) {
      const classees = [...MUSIQUES]
        .map((p) => ({ p, s: scoreParabole(p, parabole.culture, parabole.famille) }))
        .sort((a, b) => b.s - a.s);
      const positives = classees.filter((x) => x.s > 0).map((x) => x.p);
      if (positives.length >= 3) sac = positives.slice(0, Math.max(6, Math.ceil(positives.length / 2)));
      else if (positives.length) sac = positives;
    }
    const base = this.rotation[mode] || 0;
    let choisie = sac[base % sac.length];
    for (let essai = 0; essai < sac.length; essai++) {
      const idx = (base + essai) % sac.length;
      if (!this.dernieresJouees.slice(-3).includes(sac[idx].url)) {
        choisie = sac[idx];
        this.rotation[mode] = (idx + 1) % sac.length;
        break;
      }
    }
    if (!this.dernieresJouees.slice(-3).includes(choisie.url)) this.rotation[mode] = (base + 1) % sac.length;
    this.dernieresJouees.push(choisie.url);
    if (this.dernieresJouees.length > 8) this.dernieresJouees.shift();
    return choisie;
  }

  /**
   * v6.1 — « MUSIQUE SUIVANTE » : l'utilisateur passe une piste qui lui déplait.
   * Le mode courant est conservé, la piste suivante du sac démarre en fondu —
   * disponible à tout moment depuis la barre de menu.
   */
  pisteSuivante(): PisteLibre | null {
    if (typeof window === 'undefined' || !this.modeActuel) return null;
    this.jouerMode(this.modeActuel); // joueMode piste déjà la SUIVANTE du sac
    return this.infoCourante;
  }

  /**
   * Démarre (ou bascule avec fondu) la musique de fond : une NOUVELLE piste à
   * chaque appel. Repli automatique sur le fond local si le MP3 en ligne est
   * indisponible (hors-ligne, blocage réseau).
   */
  jouerMode(mode: ModeMusique) {
    if (typeof window === 'undefined') return;
    // changer de page sans perdre l'orientation par parabole (elle reste valable
    // tant qu'aucune nouvelle parabole n'a été offerte)
    this.arreterFond(DUREE_FONDU_MS);
    this.modeActuel = mode;
    const info = this.pisterSuivante(mode);
    this.infoCourante = info;
    this.demarrerAudio(mode, info);
  }

  /** v6.3 — REJOUER la piste courante depuis le début (cadre musique). */
  rejouerPiste(): PisteLibre | null {
    if (typeof window === 'undefined') return null;
    if (!this.modeActuel || !this.infoCourante) return this.pisteSuivante();
    const info = this.infoCourante;
    const mode = this.modeActuel;
    this.arreterFond(300);
    this.demarrerAudio(mode, info);
    return info;
  }

  /** v6.3 — jouer UNE piste précise du catalogue (clic dans la liste du cadre). */
  jouerPiste(mode: ModeMusique, piste: PisteLibre): void {
    if (typeof window === 'undefined') return;
    this.arreterFond(DUREE_FONDU_MS);
    this.modeActuel = mode;
    this.infoCourante = piste;
    this.dernieresJouees.push(piste.url);
    if (this.dernieresJouees.length > 8) this.dernieresJouees.shift();
    this.demarrerAudio(mode, piste);
  }

  /** v6.3 — pause / reprise de la piste courante (cadre musique). */
  basculerLecture(): boolean {
    if (!this.fond) return false;
    try {
      if (this.fond.paused) {
        void this.fond.play();
        return true;
      }
      this.fond.pause();
      return false;
    } catch {
      return false;
    }
  }

  /** Lancement réel de l'audio d'une piste (fondu d'entrée, repli local). */
  private demarrerAudio(mode: ModeMusique, info: PisteLibre) {
    const lancer = (audio: HTMLAudioElement, info: PisteLibre) => {
      this.fond = audio;
      const demarrer = () => {
        if (this.fond !== audio || this._volume === 0) return;
        audio.play().catch(() => {
          /* autoplay bloqué : un geste utilisateur activera au prochain clic */
        });
        this.fonduVolume(audio, this.volumeEffective, DUREE_FONDU_MS);
      };
      if (audio.readyState >= 2) demarrer();
      else audio.addEventListener('canplay', demarrer, { once: true });
      audio.addEventListener('error', () => {
        // MP3 en ligne injoignable → repli sur le fond local embarqué
        if (this.fond !== audio) return;
        this.arreterFond(300);
        const local = new Audio(REPLI_LOCAL[mode]);
        local.loop = true;
        local.volume = 0.0001;
        local.preload = 'auto';
        this.infoCourante = null; // fond de repli sans titre distant
        lancer(local, info);
      }, { once: true });
    };
    const audio = new Audio(info.url);
    // v6.7 — la piste distante NE boucle PLUS : quand elle finit, la SUIVANTE du
    // sac démarre toute seule (la musique change, comme l'attendent les auditeurs).
    // (le repli local, lui, reste en boucle : c'est une ambiance sans titre)
    audio.loop = false;
    audio.volume = 0.0001;
    audio.preload = 'auto';
    audio.addEventListener('ended', () => {
      if (this.fond === audio) this.pisteSuivante();
    });
    lancer(audio, info);
  }

  /**
   * v5.0 — accorde la musique à LA PARABOLE offerte : dès que la parabole est
   * choisie, le fond bascule (fondu doux) vers une piste qui résonne avec sa
   * culture et sa famille — même en cours de réponse.
   */
  accorderParabole(parabole: { culture?: string; famille?: string }) {
    if (typeof window === 'undefined') return;
    this.paraboleCourante = { culture: parabole.culture, famille: parabole.famille };
    // retente uniquement si la musique est effectivement en cours de lecture
    if (this.modeActuel && this.fond && !this.fond.paused) this.jouerMode(this.modeActuel);
  }

  /**
   * v6.0 — le fond épouse CHAQUE SCÈNE du BOOST :
   * « douce » → discret, « tension » → présent, « declaration » → très atténué
   * (la parole forte domine), « triomphe » → plein volume au retour de la joie.
   */
  ajusterScene(hint: 'douce' | 'tension' | 'declaration' | 'triomphe') {
    if (!this.fond) return;
    const facteur = hint === 'douce' ? 0.5 : hint === 'tension' ? 0.8 : hint === 'declaration' ? 0.3 : 1.0;
    try {
      this.fond.volume = Math.max(0, Math.min(1, this.volumeEffective * facteur));
    } catch {
      /* élément libéré */
    }
  }

  /** Son de transition doux : joué une seule fois, par-dessus le fond légèrement atténué. */
  jingleReponse() {
    if (typeof window === 'undefined' || this._volume === 0) return;
    try {
      if (this.jingle) {
        this.jingle.pause();
        this.jingle = null;
      }
      // atténuation douce du fond pendant le signal (ducking léger : 60 % conservés)
      const avant = this.fond ? this.fond.volume : 0;
      if (this.fond) this.fond.volume = Math.max(0, avant * 0.6);
      const audio = new Audio(FICHIER_JINGLE);
      audio.volume = Math.max(0, Math.min(1, this._volume * 0.55));
      this.jingle = audio;
      audio.addEventListener('ended', () => {
        if (this.jingle === audio) this.jingle = null;
        if (this.fond && this.modeActuel && !this.enFondu) {
          try {
            this.fond.volume = this.volumeEffective; // le fond reprend sa place
          } catch {
            /* élément libéré */
          }
        }
      });
      audio.play().catch(() => {});
    } catch {
      /* jamais critique */
    }
  }

  /** Fondu de sortie du fond (durée ms) puis arrêt complet. */
  private arreterFond(duree: number) {
    if (!this.fond) return;
    const audio = this.fond;
    this.fond = null;
    const pas = 50;
    const iterations = Math.max(1, Math.floor(duree / pas));
    const volumeDepart = audio.volume;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      try {
        audio.volume = Math.max(0.0001, volumeDepart * (1 - i / iterations));
        if (i >= iterations) {
          clearInterval(timer);
          audio.pause();
          audio.src = '';
        }
      } catch {
        clearInterval(timer);
      }
    }, pas);
  }

  private fonduVolume(audio: HTMLAudioElement, cible: number, duree: number) {
    if (this.fonduTimer) clearInterval(this.fonduTimer);
    const pas = 50;
    const iterations = Math.max(1, Math.floor(duree / pas));
    const depart = audio.volume;
    let i = 0;
    this.fonduTimer = setInterval(() => {
      i++;
      try {
        audio.volume = Math.min(cible, depart + (cible - depart) * (i / iterations));
        if (i >= iterations) {
          clearInterval(this.fonduTimer!);
          this.fonduTimer = null;
          audio.volume = cible;
        }
      } catch {
        if (this.fonduTimer) clearInterval(this.fonduTimer);
        this.fonduTimer = null;
      }
    }, pas);
  }

  couper() {
    this.arreterFond(DUREE_FONDU_MS);
    this.modeActuel = null;
    if (this.jingle) {
      try {
        this.jingle.pause();
      } catch {
        /* élément libéré */
      }
      this.jingle = null;
    }
  }
}

// Instance singleton côté client
let moteur: MoteurAudio | null = null;
export function getMoteurAudio(): MoteurAudio {
  if (!moteur) moteur = new MoteurAudio();
  return moteur;
}

// Moteur audio SPU — vraies musiques MP3 libres (SoundHelix, T. Schürger — usage libre,
// musique algorithmique instrumentale sans paroles) + jingle de réponse.
// Une musique de fond par mode (oracle / mentor / deep / enfant), en boucle douce,
// avec fondus de 1,5 s ; un jingle distinct accompagne l'arrivée de la réponse.

export type ModeMusique = 'oracle' | 'mentor' | 'deep' | 'enfant';

const FICHIERS_FOND: Record<ModeMusique, string> = {
  oracle: '/audio/fond-oracle.mp3', // Song 3 — majestueux, contemplatif
  mentor: '/audio/fond-mentor.mp3', // Song 8 — chaleureux, compagnon de route
  deep: '/audio/fond-deep.mp3', // Song 5 — profond, ralentit le rythme
  enfant: '/audio/fond-enfant.mp3', // Song 12 — léger, espiègle et doux
};

const FICHIER_JINGLE = '/audio/jingle-reponse.mp3'; // Song 13, extrait 13 s — signal de réponse

const DUREE_FONDU_MS = 1500; // fondu enchaîné 5.4 du cahier

export class MoteurAudio {
  private fond: HTMLAudioElement | null = null;
  private jingle: HTMLAudioElement | null = null;
  private modeActuel: ModeMusique | null = null;
  private fonduTimer: ReturnType<typeof setInterval> | null = null;
  private _volume = 0.3;

  get mode(): ModeMusique | null {
    return this.modeActuel;
  }

  get volume(): number {
    return this._volume;
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

  /** Démarre (ou bascule avec fondu) la musique de fond du mode donné. */
  jouerMode(mode: ModeMusique) {
    if (typeof window === 'undefined') return;
    if (this.modeActuel === mode && this.fond && !this.fond.paused) return;
    this.arreterFond(DUREE_FONDU_MS);
    this.modeActuel = mode;
    const audio = new Audio(FICHIERS_FOND[mode]);
    audio.loop = true;
    audio.volume = 0.0001;
    audio.preload = 'auto';
    this.fond = audio;
    const lancer = () => {
      if (this.fond !== audio || this._volume === 0) return;
      audio.play().catch(() => {
        /* autoplay bloqué : un geste utilisateur activera au prochain clic */
      });
      this.fonduVolume(audio, this.volumeEffective, DUREE_FONDU_MS);
    };
    if (audio.readyState >= 2) lancer();
    else audio.addEventListener('canplay', lancer, { once: true });
  }

  /** Jingle de réponse : joué une seule fois, par-dessus le fond légèrement atténué. */
  jingleReponse() {
    if (typeof window === 'undefined' || this._volume === 0) return;
    try {
      if (this.jingle) {
        this.jingle.pause();
        this.jingle = null;
      }
      // atténuation douce du fond pendant le jingle (ducking)
      const avant = this.fond ? this.fond.volume : 0;
      if (this.fond) this.fond.volume = Math.max(0, avant * 0.45);
      const audio = new Audio(FICHIER_JINGLE);
      audio.volume = Math.max(0, Math.min(1, this._volume * 0.9));
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
    this.modeActuel = null;
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

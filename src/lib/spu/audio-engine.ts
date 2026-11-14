// ═════════════════════════════════════════════════════════════════════════════
// SPU v4.8 — MOTEUR AUDIO : PLAYLIST VARIÉE (exigence du concepteur : fin de
// la monotonie). 51 musiques libres de droits (CC-BY 4.0 — Kevin MacLeod,
// incompetech.com ; enregistrements du domaine public) tournent au fil des
// conversations : chaque mode a son sac de pistes adapté à son ambiance, chaque
// nouvelle question puise la suivante (rotation sans répétition), et le jingle
// de réponse reste local. Repli hors-ligne : les 4 fonds SoundHelix embarqués.
// ═════════════════════════════════════════════════════════════════════════════

import CATALOGUE_MUSIQUES from '@/data/musiques-libres.json';

export type ModeMusique = 'oracle' | 'mentor' | 'deep' | 'enfant';

interface PisteLibre {
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

/** Repli hors-ligne : fonds embarqués (SoundHelix, T. Schürger — usage libre). */
const REPLI_LOCAL: Record<ModeMusique, string> = {
  oracle: '/audio/fond-oracle.mp3',
  mentor: '/audio/fond-mentor.mp3',
  deep: '/audio/fond-deep.mp3',
  enfant: '/audio/fond-enfant.mp3',
};

const FICHIER_JINGLE = '/audio/jingle-reponse.mp3'; // Song 13, extrait 13 s — signal de réponse

const DUREE_FONDU_MS = 1500; // fondu enchaîné 5.4 du cahier

/** Pistes d'un mode (usage peut être composé : "deep+oracle") — sac jamais vide. */
function sacDePistes(mode: ModeMusique): PisteLibre[] {
  const sac = MUSIQUES.filter((m) => m.usage.split('+').includes(mode));
  return sac.length ? sac : MUSIQUES;
}

export class MoteurAudio {
  private fond: HTMLAudioElement | null = null;
  private jingle: HTMLAudioElement | null = null;
  private modeActuel: ModeMusique | null = null;
  private fonduTimer: ReturnType<typeof setInterval> | null = null;
  private _volume = 0.3;
  private rotation: Record<ModeMusique, number> = { oracle: 0, mentor: 0, deep: 0, enfant: 0 };
  private dernieresJouees: string[] = []; // URLs récentes (anti-répétition immédiate)
  private infoCourante: PisteLibre | null = null;

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
   * Rotation variée (v4.8) : piste suivante du sac du mode, sans répéter les
   * 3 dernières — la musique change au fil des conversations, comme demandé.
   */
  private pisterSuivante(mode: ModeMusique): PisteLibre {
    const sac = sacDePistes(mode);
    const base = this.rotation[mode] || Math.floor(Math.random() * sac.length);
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
   * Démarre (ou bascule avec fondu) la musique de fond du mode : une NOUVELLE
   * piste de la playlist à chaque appel — chaque nouvelle conversation respire
   * une musique différente. Repli automatique sur le fond local si le MP3 en
   * ligne est indisponible (hors-ligne, blocage réseau).
   */
  jouerMode(mode: ModeMusique) {
    if (typeof window === 'undefined') return;
    this.arreterFond(DUREE_FONDU_MS);
    this.modeActuel = mode;
    const info = this.pisterSuivante(mode);
    this.infoCourante = info;
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
    audio.loop = true;
    audio.volume = 0.0001;
    audio.preload = 'auto';
    lancer(audio, info);
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

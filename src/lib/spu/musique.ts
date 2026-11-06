// ═══════════════════════════════════════════════════════════════════════════
// SPU v4.0 — MUSIQUE RÉELLE (SoundHelix, © T. Schürger, crédit obligatoire)
// Une vraie piste instrumentale par mode (oracle / mentor / deep / enfant)
// + une musique distincte à la réponse du système. Fondu enchaîné, boucle,
// volume réglé à 30 %. Repli automatique sur le moteur procédural si les
// fichiers MP3 sont absents (paquet portable allégé).
// ═══════════════════════════════════════════════════════════════════════════

import { MoteurAudio, type Palier, type ModeMusique } from './audio-engine';

export type { Palier, ModeMusique };

const PISTES: Record<ModeMusique, string> = {
  oracle: '/musique/oracle.mp3', // SoundHelix Song 7 — lent, majestueux
  mentor: '/musique/mentor.mp3', // SoundHelix Song 9 — chaud, présent
  deep: '/musique/deep.mp3', // SoundHelix Song 2 — méditatif, doux
  enfant: '/musique/enfant.mp3', // SoundHelix Song 4 — clair, sautillant
};
const PISTE_REPONSE = '/musique/reponse.mp3'; // SoundHelix Song 12 — brillant, distinct

const FONDU_MS = 1800;
const DUREE_REPONSE_MS = 45000; // la musique de réponse joue ~45 s puis le fond revient

interface PisteChargee {
  audio: HTMLAudioElement;
  chargee: boolean;
}

export class MoteurMusique {
  private modeActuel: ModeMusique = 'oracle';
  private palierActuel: Palier = 'silence';
  private _volume = 0.3;
  private pistes = new Map<ModeMusique, PisteChargee>();
  private pisteReponse: PisteChargee | null = null;
  private reponseEnCours = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  procedural: MoteurAudio | null = null; // moteur procédural de repli (assigné par le singleton)
  private proceduraleSeulement = false; // true si les MP3 ne sont pas disponibles
  onPalier?: (p: Palier) => void;

  get palier(): Palier {
    return this.palierActuel;
  }

  get mode(): ModeMusique {
    return this.modeActuel;
  }

  get volume(): number {
    return this._volume;
  }

  /** Nom du morceau en cours (affichage « maintenant à l'écoute »). */
  pisteActuelle(): string | null {
    if (this.proceduraleSeulement) return null;
    if (this.reponseEnCours) return 'Réponse — SoundHelix Song 12';
    const p = this.pistes.get(this.modeActuel);
    return p?.chargee ? `SoundHelix · ${this.modeActuel}` : null;
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    this.procedural?.setVolume(this._volume);
    this.pistes.forEach((p) => {
      if (p.chargee) p.audio.volume = this._volume * (this.reponseEnCours ? 0.25 : 1);
    });
    if (this.pisteReponse?.chargee) this.pisteReponse.audio.volume = this._volume;
  }

  /** Bascule le monde sonore du mode (prochaine lecture = nouvelle piste). */
  setMode(mode: ModeMusique) {
    if (this.modeActuel === mode) return;
    this.modeActuel = mode;
    if (this.palierActuel !== 'silence') this.jouer(this.palierActuel);
    else this.procedural?.setMode(mode);
  }

  /** Démarre ou bascule vers un palier avec fondu de 1,8 s. */
  jouer(palier: Palier) {
    if (palier === this.palierActuel && palier !== 'silence') return;
    this.palierActuel = palier;
    this.onPalier?.(palier);
    this.procedural?.setMode(this.modeActuel);

    if (palier === 'silence') {
      this.fonduSortieToutes();
      this.procedural?.couper();
      return;
    }
    if (this.proceduraleSeulement) {
      this.procedural?.jouer(palier);
      return;
    }

    const piste = this.assurerPiste(this.modeActuel);
    if (!piste) {
      // MP3 indisponible → moteur procédural pour tout le reste de la session
      this.proceduraleSeulement = true;
      this.procedural?.jouer(palier);
      return;
    }
    this.fonduSortieToutes();
    const audio = piste.audio;
    audio.loop = true;
    audio.volume = 0.0001;
    void audio.play().then(() => this.rampeVolume(audio, this._volume, FONDU_MS)).catch(() => {
      this.proceduraleSeulement = true;
      this.procedural?.jouer(palier);
    });
  }

  couper() {
    this.jouer('silence');
  }

  /**
   * Musique de RÉPONSE : à la livraison de la réponse du système, le fond du
   * mode s'efface, une autre musique (distincte) s'élève ~45 s, puis le fond
   * du mode revient en douceur. Repli : motif choral procédural.
   */
  motifReponse() {
    if (this.proceduraleSeulement || !this.pisteDisponible(PISTE_REPONSE)) {
      this.procedural?.motifReponse();
      return;
    }
    const fond = this.pistes.get(this.modeActuel);
    this.reponseEnCours = true;
    // 1) le fond descend
    if (fond?.chargee) this.rampeVolume(fond.audio, 0, 1200, true);
    // 2) la musique de réponse s'élève
    if (!this.pisteReponse) this.pisteReponse = { audio: new Audio(PISTE_REPONSE), chargee: false };
    const rep = this.pisteReponse.audio;
    rep.loop = false;
    rep.currentTime = 0;
    rep.volume = 0.0001;
    void rep.play().then(() => this.rampeVolume(rep, this._volume, 1400)).catch(() => {
      this.reponseEnCours = false;
      this.procedural?.motifReponse();
    });
    // 3) après ~45 s (ou fin du morceau) : la musique de réponse descend, le fond remonte
    const revenir = () => {
      if (!this.reponseEnCours) return;
      this.reponseEnCours = false;
      this.rampeVolume(rep, 0, 2500, true);
      setTimeout(() => {
        rep.pause();
        if (this.palierActuel !== 'silence' && fond?.chargee) {
          fond.audio.volume = 0.0001;
          void fond.audio.play().then(() => this.rampeVolume(fond.audio, this._volume, 2500)).catch(() => {});
        }
      }, 2600);
    };
    this.timers.push(setTimeout(revenir, DUREE_REPONSE_MS));
    rep.onended = () => {
      if (this.reponseEnCours) revenir();
    };
  }

  /** Abaisse la musique pendant la parole (théâtre sonore) puis la remet. */
  accorderParole(baisse: boolean) {
    const cible = baisse ? 0.25 : 1;
    this.pistes.forEach((p) => {
      if (p.chargee && !this.reponseEnCours) this.rampeVolume(p.audio, this._volume * cible, 600);
    });
  }

  // ── internes ────────────────────────────────────────────────────────────────

  private pisteDisponible(url: string): boolean {
    // on ne sait pas tester un MP3 sans le charger : on tente et on replie à l'erreur
    return !this.proceduraleSeulement;
  }

  private assurerPiste(mode: ModeMusique): PisteChargee | null {
    if (this.proceduraleSeulement) return null;
    let p = this.pistes.get(mode);
    if (!p) {
      const audio = new Audio(PISTES[mode]);
      audio.preload = 'auto';
      p = { audio, chargee: false };
      audio.addEventListener('canplay', () => {
        p!.chargee = true;
      });
      audio.addEventListener('error', () => {
        p!.chargee = false;
        this.proceduraleSeulement = true; // paquet sans musique → moteur procédural
      });
      this.pistes.set(mode, p);
    }
    return p;
  }

  private fonduSortieToutes() {
    this.pistes.forEach((p) => {
      if (p.chargee && !p.audio.paused) this.rampeVolume(p.audio, 0, FONDU_MS, true);
    });
    if (this.pisteReponse?.chargee && !this.pisteReponse.audio.paused) this.rampeVolume(this.pisteReponse.audio, 0, FONDU_MS, true);
  }

  private rampeVolume(audio: HTMLAudioElement, cible: number, dureeMs: number, arreterApres = false) {
    const debut = audio.volume;
    const t0 = performance.now();
    const pas = () => {
      const t = Math.min(1, (performance.now() - t0) / dureeMs);
      audio.volume = Math.max(0, Math.min(1, debut + (cible - debut) * t));
      if (t < 1) requestAnimationFrame(pas);
      else if (arreterApres && cible === 0) audio.pause();
    };
    requestAnimationFrame(pas);
  }
}

// Instance singleton côté client
let moteur: MoteurMusique | null = null;
export function getMoteurAudio(): MoteurMusique {
  if (!moteur) {
    moteur = new MoteurMusique();
    moteur.procedural = new MoteurAudio(); // repli procédural prêt
    moteur.procedural.setVolume(moteur.volume);
  }
  return moteur;
}

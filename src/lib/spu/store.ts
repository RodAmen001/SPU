// État client SPU : session, compte SPU, réglages audio et voix — persistés localement
'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { VOIX_PAR_DEFAUT } from './tts';

interface EtatSpu {
  sessionId: string | null;
  audioActive: boolean;
  volume: number;
  ttsActive: boolean;
  // Réglages des voix du théâtre sonore (paramétrables par l'utilisateur)
  voixNarrateur: string;
  voixPersonnages: string[];
  debitVoix: number;
  // Compte SPU (token d'authentification + pseudo)
  compteToken: string | null;
  comptePseudo: string | null;
  setSessionId: (id: string) => void;
  setAudioActive: (v: boolean) => void;
  setVolume: (v: number) => void;
  setTtsActive: (v: boolean) => void;
  setVoixNarrateur: (id: string) => void;
  setVoixPersonnages: (ids: string[]) => void;
  setDebitVoix: (v: number) => void;
  setCompte: (token: string | null, pseudo: string | null) => void;
  reinitialiserVoix: () => void;
}

export const useSpuStore = create<EtatSpu>()(
  persist(
    (set) => ({
      sessionId: null,
      audioActive: false,
      volume: 0.3,
      ttsActive: false,
      voixNarrateur: VOIX_PAR_DEFAUT.narrateur,
      voixPersonnages: [...VOIX_PAR_DEFAUT.personnages],
      debitVoix: 1,
      compteToken: null,
      comptePseudo: null,
      setSessionId: (id) => set({ sessionId: id }),
      setAudioActive: (v) => set({ audioActive: v }),
      setVolume: (v) => set({ volume: v }),
      setTtsActive: (v) => set({ ttsActive: v }),
      setVoixNarrateur: (id) => set({ voixNarrateur: id }),
      setVoixPersonnages: (ids) => set({ voixPersonnages: ids.slice(0, 4) }),
      setDebitVoix: (v) => set({ debitVoix: Math.max(0.6, Math.min(1.4, v)) }),
      setCompte: (token, pseudo) => set({ compteToken: token, comptePseudo: pseudo }),
      reinitialiserVoix: () =>
        set({ voixNarrateur: VOIX_PAR_DEFAUT.narrateur, voixPersonnages: [...VOIX_PAR_DEFAUT.personnages], debitVoix: 1 }),
    }),
    { name: 'spu-v4' }
  )
);

// ── Types partagés des réponses streamées ──
export interface ParaboleVue {
  id: string;
  code: string;
  enonce: string;
  interpretation: string;
  culture: string;
  famille: string;
  sources: string[];
  score: number;
  sousSeuil: boolean;
}

export interface ReponseVue {
  statut: string | null;
  distress: { message: string; resources: { region: string; lignes: string[] }[]; prudent?: boolean } | null;
  erreur: string | null;
  synthese: { text: string; sources: string[]; confiance: number } | null;
  parabole: ParaboleVue | null;
  histoire: string;
  meditation: string;
  reflexion: string;
  perspective: string;
  angles: string[];
  questionOuverte: string | null;
  final: { echangeId: string; sessionId: string; etape?: number; niveau?: number; perspectiveDisponible?: boolean; suiteDisponible?: boolean } | null;
  enCours: boolean;
  heure: string | null; // horodatage de fin de réponse (type messagerie)
}

export const REPONSE_VIDE: ReponseVue = {
  statut: null,
  distress: null,
  erreur: null,
  synthese: null,
  parabole: null,
  histoire: '',
  meditation: '',
  reflexion: '',
  perspective: '',
  angles: [],
  questionOuverte: null,
  final: null,
  enCours: false,
  heure: null,
};

/** Heure courante au format messagerie (fr-FR) : « 14:07 ». */
export function heureMaintenant(): string {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Date + heure complète pour l'historique : « 01/11/2026 à 14:07 ». */
export function dateHeureComplete(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('fr-FR') + ' à ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

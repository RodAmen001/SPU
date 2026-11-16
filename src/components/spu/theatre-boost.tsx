// ═════════════════════════════════════════════════════════════════════════════
// SPU v6.0 — LE THÉÂTRE BOOST (composant client)
// Joue le scénario BOOST reçu du serveur : chaque réplique est parlée par la
// voix DU personnage (12 timbres distincts, moteur Piper via /api/tts), avec
// musique de fond spécialement boostante. En mode Enfant, la bande dessinée
// défile au fur et à mesure que le théâtre audio avance.
// ═════════════════════════════════════════════════════════════════════════════
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Zap } from 'lucide-react';
import type { ScenarioBoost, SceneBoost } from '@/lib/spu/boost';
import { getMoteurAudio } from '@/lib/spu/audio-engine';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  scenario: ScenarioBoost;
  enfant?: boolean; // bande dessinée défilante synchronisée
}

export function TheatreBoost({ scenario, enfant }: Props) {
  const [sceneIdx, setSceneIdx] = useState(-1);
  const [ligneIdx, setLigneIdx] = useState(-1);
  const [enLecture, setEnLecture] = useState(false);
  const [termine, setTermine] = useState(false);
  const annuler = useRef(false);
  const bandeRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const ligneRef = useRef<HTMLDivElement | null>(null);

  // Musique BOOST : piste épicée du catalogue, volume relevé, pas d'atténuation
  const lancerMusiqueBoost = useCallback(() => {
    const moteur = getMoteurAudio();
    moteur.jouerMode('boost');
  }, []);

  const arreterMusique = useCallback(() => {
    // on rend la main à l'ambiance du mode courant (l'écran d'où vient le BOOST)
    getMoteurAudio().couper();
  }, []);

  // lecture complète : scène par scène, réplique par réplique
  const jouer = useCallback(async () => {
    if (enLecture) return;
    annuler.current = false;
    setEnLecture(true);
    setTermine(false);
    lancerMusiqueBoost();
    try {
      for (let s = 0; s < scenario.scenes.length; s++) {
        if (annuler.current) return;
        const scene = scenario.scenes[s];
        setSceneIdx(s);
        setLigneIdx(-1);
        // la musique épouse la scène : douce = discret, declaration/triomphe = présent
        try {
          getMoteurAudio().ajusterScene(scene.musique);
        } catch { /* jamais critique */ }
        await pause(900);
        for (let l = 0; l < scene.lignes.length; l++) {
          if (annuler.current) return;
          const ligne = scene.lignes[l];
          setLigneIdx(l);
          await parlerLigne(ligne.voix, ligne.texte, () => annuler.current);
          await pause(260); // respiration entre les prises de parole
        }
        await pause(700);
      }
      setTermine(true);
    } finally {
      setSceneIdx(-1);
      setLigneIdx(-1);
      setEnLecture(false);
      arreterMusique();
    }
  }, [scenario, enLecture, lancerMusiqueBoost, arreterMusique]);

  // au montage : le BOOST démarre tout seul (après la réponse principale)
  useEffect(() => {
    const t = setTimeout(() => void jouer(), 600);
    return () => {
      clearTimeout(t);
      annuler.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // bande dessinée : suivi de la scène et de la réplique en cours
  useEffect(() => {
    if (!enfant) return;
    (sceneRef.current || ligneRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [sceneIdx, ligneIdx, enfant]);

  const stopper = () => {
    annuler.current = true;
    try { audioCourant?.pause(); } catch { /* déjà arrêté */ }
  };

  const sceneCourante = sceneIdx >= 0 ? scenario.scenes[sceneIdx] : null;

  return (
    <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4 sm:p-6 mt-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-5 w-5 text-amber-600" aria-hidden />
        <h3 className="text-lg font-bold font-serif">⚡ BOOST — {scenario.titre}</h3>
      </div>
      {scenario.resume && !enfant && (
        <p className="text-sm text-[--muted-foreground] mb-3">{scenario.resume}</p>
      )}

      {enfant ? (
        /* ── BANDE DESSINÉE défilante (mode Enfant) ── */
        <div ref={bandeRef} className="flex gap-3 overflow-x-auto scroll-spu pb-3 snap-x">
          {scenario.scenes.map((scene, s) => (
            <div
              key={s}
              ref={s === sceneIdx ? sceneRef : undefined}
              className={`snap-center shrink-0 w-72 rounded-2xl border-2 p-3 transition-all ${
                s === sceneIdx ? 'border-amber-500 bg-amber-500/10 shadow-lg scale-[1.02]' : 'border-[--border] bg-[--card]'
              }`}
            >
              <div className="text-4xl text-center mb-1" aria-hidden>{scene.image}</div>
              <p className="text-center text-sm font-bold mb-2">{scene.titre}</p>
              <div className="space-y-2">
                {scene.lignes.map((l, i) => (
                  <div
                    key={i}
                    ref={s === sceneIdx && i === ligneIdx ? ligneRef : undefined}
                    className={`rounded-xl px-3 py-2 text-sm leading-relaxed transition-colors ${
                      s === sceneIdx && i === ligneIdx
                        ? 'bg-amber-500/25 border border-amber-500 font-medium'
                        : s === sceneIdx && i < ligneIdx
                          ? 'bg-[--muted]/60 text-[--muted-foreground]'
                          : 'bg-[--muted]/30 text-[--muted-foreground]'
                    }`}
                  >
                    <span className="block text-xs font-bold text-amber-700 dark:text-amber-300">{l.perso}</span>
                    {l.didascalie && <span className="block text-xs italic text-[--muted-foreground]">({l.didascalie})</span>}
                    {l.texte}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Théâtre affiché (mode Mentor) ── */
        <div className="space-y-3">
          {sceneCourante ? (
            <div className="rounded-xl bg-[--card] border border-[--border] p-3">
              <p className="text-xs tracking-widest text-amber-700 dark:text-amber-300 uppercase mb-2">
                Phase {sceneCourante.phase} · {sceneCourante.titre}
              </p>
              <div className="space-y-2">
                {sceneCourante.lignes.map((l, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2 transition-all ${
                      i === ligneIdx ? 'bg-amber-500/15 border border-amber-500/60 font-medium' : 'text-[--muted-foreground]'
                    }`}
                  >
                    <span className="block text-xs font-bold text-amber-700 dark:text-amber-300">{l.perso}</span>
                    {l.didascalie && <span className="block text-xs italic">{l.didascalie}</span>}
                    <span className={i === ligneIdx ? 'text-[15px]' : ''}>{l.texte}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : termine ? (
            <p className="text-sm text-[--muted-foreground] italic">
              Théâtre terminé. Que la déclaration de {scenario.heros} t&apos;accompagne — tu peux la rejouer quand tu veux.
            </p>
          ) : (
            <p className="text-sm text-[--muted-foreground]">Le théâtre se prépare…</p>
          )}
        </div>
      )}

      {/* La déclaration forte, toujours visible après le passage */}
      {(termine || (!enLecture && sceneIdx >= 0)) && scenario.declaration && (
        <blockquote className="mt-4 border-l-4 border-amber-500 pl-4 font-serif text-[15px] sm:text-base">
          « {scenario.declaration} »
        </blockquote>
      )}

      <div className="flex items-center gap-2 mt-4">
        {!enLecture && (
          <Button size="sm" onClick={() => void jouer()} className="rounded-full bg-amber-600 hover:bg-amber-600/85 text-white">
            <Play className="h-4 w-4 mr-1" aria-hidden /> {termine ? 'Rejouer le BOOST' : 'Lancer le théâtre'}
          </Button>
        )}
        {enLecture && (
          <Button size="sm" variant="outline" onClick={stopper} className="rounded-full">
            <Square className="h-4 w-4 mr-1" aria-hidden /> Arrêter
          </Button>
        )}
        <span className="text-xs text-[--muted-foreground]">
          {scenario.scenes.length} scènes · {scenario.personnages.length} voix distinctes · ≈ {Math.round(scenario.dureeEstimeeSec / 60)} min {scenario.dureeEstimeeSec % 60 > 30 ? '30' : ''}
        </span>
      </div>
    </div>
  );
}

// ── Une réplique parlée par SA voix (Piper local via /api/tts) ────────────────
let audioCourant: HTMLAudioElement | null = null;

async function parlerLigne(voix: string, texte: string, annule: () => boolean): Promise<void> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voix, texte, debit: 1 }),
    });
    if (res.ok) {
      const blob = await res.blob();
      if (annule()) return;
      await new Promise<void>((resoudre) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioCourant = audio;
        audio.onended = () => { if (audioCourant === audio) audioCourant = null; URL.revokeObjectURL(url); resoudre(); };
        audio.onerror = () => { if (audioCourant === audio) audioCourant = null; URL.revokeObjectURL(url); resoudre(); };
        audio.play().catch(() => resoudre());
      });
      return;
    }
    throw new Error('tts indisponible');
  } catch {
    // repli navigateur : la réplique est quand même jouée (Web Speech)
    await repliNavigateur(texte);
  }
}

function repliNavigateur(texte: string): Promise<void> {
  return new Promise((resoudre) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !texte.trim()) return resoudre();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.onend = () => resoudre();
    u.onerror = () => resoudre();
    window.speechSynthesis.speak(u);
  });
}

export type { SceneBoost };

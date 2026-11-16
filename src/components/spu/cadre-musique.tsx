// ═════════════════════════════════════════════════════════════════════════════
// v6.4 — LE CADRE MUSIQUE ADJACENT
// Exigence du concepteur : noter la musique ne doit JAMAIS empêcher les autres
// actions en cours — en voulant noter, on ne quitte plus jamais la conversation.
// Le cadre est présenté DE MANIÈRE ADJACENTE au fil : colonne à droite sur grand
// écran (beaucoup de place à gauche comme à droite), et sur smartphone un PETIT
// RECTANGLE ÉPINGLÉ EN HAUT, qui n'empêche pas les autres textes et ne se place
// à l'intérieur d'aucun autre cadre.
// Contenu : la piste qui passe (titre · artiste), sa NOTE GLOBALE (moyenne des
// auditeurs renvoyée par /api/musique), la notation 1-5 étoiles, REJOUER, PAUSE,
// SUIVANT — et l'écoute directe d'une piste précise est dans la vue Musiques.
// ═════════════════════════════════════════════════════════════════════════════
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, SkipForward, Star, Volume2 } from 'lucide-react';
import { getMoteurAudio, pistesDuMode, type ModeMusique } from '@/lib/spu/audio-engine';
import { useSpuStore } from '@/lib/spu/store';

export interface PisteCourante {
  titre: string;
  artiste: string;
}

type NotesGlobales = Record<string, { moyenne: number; nb: number }>;

/** Le cadre de notation, dans les deux variantes (panneau adjacent / compacte). */
export function CadreMusique({ variante = 'panneau' }: { variante?: 'panneau' | 'compacte' }) {
  const { audioActive, volume: volumeStore, setVolume } = useSpuStore();
  const [volumeLocal, setVolumeLocal] = useState(Math.round((volumeStore ?? 0.3) * 100));
  const [piste, setPiste] = useState<PisteCourante | null>(null);
  const [enPause, setEnPause] = useState(false);
  const [notes, setNotes] = useState<NotesGlobales>({});
  const [maNote, setMaNote] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const modeRef = useRef<ModeMusique>('accueil');

  // piste courante : rafraîchie chaque seconde (le moteur n'émet pas d'événement) ;
  // la notation est un simple fetch POST — elle ne bloque RIEN, la conversation
  // continue de défiler pendant qu'on note.
  useEffect(() => {
    const id = setInterval(() => {
      const moteur = getMoteurAudio();
      const info = moteur.pisteCourante;
      modeRef.current = moteur.mode || 'accueil';
      setPiste(info ? { titre: info.titre, artiste: info.artiste } : null);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const chargerNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/musique', { cache: 'no-store' });
      const j = (await res.json()) as { pistes: { titre: string; moyenne: number; nb: number }[] };
      const m: NotesGlobales = {};
      for (const p of j.pistes || []) m[p.titre] = { moyenne: p.moyenne, nb: p.nb };
      setNotes(m);
    } catch {
      /* notes indisponibles : le cadre reste utilisable */
    }
  }, []);

  useEffect(() => {
    void chargerNotes();
  }, [chargerNotes]);

  const noter = async (note: number) => {
    if (!piste) return;
    setMaNote(note);
    try {
      const res = await fetch('/api/musique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: piste.titre, artiste: piste.artiste, note, mode: modeRef.current }),
      });
      setMessage(res.ok ? 'Merci ! Ta note rejoint la note globale.' : 'Note non transmise — réessaie.');
      void chargerNotes();
    } catch {
      setMessage('Note non transmise — réessaie.');
    }
  };

  const globale = piste ? notes[piste.titre] : undefined;
  const compacte = variante === 'compacte';

  // v6.5 — LE VOLUME de la musique de fond se règle DANS le cadre : même
  // réglage que le curseur de la barre du haut (état partagé + moteur).
  const reglerVolume = (v: number) => {
    setVolumeLocal(v);
    const f = Math.max(0, Math.min(1, v / 100));
    setVolume(f);
    getMoteurAudio().setVolume(f);
  };

  return (
    <div className="rounded-xl border border-[--primary]/40 bg-[--card]/95 px-3 py-2 shadow-sm">
      {/* Titre courant + note globale — le titre n'est JAMAIS tronqué : c'est
          lui qu'on vient lire quand la musique a changé pendant la lecture. */}
      <p className={`font-medium leading-snug ${compacte ? 'text-[13px]' : 'text-sm'} line-clamp-2`} title={piste ? `${piste.titre} · ${piste.artiste}` : undefined}>
        <span aria-hidden>♫ </span>
        {piste ? (
          <>
            {piste.titre} <span className="text-[--muted-foreground] font-normal">· {piste.artiste}</span>
          </>
        ) : (
          <span className="text-[--muted-foreground] font-normal">{audioActive ? 'piste en cours…' : 'musique coupée'}</span>
        )}
      </p>
      {piste && (
        <p className="text-[11px] text-[--muted-foreground] leading-snug">
          {globale ? (
            <>note globale des auditeurs : <span className="font-semibold text-amber-600 dark:text-amber-400">★ {String(globale.moyenne).replace('.', ',')}/5</span> ({globale.nb})</>
          ) : (
            <>pas encore notée — {pistesDuMode(modeRef.current).length} pistes en rotation</>
          )}
        </p>
      )}

      {/* v6.5 — VOLUME de la musique de fond, directement dans le cadre */}
      <div className={`flex items-center gap-2 ${compacte ? 'mt-1.5' : 'mt-2'}`}>
        <Volume2 className="h-3.5 w-3.5 text-[--muted-foreground] shrink-0" aria-hidden />
        <input
          type="range"
          min={0}
          max={100}
          value={volumeLocal}
          onChange={(e) => reglerVolume(Number(e.target.value))}
          className="flex-1 h-1.5 accent-[--primary]"
          aria-label="volume de la musique de fond"
          title="Volume de la musique de fond"
        />
        <span className="text-[10px] text-[--muted-foreground] w-7 text-right tabular-nums">{volumeLocal}</span>
      </div>

      {/* Notation 1-5 + commandes, sur la même ligne (compact) ou en deux rangées */}
      <div className={`flex items-center gap-1 ${compacte ? 'mt-1' : 'mt-2 flex-wrap'}`}>
        <span className="text-[11px] text-[--muted-foreground] mr-0.5">ta note :</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => void noter(n)}
            className="p-0.5"
            aria-label={`noter cette musique ${n} sur 5`}
            title={`Noter ${n} / 5 — sans quitter ta conversation`}
          >
            <Star className={`h-4 w-4 ${n <= maNote ? 'fill-amber-500 text-amber-500' : 'text-[--muted-foreground]'}`} aria-hidden />
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={() => getMoteurAudio().rejouerPiste()} className="p-1.5 rounded-full hover:bg-[--muted]" title="Rejouer cette piste" aria-label="rejouer la musique">
          <RotateCcw className="h-4 w-4" aria-hidden />
        </button>
        <button onClick={() => setEnPause(!getMoteurAudio().basculerLecture())} className="p-1.5 rounded-full hover:bg-[--muted]" title={enPause ? 'Reprendre' : 'Pause'} aria-label="pause ou reprise de la musique">
          {enPause ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
        </button>
        <button onClick={() => { setMaNote(0); setMessage(null); getMoteurAudio().pisteSuivante(); }} className="p-1.5 rounded-full hover:bg-[--muted]" title="Musique suivante" aria-label="musique suivante">
          <SkipForward className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {message && compacte && <p className="text-[11px] text-[--primary] mt-0.5 truncate">{message}</p>}
      {message && !compacte && <p className="text-xs text-[--primary] mt-1">{message}</p>}
      {!compacte && (
        <p className="text-[11px] text-[--muted-foreground] mt-2 leading-snug">
          Noter, rejouer ou passer ne quitte JAMAIS ta conversation : le cadre reste à côté du fil.
          Les notes remontent au SPU pour classer les musiques par mode et retirer les inappropriées.
        </p>
      )}
    </div>
  );
}

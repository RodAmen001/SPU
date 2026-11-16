// ═════════════════════════════════════════════════════════════════════════════
// SPU v6.3 — LE THÉÂTRE BOOST (composant client)
// Joue le scénario BOOST reçu du serveur : chaque réplique est parlée par la
// voix DU personnage (12 timbres distincts, moteur Piper via /api/tts), avec
// musique de fond spécialement boostante. En mode Enfant, la bande dessinée
// défile au fur et à mesure que le théâtre audio avance.
// v6.3 — SCÈNE RÉELLE : TOUTES les voix sont générées AVANT la première réplique
// (barre de progression « Préparation des voix… n/m », 4 générations en
// parallèle) puis la lecture enchaîne SANS AUCUNE latence — plus jamais
// d'attente entre deux prises de parole. Et comme au théâtre, LE CONTEUR
// ANNONCE l'ouverture de chaque scène et CHAQUE personnage qui prend la parole
// pour la première fois (« Thomas, l'ami. ») — jamais de voix mystérieuse.
// v6.1 — le BOOST est une PROPOSITION : jamais de lancement automatique.
// ═════════════════════════════════════════════════════════════════════════════
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Zap } from 'lucide-react';
import type { ScenarioBoost, SceneBoost, LigneTheatre } from '@/lib/spu/boost';
import { getMoteurAudio } from '@/lib/spu/audio-engine';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  scenario: ScenarioBoost;
  enfant?: boolean; // bande dessinée défilante synchronisée
}

// Une entrée de la file de lecture : réplique du scénario OU annonce du conteur.
interface EntreeFile {
  ligne: LigneTheatre;
  s: number; // index de scène (pour la bande dessinée)
  i: number; // index de réplique dans la scène (-1 pour une annonce d'ouverture)
  sc: SceneBoost;
  annonce?: boolean; // réplique du conteur (ouverture de scène / présentation)
}

export function TheatreBoost({ scenario, enfant }: Props) {
  const [sceneIdx, setSceneIdx] = useState(-1);
  const [ligneIdx, setLigneIdx] = useState(-1);
  const [demarre, setDemarre] = useState(false);
  const [enLecture, setEnLecture] = useState(false);
  const [preparation, setPreparation] = useState<{ fait: number; total: number } | null>(null);
  const [termine, setTermine] = useState(false);
  const annuler = useRef(false);
  const controlePrep = useRef<AbortController | null>(null);
  const blobsPrepares = useRef<(Blob | null)[] | null>(null); // cache : rejouer = zéro préparation
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

  // ── Construction de la file de lecture (v6.3 — SCÈNE RÉELLE) ──
  // Le conteur ouvre chaque scène par son titre, puis présente CHAQUE personnage
  // au moment où il prend la parole pour la première fois : « Thomas, l'ami. »
  const construireFile = useCallback((): EntreeFile[] => {
    const cont = scenario.personnages.find((p) => p.voix === 'conteur' || /conteur|narrat/i.test(p.nom));
    const voixConteur = cont?.voix || 'narrateur';
    const roleDe = new Map(scenario.personnages.map((p) => [p.nom.toLowerCase(), p.role]));
    const dejaPresents = new Set<string>();
    const file: EntreeFile[] = [];
    scenario.scenes.forEach((sc, s) => {
      file.push({
        ligne: { perso: 'Le Conteur', voix: voixConteur, texte: `${sc.titre}.` },
        s, i: -1, sc, annonce: true,
      });
      sc.lignes.forEach((l, i) => {
        const cle = l.perso.toLowerCase();
        const conteurLuiMeme = l.voix === 'narrateur' || l.voix === voixConteur;
        if (!dejaPresents.has(cle) && !conteurLuiMeme) {
          dejaPresents.add(cle);
          const role = roleDe.get(cle);
          const annonce = role ? `${l.perso}, ${role}.` : `${l.perso}.`;
          file.push({ ligne: { perso: 'Le Conteur', voix: voixConteur, texte: annonce }, s, i, sc, annonce: true });
        }
        file.push({ ligne: l, s, i, sc });
      });
    });
    return file;
  }, [scenario]);

  // lecture complète — v6.3 : PRÉPARATION TOTALE puis lecture sans blancs
  const jouer = useCallback(async () => {
    if (enLecture) return;
    annuler.current = false;
    setDemarre(true);
    setEnLecture(true);
    setTermine(false);
    lancerMusiqueBoost();
    const file = construireFile();

    // 1) PRÉPARATION COMPLÈTE : toutes les voix sont générées AVANT la première
    //    réplique (4 générations Piper en parallèle, barre de progression).
    //    Cache : rejouer le théâtre ne régénère rien.
    let blobs = blobsPrepares.current;
    if (!blobs || blobs.length !== file.length || blobs.every((b) => b === null)) {
      blobs = new Array(file.length).fill(null);
      const controle = new AbortController();
      controlePrep.current = controle;
      let suivant = 0;
      let fait = 0;
      setPreparation({ fait: 0, total: file.length });
      const ouvrier = async () => {
        while (suivant < file.length && !annuler.current && !controle.signal.aborted) {
          const k = suivant++;
          try {
            const res = await fetch('/api/tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ voix: file[k].ligne.voix, texte: file[k].ligne.texte, debit: 1 }),
              signal: controle.signal,
            });
            blobs![k] = res.ok ? await res.blob() : null;
          } catch {
            blobs![k] = null; // Piper indisponible pour cette réplique → repli navigateur
          }
          fait++;
          if (!annuler.current) setPreparation({ fait, total: file.length });
        }
      };
      await Promise.all([ouvrier(), ouvrier(), ouvrier(), ouvrier()]);
      controlePrep.current = null;
      if (annuler.current) {
        setPreparation(null);
        return;
      }
      blobsPrepares.current = blobs;
    }
    setPreparation(null);

    // 2) LECTURE : chaque son est DÉJÀ prêt — zéro latence entre les répliques,
    //    de courtes respirations calibrées comme au théâtre.
    try {
      let scenePrecedente = -1;
      for (let k = 0; k < file.length; k++) {
        if (annuler.current) return;
        const e = file[k];
        if (e.s !== scenePrecedente) {
          scenePrecedente = e.s;
          setSceneIdx(e.s);
          setLigneIdx(-1);
          try {
            getMoteurAudio().ajusterScene(e.sc.musique);
          } catch { /* jamais critique */ }
          await pause(420); // courte respiration de changement de scène (l'annonce suit aussitôt)
        }
        if (e.annonce) {
          setLigneIdx(e.i);
          const blob = blobs![k];
          if (blob) await jouerBlob(blob);
          else await repliNavigateur(e.ligne.texte);
          await pause(130); // l'annonce s'efface, la réplique part aussitôt
        } else {
          setLigneIdx(e.i);
          const blob = blobs![k];
          if (blob) await jouerBlob(blob);
          else await repliNavigateur(e.ligne.texte);
          const suivantMemeLocuteur = file[k + 1] && !file[k + 1].annonce && file[k + 1].ligne.perso === e.ligne.perso;
          await pause(suivantMemeLocuteur ? 110 : 170); // respiration naturelle entre les prises de parole
        }
      }
      setTermine(true);
    } finally {
      setSceneIdx(-1);
      setLigneIdx(-1);
      setEnLecture(false);
      arreterMusique();
    }
  }, [scenario, enLecture, lancerMusiqueBoost, arreterMusique, construireFile]);

  // v6.1 — JAMAIS de lancement automatique : le BOOST attend le choix de la
  // personne (« Lancer le théâtre »), juste après la réponse ou plus tard.

  // bande dessinée : suivi de la scène et de la réplique en cours
  useEffect(() => {
    if (!enfant || !demarre) return;
    (sceneRef.current || ligneRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [sceneIdx, ligneIdx, enfant, demarre]);

  const stopper = () => {
    annuler.current = true;
    try { controlePrep.current?.abort(); } catch { /* déjà arrêté */ }
    try { audioCourant?.pause(); } catch { /* déjà arrêté */ }
  };

  const sceneCourante = sceneIdx >= 0 ? scenario.scenes[sceneIdx] : null;
  const minutes = Math.floor(scenario.dureeEstimeeSec / 60);
  const secondes = scenario.dureeEstimeeSec % 60 > 30 ? '30' : '';

  // ── AVANT LE LANCEMENT : la proposition (l'utilisateur décide) ──
  if (!demarre) {
    return (
      <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4 sm:p-6 mt-5">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-amber-600" aria-hidden />
          <h3 className="text-lg font-bold font-serif">⚡ BOOST — {scenario.titre}</h3>
        </div>
        {scenario.resume && <p className="text-sm text-[--muted-foreground] mb-3">{scenario.resume}</p>}
        <p className="text-[15px] leading-relaxed mb-1">
          Ton théâtre BOOST est <span className="font-semibold">prêt</span> : {scenario.scenes.length} scènes
          jouées par {scenario.personnages.length} personnages aux voix distinctes ({scenario.personnages.map((p) => p.nom).join(', ')}) —
          environ {minutes} min{secondes && ' 30'}.
        </p>
        <p className="text-sm text-[--muted-foreground] mb-4">
          {enfant
            ? 'Il est joué comme un petit dessin animé sonore qui défile tout seul. Tu le lances quand tu veux — ou pas du tout.'
            : 'C\'est une proposition, jamais une obligation : lance-le maintenant, plus tard, ou passe ton chemin.'}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void jouer()} className="rounded-full bg-amber-600 hover:bg-amber-600/85 text-white">
            <Play className="h-4 w-4 mr-1" aria-hidden /> Lancer le BOOST
          </Button>
          <span className="text-xs text-[--muted-foreground]">≈ {minutes} min{secondes && ' 30'} · au choix</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-4 sm:p-6 mt-5">
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-5 w-5 text-amber-600" aria-hidden />
        <h3 className="text-lg font-bold font-serif">⚡ BOOST — {scenario.titre}</h3>
      </div>
      {scenario.resume && !enfant && (
        <p className="text-sm text-[--muted-foreground] mb-3">{scenario.resume}</p>
      )}

      {/* v6.3 — préparation complète des voix : barre de progression */}
      {preparation && (
        <div className="rounded-xl bg-[--card] border border-[--border] p-3 mb-3">
          <p className="text-sm font-medium mb-2">
            🎭 Préparation des voix… {preparation.fait}/{preparation.total} répliques
            <span className="text-[--muted-foreground] font-normal"> — le conteur installe la scène, chaque voix enregistre sa partie</span>
          </p>
          <div className="h-2 rounded-full bg-[--muted] overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.round((preparation.fait / Math.max(1, preparation.total)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-[--muted-foreground] mt-2">Ensuite, la scène se joue sans aucun temps d&apos;attente — comme un vrai théâtre.</p>
        </div>
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
            <Play className="h-4 w-4 mr-1" aria-hidden /> {termine ? 'Rejouer le BOOST' : 'Reprendre le théâtre'}
          </Button>
        )}
        {enLecture && (
          <Button size="sm" variant="outline" onClick={stopper} className="rounded-full">
            <Square className="h-4 w-4 mr-1" aria-hidden /> Arrêter
          </Button>
        )}
        <span className="text-xs text-[--muted-foreground]">
          {scenario.scenes.length} scènes · {scenario.personnages.length} voix distinctes · ≈ {minutes} min{secondes && ' 30'}
        </span>
      </div>
    </div>
  );
}

// ── Joue un WAV déjà préchargé (zéro latence) ────────────────────────────────
let audioCourant: HTMLAudioElement | null = null;

function jouerBlob(blob: Blob): Promise<void> {
  return new Promise((resoudre) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioCourant = audio;
    const finir = () => {
      if (audioCourant === audio) audioCourant = null;
      URL.revokeObjectURL(url);
      resoudre();
    };
    audio.onended = finir;
    audio.onerror = finir;
    audio.play().catch(finir);
  });
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

// ═════════════════════════════════════════════════════════════════════════════
// SPU v6.4 — LE THÉÂTRE BOOST (composant client)
// v6.4 — LE MP3 COMPLET DU SERVEUR : dès que le scénario arrive, le SPU le
// convertit EN ARRIÈRE-PLAN en un SEUL MP3 (voix distinctes garanties, une
// génération Piper à la fois — plus jamais la course à quatre générations qui
// faisait tout échouer et laissait une voix unique et monotone). La partition
// complète : titre de scène + DIDASCALIES PARLÉES (« Léo marche dans la ville,
// les yeux plissés. » — l'annonce de la condition, AVANT la prise de parole) +
// présentation de chaque personnage + répliques. Une revue IA (transcription
// ASR + correction) vérifie le rendu. Le client joue ce MP3 et synchronise la
// bande dessinée via le manifest ; si le serveur n'y arrive pas, repli sur la
// génération client avec profils de voix distincts.
// v6.1 — le BOOST est une PROPOSITION : jamais de lancement automatique.
// ═════════════════════════════════════════════════════════════════════════════
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, Zap } from 'lucide-react';
import type { ScenarioBoost, SceneBoost, LigneTheatre } from '@/lib/spu/boost';
import { getMoteurAudio } from '@/lib/spu/audio-engine';
import { profilParId } from '@/lib/spu/tts';

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  scenario: ScenarioBoost;
  enfant?: boolean; // bande dessinée défilante synchronisée
}

interface SegmentManifestClient {
  type: 'scene' | 'didascalie' | 'annonce' | 'ligne';
  s: number;
  i: number;
  perso: string;
  voix: string;
  texte: string;
  planIndex: number;
  debut: number;
  duree: number;
}

interface RevueClient {
  score: number;
  couverture: number;
  corrections: number;
}

// Une entrée de la file de lecture du REPLI client : réplique OU conteur/narrateur.
interface EntreeFile {
  ligne: LigneTheatre;
  s: number;
  i: number;
  sc: SceneBoost;
  annonce?: boolean; // réplique du conteur ou du narrateur (ouverture, didascalie, présentation)
}

export function TheatreBoost({ scenario, enfant }: Props) {
  const [sceneIdx, setSceneIdx] = useState(-1);
  const [ligneIdx, setLigneIdx] = useState(-1);
  const [demarre, setDemarre] = useState(false);
  const [enLecture, setEnLecture] = useState(false);
  const [conversion, setConversion] = useState<{ fait: number; total: number; phase: string } | null>(null);
  const [conversionEchec, setConversionEchec] = useState(false);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [manifest, setManifest] = useState<SegmentManifestClient[] | null>(null);
  const [revue, setRevue] = useState<RevueClient | null>(null);
  const [preparation, setPreparation] = useState<{ fait: number; total: number } | null>(null); // repli client
  const [termine, setTermine] = useState(false);
  const annuler = useRef(false);
  const controlePrep = useRef<AbortController | null>(null);
  const audioMp3Ref = useRef<HTMLAudioElement | null>(null);
  const blobsPrepares = useRef<(Blob | null)[] | null>(null);
  const bandeRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const ligneRef = useRef<HTMLDivElement | null>(null);

  // Musique BOOST : piste épicée du catalogue, volume relevé, pas d'atténuation
  const lancerMusiqueBoost = useCallback(() => {
    const moteur = getMoteurAudio();
    moteur.jouerMode('boost');
  }, []);

  const arreterMusique = useCallback(() => {
    getMoteurAudio().couper();
  }, []);

  // ── CONVERSION SERVEUR DÈS L'ARRIVÉE DU SCÉNARIO (arrière-plan) ──
  // Le MP3 complet du théâtre se grave pendant que la personne lit la réponse ;
  // quand elle clique « Lancer », l'audio est déjà prêt (ou presque).
  useEffect(() => {
    let vivant = true;
    const controle = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/api/boost/audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scenario }),
          signal: controle.signal,
        });
        if (!res.ok) throw new Error('conversion indisponible');
        const premier = await res.json();
        if (!vivant) return;
        if (premier.etat === 'pret') {
          setMp3Url(premier.mp3);
          setManifest(premier.manifest);
          setRevue(premier.revue || null);
          return;
        }
        if (premier.etat === 'echec') {
          setConversionEchec(true);
          return;
        }
        setConversion({ fait: premier.fait, total: premier.total, phase: premier.phase });
        for (;;) {
          await pause(2500);
          if (!vivant) return;
          const e = await fetch(`/api/boost/audio?id=${premier.id}`).then((r) => (r.ok ? r.json() : null));
          if (!vivant) return;
          if (!e) continue;
          if (e.etat === 'pret') {
            setMp3Url(e.mp3);
            setManifest(e.manifest);
            setRevue(e.revue || null);
            setConversion(null);
            return;
          }
          if (e.etat === 'echec') {
            setConversionEchec(true);
            setConversion(null);
            return;
          }
          setConversion({ fait: e.fait, total: e.total, phase: e.phase });
        }
      } catch {
        if (vivant) {
          setConversionEchec(true);
          setConversion(null);
        }
      }
    })();
    return () => {
      vivant = false;
      try {
        controle.abort();
      } catch {
        /* déjà fermé */
      }
    };
  }, [scenario]);

  // ── File du REPLI client (même partition que le serveur) : titre de scène +
  // didascalie PARLÉE + présentation du personnage + réplique.
  const construireFile = useCallback((): EntreeFile[] => {
    const cont = scenario.personnages.find((p) => p.voix === 'conteur' || /conteur|narrat/i.test(p.nom));
    const voixConteur = cont?.voix || 'narrateur';
    const roleDe = new Map(scenario.personnages.map((p) => [p.nom.toLowerCase(), p.role]));
    const dejaPresents = new Set<string>();
    const file: EntreeFile[] = [];
    const nettoyer = (t: string) => t.replace(/[«»()]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[,.…]+$/, '');
    scenario.scenes.forEach((sc, s) => {
      file.push({
        ligne: { perso: 'Le Conteur', voix: voixConteur, texte: `${nettoyer(sc.titre)}.` },
        s, i: -1, sc, annonce: true,
      });
      sc.lignes.forEach((l, i) => {
        const didascalie = (l.didascalie || '').trim();
        if (didascalie) {
          file.push({
            ligne: { perso: 'Le Narrateur', voix: 'narrateur', texte: `${nettoyer(didascalie)}.` },
            s, i, sc, annonce: true,
          });
        }
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

  // ── LECTURE A : le MP3 complet du serveur (voix distinctes garanties) ──
  const jouerMp3Serveur = useCallback(
    () =>
      new Promise<void>((resoudre) => {
        const audio = new Audio(mp3Url!);
        audioMp3Ref.current = audio;
        let sceneJouee = -1;
        const synchroniser = () => {
          if (!manifest) return;
          const t = audio.currentTime;
          let courant = manifest[0];
          for (const m of manifest) {
            if (m.debut <= t + 0.05) courant = m;
            else break;
          }
          if (courant) {
            setSceneIdx(courant.s);
            setLigneIdx(courant.i);
            if (courant.s !== sceneJouee) {
              sceneJouee = courant.s;
              try {
                getMoteurAudio().ajusterScene(scenario.scenes[courant.s]?.musique || 'douce');
              } catch {
                /* jamais critique */
              }
            }
          }
        };
        audio.addEventListener('timeupdate', synchroniser);
        const finir = () => {
          audio.removeEventListener('timeupdate', synchroniser);
          if (audioMp3Ref.current === audio) audioMp3Ref.current = null;
          resoudre();
        };
        audio.onended = finir;
        audio.onerror = finir;
        audio.addEventListener('pause', () => {
          if (annuler.current) finir(); // Arrêter : on résout sans attendre la fin
        });
        audio.play().catch(finir);
      }),
    [mp3Url, manifest, scenario]
  );

  // ── LECTURE B (repli client) : préparation totale puis lecture sans blancs ──
  const jouerFileClient = useCallback(async () => {
    const file = construireFile();
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
            blobs![k] = null;
          }
          fait++;
          if (!annuler.current) setPreparation({ fait, total: file.length });
        }
      };
      // trois générations en parallèle (le repli reste raisonnable) — la voie
      // PRINCIPALE reste l'assemblage serveur, une voix à la fois
      await Promise.all([ouvrier(), ouvrier(), ouvrier()]);
      controlePrep.current = null;
      if (annuler.current) {
        setPreparation(null);
        throw new Error('annulé');
      }
      blobsPrepares.current = blobs;
    }
    setPreparation(null);

    let scenePrecedente = -1;
    for (let k = 0; k < file.length; k++) {
      if (annuler.current) throw new Error('annulé');
      const e = file[k];
      if (e.s !== scenePrecedente) {
        scenePrecedente = e.s;
        setSceneIdx(e.s);
        setLigneIdx(-1);
        try {
          getMoteurAudio().ajusterScene(e.sc.musique);
        } catch {
          /* jamais critique */
        }
        await pause(420);
      }
      setLigneIdx(e.i);
      const blob = blobs![k];
      if (blob) await jouerBlob(blob);
      else await repliNavigateur(e.ligne.texte, e.ligne.voix);
      const suivantMemeLocuteur = file[k + 1] && !file[k + 1].annonce && file[k + 1].ligne.perso === e.ligne.perso;
      await pause(e.annonce ? 130 : suivantMemeLocuteur ? 110 : 170);
    }
  }, [construireFile]);

  const jouer = useCallback(async () => {
    if (enLecture) return;
    annuler.current = false;
    setDemarre(true);
    setEnLecture(true);
    setTermine(false);
    lancerMusiqueBoost();
    try {
      if (mp3Url && manifest?.length) {
        await jouerMp3Serveur();
      } else {
        await jouerFileClient();
      }
      setTermine(true);
    } catch {
      /* annulé par la personne */
    } finally {
      setSceneIdx(-1);
      setLigneIdx(-1);
      setEnLecture(false);
      arreterMusique();
    }
  }, [enLecture, mp3Url, manifest, jouerMp3Serveur, jouerFileClient, lancerMusiqueBoost, arreterMusique]);

  // bande dessinée : suivi de la scène et de la réplique en cours
  useEffect(() => {
    if (!enfant || !demarre) return;
    (sceneRef.current || ligneRef.current)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [sceneIdx, ligneIdx, enfant, demarre]);

  const stopper = () => {
    annuler.current = true;
    try {
      controlePrep.current?.abort();
    } catch {
      /* déjà arrêté */
    }
    try {
      audioMp3Ref.current?.pause();
    } catch {
      /* déjà arrêté */
    }
    try {
      audioCourant?.pause();
    } catch {
      /* déjà arrêté */
    }
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
        <p className="text-sm text-[--muted-foreground] mb-1">
          {enfant
            ? 'Il est joué comme un petit dessin animé sonore qui défile tout seul. Tu le lances quand tu veux — ou pas du tout.'
            : "C'est une proposition, jamais une obligation : lance-le maintenant, plus tard, ou passe ton chemin."}
        </p>
        <p className="text-xs text-[--muted-foreground] mb-3">
          {conversion
            ? `🎙️ Le SPU grave déjà l'audio complet du théâtre (${conversion.fait}/${conversion.total}) — chaque voix enregistre sa partie, les didascalies sont lues par le narrateur.`
            : mp3Url
              ? '🎙️ Audio complet du théâtre déjà gravé (voix distinctes garanties) — le lancement est instantané.'
              : conversionEchec
                ? ''
                : '🎙️ Préparation de l\u2019audio complet du théâtre…'}
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

      {/* v6.4 — conversion serveur du scénario en MP3 complet : progression */}
      {conversion && (
        <div className="rounded-xl bg-[--card] border border-[--border] p-3 mb-3">
          <p className="text-sm font-medium mb-2">
            🎙️ Conversion du théâtre en audio complet… {conversion.fait}/{conversion.total}
            <span className="text-[--muted-foreground] font-normal"> — {conversion.phase}</span>
          </p>
          <div className="h-2 rounded-full bg-[--muted] overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.round((conversion.fait / Math.max(1, conversion.total)) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-[--muted-foreground] mt-2">
            Titres de scène, didascalies et présentations des personnages sont enregistrés par le conteur — la scène se jouera sans aucun temps d&apos;attente.
          </p>
        </div>
      )}

      {/* v6.3 — préparation des voix du repli client */}
      {preparation && (
        <div className="rounded-xl bg-[--card] border border-[--border] p-3 mb-3">
          <p className="text-sm font-medium mb-2">
            🎭 Préparation des voix… {preparation.fait}/{preparation.total} répliques
          </p>
          <div className="h-2 rounded-full bg-[--muted] overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.round((preparation.fait / Math.max(1, preparation.total)) * 100)}%` }}
            />
          </div>
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

      <div className="flex flex-wrap items-center gap-2 mt-4">
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
          {scenario.scenes.length} scènes · {scenario.personnages.length} voix distinctes · ≈ {minutes} min{secondes && ' 30'}
        </span>
        {mp3Url && (
          <span className="text-xs text-amber-700 dark:text-amber-300">🎙️ audio complet gravé</span>
        )}
        {revue && (
          <span className="text-xs text-[--muted-foreground]" title="Revue IA du rendu : transcription de l'audio comparée au script, fautes corrigées">
            · revue IA : {revue.score}/10 · {revue.couverture}% vérifié{revue.corrections ? ` · ${revue.corrections} correction(s)` : ''}
          </span>
        )}
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

// v6.4 — repli navigateur AVEC LE PROFIL DE LA LIGNE : pitch et débit du
// personnage (jamais plus la voix unique et monotone quand Piper échoue).
function repliNavigateur(texte: string, voixProfil?: string): Promise<void> {
  return new Promise((resoudre) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !texte.trim()) return resoudre();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    const profil = profilParId(voixProfil || 'narrateur');
    u.pitch = Math.max(0, Math.min(2, profil.pitch));
    u.rate = Math.max(0.5, Math.min(2, profil.rate));
    const v = window.speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith('fr'));
    if (v) u.voice = v;
    u.onend = () => resoudre();
    u.onerror = () => resoudre();
    window.speechSynthesis.speak(u);
  });
}

export type { SceneBoost };

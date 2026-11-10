// SPU v4.4 — Application principale (single route, navigation par vues)
// v4.4 : structure universelle de réponse (parabole + interprétation + histoire
// + perspective), synthèse repliée, carte « Quoi de neuf », version affichée
// depuis VERSION_SPU. Historique : v4.1 fil de discussion, musique MP3 par mode,
// théâtre sonore à 10 voix, compte SPU.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sparkles, Compass, Moon, Baby, NotebookPen, Library, Eye, ShieldCheck,
  Volume2, ArrowLeft, ArrowDown, RefreshCw, Send, AudioLines, Music4,
} from 'lucide-react';
import { streamSSE } from '@/lib/spu/sse-client';
import { useSpuStore, REPONSE_VIDE, heureMaintenant, type ReponseVue } from '@/lib/spu/store';
import { VERSION_SPU } from '@/lib/spu/constants';
import { getMoteurAudio, type ModeMusique } from '@/lib/spu/audio-engine';
import { ttsStop, lireTheatre } from '@/lib/spu/tts';
import { VueReponse, EtapesEnDirect, AnglesMentor } from './reponse-view';
import { BulleUtilisateur, BulleSpu, FilDiscussion, type MessageFil } from './fil-discussion';
import { VueEnfant } from './child-view';
import { VueJournal } from './journal-view';
import { VueCorpus } from './corpus-view';
import { VueTransparence, VueConfidentialite } from './pages-view';
import { ReglagesVoix } from './reglages-voix';
import { VoletCompte } from './compte-volet';

type Vue = 'accueil' | 'oracle' | 'mentor' | 'deep' | 'enfant' | 'journal' | 'corpus' | 'transparence' | 'confidentialite';

const MODES: { id: Vue; icone: React.ReactNode; titre: string; description: string; musique: string }[] = [
  { id: 'oracle', icone: <Sparkles className="h-6 w-6" aria-hidden />, titre: 'Oracle', description: 'Une réponse unique : synthèse, parabole, histoire. Pour une question ponctuelle.', musique: 'majestueuse et contemplative' },
  { id: 'mentor', icone: <Compass className="h-6 w-6" aria-hidden />, titre: 'Mentor', description: 'Un dialogue progressif en 3 étapes, pour clarifier pas à pas.', musique: 'chaleureuse, un compagnon de route' },
  { id: 'deep', icone: <Moon className="h-6 w-6" aria-hidden />, titre: 'Deep', description: 'Une exploration contemplative en 3 niveaux, au rythme de ta respiration.', musique: 'profonde, au rythme du souffle' },
  { id: 'enfant', icone: <Baby className="h-6 w-6" aria-hidden />, titre: 'Enfant', description: 'Un conte rassurant pour les 6-12 ans, joué comme un théâtre sonore.', musique: 'légère, espiègle et douce' },
];

const SUGGESTIONS_ORACLE = [
  'Comment trouver du sens quand tout s\'enchaîne trop vite ?',
  'Comment rester patient alors que tout va trop lentement ?',
  'Je rumine toute la nuit après une dispute — comment avancer ?',
  'On me critique sans cesse : comment garder le cap ?',
];

let _uid = 0;
const uid = () => `m${Date.now()}-${_uid++}`;

export function SpuApp() {
  const { sessionId, audioActive, setAudioActive, volume, setVolume } = useSpuStore();
  const [vue, setVue] = useState<Vue>('accueil');

  // Musique de fond réelle par mode (MP3 libres) — démarre à l'entrée d'un mode,
  // s'arrête sur l'accueil et les pages documentaires.
  useEffect(() => {
    const moteur = getMoteurAudio();
    moteur.setVolume(volume);
    const estMode = vue === 'oracle' || vue === 'mentor' || vue === 'deep' || vue === 'enfant';
    if (audioActive && estMode) moteur.jouerMode(vue as ModeMusique);
    else moteur.couper();
  }, [vue, audioActive]);

  const basculeAudio = (v: boolean) => {
    setAudioActive(v);
    const moteur = getMoteurAudio();
    moteur.setVolume(volume);
    const estMode = vue === 'oracle' || vue === 'mentor' || vue === 'deep' || vue === 'enfant';
    if (v && estMode) moteur.jouerMode(vue as ModeMusique);
    else moteur.couper();
  };

  return (
    <div className="fond-spu min-h-screen flex flex-col text-[--foreground]">
      <EnTete
        vue={vue}
        retour={() => setVue('accueil')}
        audioActive={audioActive}
        basculeAudio={basculeAudio}
        volume={volume}
        setVolume={setVolume}
        onOuvrirJournal={() => setVue('journal')}
      />
      <main className="flex-1">
        {vue === 'accueil' && <VueAccueil choisir={setVue} aller={setVue} />}
        {vue === 'oracle' && <FluxOracle />}
        {vue === 'mentor' && <FluxMentor />}
        {vue === 'deep' && <FluxDeep />}
        {vue === 'enfant' && <VueEnfant surRetour={() => setVue('accueil')} />}
        {vue === 'journal' && <div className="py-8 px-4"><VueJournal /></div>}
        {vue === 'corpus' && <div className="py-8 px-4"><VueCorpus /></div>}
        {vue === 'transparence' && <div className="py-8 px-4"><VueTransparence /></div>}
        {vue === 'confidentialite' && <div className="py-8 px-4"><VueConfidentialite /></div>}
      </main>
      <PiedDePage aller={setVue} />
    </div>
  );
}

// ── En-tête : navigation, musique, voix, compte ───────────────────────────────
function EnTete({
  vue, retour, audioActive, basculeAudio, volume, setVolume, onOuvrirJournal,
}: {
  vue: Vue; retour: () => void; audioActive: boolean; basculeAudio: (v: boolean) => void;
  volume: number; setVolume: (v: number) => void; onOuvrirJournal: () => void;
}) {
  const modeActuel = MODES.find((m) => m.id === vue);
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[--background]/80 border-b border-[--border]/70">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2 sm:gap-3">
        {vue !== 'accueil' ? (
          <Button variant="ghost" size="sm" onClick={retour} className="rounded-full" aria-label="retour">
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden /> Accueil
          </Button>
        ) : (
          <div className="flex items-center gap-2 font-semibold">
            <span className="h-8 w-8 rounded-full bg-gradient-to-br from-[--primary] to-[--secondary] text-[--primary-foreground] flex items-center justify-center font-serif text-sm shadow-sm" aria-hidden>♠</span>
            SPU <span className="text-[--muted-foreground] font-normal hidden md:inline">· Système Parabolique Universel</span>
          </div>
        )}
        {modeActuel && (
          <Badge variant="outline" className="capitalize hidden sm:inline-flex">{modeActuel.titre}</Badge>
        )}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Théâtre sonore — réglages des 10 voix */}
          <ReglagesVoix>
            <Button variant="ghost" size="sm" className="rounded-full px-2" aria-label="régler les voix du théâtre sonore" title="Voix du théâtre sonore">
              <AudioLines className="h-4 w-4" aria-hidden />
              <span className="hidden lg:inline ml-1 text-xs">Voix</span>
            </Button>
          </ReglagesVoix>
          {/* Musique de fond */}
          <div className="flex items-center gap-1.5" title="Musique de fond (varie selon le mode)">
            <Music4 className={`h-4 w-4 ${audioActive ? 'text-[--primary]' : 'text-[--muted-foreground]'}`} aria-hidden />
            <Switch checked={audioActive} onCheckedChange={basculeAudio} aria-label="musique de fond" />
          </div>
          {audioActive && (
            <input
              type="range" min={0} max={1} step={0.05} value={volume}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVolume(v);
                getMoteurAudio().setVolume(v);
              }}
              className="w-16 sm:w-20 accent-[--primary]"
              aria-label="volume de la musique"
            />
          )}
          {/* Compte SPU */}
          <VoletCompte onOuvrirSession={onOuvrirJournal} />
        </div>
      </div>
    </header>
  );
}

// ── Accueil ───────────────────────────────────────────────────────────────────
function VueAccueil({ choisir, aller }: { choisir: (v: Vue) => void; aller: (v: Vue) => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-10">
        <p className="text-sm tracking-[0.3em] text-[--muted-foreground] uppercase mb-3">Version {VERSION_SPU}</p>
        <h1 className="text-3xl sm:text-5xl font-serif font-bold leading-tight mb-4">
          Pose ta question.<br />
          <span className="text-[--primary]">Reçois une parabole.</span>
        </h1>
        <p className="text-[15px] sm:text-base text-[--muted-foreground] leading-relaxed max-w-xl mx-auto">
          Je consulte plusieurs sources d&apos;intelligence et de recherche, je synthétise leurs réponses,
          puis je te propose une <span className="text-[--foreground] font-medium">parabole réelle et sourcée</span> et une
          histoire écrite pour toi. Un miroir narratif — jamais une vérité absolue.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-5">
          <Badge variant="outline" className="rounded-full">🎭 10 voix locales</Badge>
          <Badge variant="outline" className="rounded-full">🎵 musique par mode</Badge>
          <Badge variant="outline" className="rounded-full">📚 65 paraboles sourcées</Badge>
          <Badge variant="outline" className="rounded-full">🔒 100 % local, sans clé API</Badge>
        </div>
      </div>

      {/* ── Quoi de neuf — chaque version est visible et expliquée (exigence v4.4) ── */}
      <div className="rounded-2xl border border-[--border] bg-[--card]/70 p-5 mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[--primary]" aria-hidden />
          <h2 className="font-semibold text-[15px]">Quoi de neuf — v{VERSION_SPU}</h2>
        </div>
        <ul className="space-y-1.5 text-sm text-[--muted-foreground] leading-relaxed list-disc pl-4">
          <li>
            <span className="font-medium text-[--foreground]">La structure universelle de réponse :</span>{' '}
            pour toute question, dans tous les modes, tu reçois la parabole, son interprétation,
            une histoire écrite pour toi et la mise en perspective. La synthèse des sources
            devient un onglet déroulant, consultable à volonté.
          </li>
          <li>
            <span className="font-medium text-[--foreground]">Les mises à jour ne se bloquent plus :</span>{' '}
            la page se rafraîchit automatiquement quand une nouvelle version arrive — tu verras
            toujours la dernière.
          </li>
          <li>
            <span className="font-medium text-[--foreground]">Parabole garantie :</span> même si les
            sources externes sont indisponibles, le corpus local t&apos;offre toujours une parabole
            réelle et sourcée.
          </li>
        </ul>
        <p className="text-xs text-[--muted-foreground]/80 mt-3">
          Si cette page affiche encore une ancienne version, ferme-la complètement puis rouvre-la :
          la mise à jour s&apos;appliquera aussitôt.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => choisir(m.id)}
            className="group text-left rounded-2xl border border-[--border] bg-[--card] p-6 transition-all hover:border-[--primary]/60 hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[--primary] min-h-[44px]"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="h-11 w-11 rounded-xl bg-[--primary]/10 text-[--primary] flex items-center justify-center group-hover:bg-[--primary] group-hover:text-[--primary-foreground] transition-colors" aria-hidden>
                {m.icone}
              </span>
              <h2 className="text-lg font-semibold">{m.titre}</h2>
              {m.id === 'enfant' && <Badge className="ml-auto text-xs bg-[--secondary]/20 text-[--secondary] hover:bg-[--secondary]/20">espace protégé</Badge>}
            </div>
            <p className="text-sm text-[--muted-foreground] leading-relaxed">{m.description}</p>
            <p className="text-xs text-[--muted-foreground]/80 mt-2 flex items-center gap-1">
              <Music4 className="h-3 w-3" aria-hidden /> {m.musique}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {([
          ['journal', 'Journal de bord', <NotebookPen key="a" className="h-4 w-4" aria-hidden />],
          ['corpus', 'Le corpus (50 + 15)', <Library key="b" className="h-4 w-4" aria-hidden />],
          ['transparence', 'Transparence', <Eye key="c" className="h-4 w-4" aria-hidden />],
          ['confidentialite', 'Confidentialité', <ShieldCheck key="d" className="h-4 w-4" aria-hidden />],
        ] as [Vue, string, React.ReactNode][]).map(([v, label, icone]) => (
          <Button key={v} variant="outline" size="sm" onClick={() => aller(v)} className="rounded-full">
            {icone} {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ── Zone de question partagée ─────────────────────────────────────────────────
function ZoneQuestion({
  onEnvoyer, enCours, placeholder, suggestions, modeDeep,
}: {
  onEnvoyer: (q: string) => void; enCours: boolean; placeholder: string; suggestions?: string[]; modeDeep?: boolean;
}) {
  const [texte, setTexte] = useState('');
  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (texte.trim()) {
            onEnvoyer(texte.trim());
            setTexte('');
          }
        }}
        className="space-y-3"
      >
        <Textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={placeholder}
          rows={modeDeep ? 3 : 2}
          maxLength={2000}
          className="rounded-2xl border-[--border] bg-[--card] text-[15px] resize-none focus-visible:ring-[--primary]"
          aria-label="ta question"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && texte.trim()) {
              onEnvoyer(texte.trim());
              setTexte('');
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[--muted-foreground]">{texte.length}/2000 · ⌘/Ctrl+Entrée pour envoyer</span>
          <Button type="submit" disabled={enCours || !texte.trim()} className="rounded-full min-h-[44px]">
            <Send className="h-4 w-4 mr-2" aria-hidden />
            Envoyer
          </Button>
        </div>
      </form>
      {suggestions && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onEnvoyer(s)}
              disabled={enCours}
              className="text-xs rounded-full border border-[--border] px-3 py-1.5 hover:bg-[--muted] transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Hook commun : finalise une réponse terminée (son + lecture) et crée la bulle ──
function useFinalisation() {
  const { ttsActive, voixNarrateur, voixPersonnages, debitVoix, audioActive } = useSpuStore();

  return useCallback(
    (finie: ReponseVue): MessageFil => {
      const msg: MessageFil = {
        id: uid(),
        role: 'spu',
        heure: heureMaintenant(),
        reponse: { ...finie, enCours: false, heure: null },
      };
      if (audioActive) getMoteurAudio().jingleReponse();
      if (ttsActive && finie.histoire) {
        void lireTheatre(finie.histoire, {
          narrateur: voixNarrateur,
          personnages: voixPersonnages,
          debit: debitVoix,
        });
      }
      return msg;
    },
    [ttsActive, voixNarrateur, voixPersonnages, debitVoix, audioActive]
  );
}

// ── FLUX ORACLE — fil de discussion horodaté ──────────────────────────────────
function FluxOracle() {
  const { sessionId, setSessionId, audioActive } = useSpuStore();
  const [messages, setMessages] = useState<MessageFil[]>([]);
  const [reponse, setReponse] = useState<ReponseVue | null>(null); // réponse en cours de streaming
  const finaliser = useFinalisation();

  const poser = async (q: string) => {
    ttsStop();
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: q }]);
    if (audioActive) getMoteurAudio().jouerMode('oracle');
    const r: ReponseVue = { ...REPONSE_VIDE, enCours: true };
    setReponse(r);
    await streamSSE('/api/ask', { question: q, mode: 'oracle', sessionId: sessionId || undefined }, {
      status: (d) => {
        r.statut = String(d.step || '');
        setReponse({ ...r });
      },
      synthesis: (d) => {
        r.synthese = d as never;
        setReponse({ ...r });
      },
      parabole: (d) => {
        r.parabole = d as never;
        setReponse({ ...r });
      },
      histoire: (d) => {
        r.histoire += String(d.chunk || '');
        setReponse({ ...r });
      },
      perspective: (d) => {
        r.perspective = String(d.text || '');
        setReponse({ ...r });
      },
      erreur: (d) => {
        r.erreur = String(d.message || '');
        setReponse({ ...r });
      },
      distress: (d) => {
        r.distress = d as never;
        setReponse({ ...r });
      },
      final: (d) => {
        const f = d as { echangeId: string; sessionId: string; perspectiveDisponible?: boolean };
        if (f.sessionId) setSessionId(f.sessionId);
        r.final = f as never;
        setReponse({ ...r });
      },
      'http-error': (d) => {
        r.erreur = String(d.error || 'Erreur');
        setReponse({ ...r });
      },
    });
    // Stream terminé → la réponse part dans le fil (horodatée), la bulle live disparaît.
    r.enCours = false;
    if (r.final || r.erreur || r.distress) setMessages((m) => [...m, finaliser(r)]);
    setReponse(null);
  };

  const vierge = messages.length === 0 && !reponse;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {vierge && (
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold mb-2">Mode Oracle</h1>
          <p className="text-sm text-[--muted-foreground] mb-4">Une seule réponse : synthèse sourcée → parabole → histoire. Lecture : 1 à 2 minutes.</p>
        </div>
      )}
      <FilDiscussion
        messages={messages}
        enfants={(m) =>
          m.role === 'utilisateur' ? (
            <BulleUtilisateur message={m} />
          ) : (
            <BulleSpu
              message={m}
              enfants={
                <>
                  {m.reponse?.enCours && <EtapesEnDirect reponse={m.reponse} />}
                  <VueReponse reponse={m.reponse || REPONSE_VIDE} />
                </>
              }
            />
          )
        }
      />
      {reponse && (
        <BulleSpu
          message={{ id: 'live', role: 'spu', heure: '', reponse }}
          enfants={
            <>
              <EtapesEnDirect reponse={reponse} />
              <VueReponse reponse={reponse} />
            </>
          }
        />
      )}
      <div className="mt-8">
        <ZoneQuestion onEnvoyer={poser} enCours={!!reponse?.enCours} placeholder="Quelle question te traverse ? (1 à 2000 caractères)" suggestions={vierge ? SUGGESTIONS_ORACLE : undefined} />
      </div>
      {messages.length > 0 && !reponse && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            onClick={() => setMessages([])}
            className="rounded-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden /> Nouvelle discussion
          </Button>
        </div>
      )}
    </div>
  );
}

// ── FLUX MENTOR (3 étapes) — fil de discussion horodaté ───────────────────────
function FluxMentor() {
  const { sessionId, setSessionId, audioActive } = useSpuStore();
  const [etape, setEtape] = useState(1);
  const [messages, setMessages] = useState<MessageFil[]>([]);
  const [reponse, setReponse] = useState<ReponseVue | null>(null);
  const [brouillon, setBrouillon] = useState('');
  const finaliser = useFinalisation();

  const appeler = async (corps: Record<string, unknown>) => {
    ttsStop();
    if (audioActive) getMoteurAudio().jouerMode('mentor');
    const r: ReponseVue = { ...REPONSE_VIDE, enCours: true };
    setReponse(r);
    await streamSSE('/api/mentor', { sessionId: sessionId || undefined, ...corps }, {
      status: (d) => {
        r.statut = String(d.step || '');
        setReponse({ ...r });
      },
      synthesis: (d) => {
        r.synthese = d as never;
        setReponse({ ...r });
      },
      parabole: (d) => {
        r.parabole = d as never;
        setReponse({ ...r });
      },
      histoire: (d) => {
        r.histoire += String(d.chunk || '');
        setReponse({ ...r });
      },
      perspective: (d) => {
        r.perspective = String(d.text || '');
        setReponse({ ...r });
      },
      reflexion: (d) => {
        r.reflexion = String(d.text || '');
        setReponse({ ...r });
      },
      angles: (d) => {
        r.angles = (d.questions as string[]) || [];
        setReponse({ ...r });
      },
      questionOuverte: (d) => {
        r.questionOuverte = String(d.text || '');
        setReponse({ ...r });
      },
      erreur: (d) => {
        r.erreur = String(d.message || '');
        setReponse({ ...r });
      },
      distress: (d) => {
        r.distress = d as never;
        setReponse({ ...r });
      },
      final: (d) => {
        const f = d as { echangeId: string; sessionId: string; etape: number };
        if (f.sessionId) setSessionId(f.sessionId);
        r.final = f as never;
        setReponse({ ...r });
        setEtape(f.etape === 1 ? 2 : f.etape === 2 ? 3 : 1);
      },
      'http-error': (d) => {
        r.erreur = String(d.error || 'Erreur');
        setReponse({ ...r });
      },
    });
    // Stream terminé → la réponse part dans le fil (horodatée, avec son étiquette d'étape).
    r.enCours = false;
    if (r.final || r.erreur || r.distress) {
      const etiquette = r.final?.etape
        ? `Étape ${r.final.etape}/3 — ${r.final.etape === 1 ? 'OUVERTURE' : r.final.etape === 2 ? 'APPROFONDISSEMENT' : 'SYNTHÈSE'}`
        : undefined;
      setMessages((m) => [...m, { ...finaliser(r), etiquette }]);
    }
    setReponse(null);
  };

  const poser = (q: string) => {
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: q }]);
    void appeler({ question: q, etape: 1 });
  };

  const repondreAngle = (texte: string, angle?: string) => {
    const contenu = angle ? `${angle}\n${texte}` : texte;
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: texte }]);
    void appeler({ reponse: contenu, etape });
  };

  const dernierSpu = [...messages].reverse().find((m) => m.role === 'spu');
  const anglesDisponibles = dernierSpu?.reponse?.angles || [];
  const dialogueFini = dernierSpu?.reponse?.final?.etape === 3 || dernierSpu?.reponse?.questionOuverte;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {messages.length === 0 && !reponse && (
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold mb-1">Mode Mentor</h1>
          <Badge variant="outline" className="mb-4">Étape {etape}/3 — {etape === 1 ? 'OUVERTURE' : etape === 2 ? 'APPROFONDISSEMENT' : 'SYNTHÈSE'}</Badge>
          <p className="text-sm text-[--muted-foreground] mb-4">Un dialogue en trois temps : ouverture, approfondissement, synthèse. Chaque message annonce l&apos;étape.</p>
        </div>
      )}

      <FilDiscussion
        messages={messages}
        enfants={(m) =>
          m.role === 'utilisateur' ? (
            <BulleUtilisateur message={m} />
          ) : (
            <BulleSpu
              message={m}
              enfants={<VueReponse reponse={m.reponse || REPONSE_VIDE} />}
            />
          )
        }
      />
      {reponse && (
        <BulleSpu
          message={{ id: 'live', role: 'spu', heure: '', reponse }}
          enfants={
            <>
              <EtapesEnDirect reponse={reponse} />
              <VueReponse reponse={reponse} />
            </>
          }
        />
      )}

      {(etape === 2 || etape === 3) && anglesDisponibles.length > 0 && !reponse && (
        <div className="mt-5 pl-9">
          <AnglesMentor
            angles={anglesDisponibles}
            enCours={false}
            choisir={(a) => setBrouillon(a)}
          />
          <div className="mt-3">
            <Textarea
              value={brouillon}
              onChange={(e) => setBrouillon(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Réponds librement, en quelques mots…"
              className="rounded-2xl resize-none"
              aria-label="ta réponse au mentor"
            />
            <div className="flex justify-end mt-2">
              <Button onClick={() => { if (brouillon.trim()) { repondreAngle(brouillon.trim()); setBrouillon(''); } }} disabled={!brouillon.trim()} className="rounded-full min-h-[44px]">
                <Send className="h-4 w-4 mr-2" aria-hidden /> {etape === 2 ? 'Continuer (étape 2/3)' : 'Recevoir la synthèse (3/3)'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {dialogueFini && !reponse && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => { setEtape(1); setMessages([]); }} className="rounded-full">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden /> Nouveau dialogue
          </Button>
        </div>
      )}

      {messages.length === 0 && !reponse && (
        <div className="mt-6">
          <ZoneQuestion onEnvoyer={poser} enCours={false} placeholder="Quelle question veux-tu explorer ensemble ?" />
        </div>
      )}
    </div>
  );
}

// ── FLUX DEEP (3 niveaux) — fil de discussion horodaté ────────────────────────
function FluxDeep() {
  const { sessionId, setSessionId, audioActive } = useSpuStore();
  const [niveau, setNiveau] = useState(1);
  const [messages, setMessages] = useState<MessageFil[]>([]);
  const [reponse, setReponse] = useState<ReponseVue | null>(null);
  const [note, setNote] = useState('');
  const finaliser = useFinalisation();

  const appeler = async (corps: Record<string, unknown>) => {
    ttsStop();
    if (audioActive) getMoteurAudio().jouerMode('deep');
    const r: ReponseVue = { ...REPONSE_VIDE, enCours: true };
    setReponse(r);
    await streamSSE('/api/deep', { sessionId: sessionId || undefined, ...corps }, {
      status: (d) => {
        r.statut = String(d.step || '');
        setReponse({ ...r });
      },
      synthesis: (d) => {
        r.synthese = d as never;
        setReponse({ ...r });
      },
      parabole: (d) => {
        r.parabole = d as never;
        setReponse({ ...r });
      },
      histoire: (d) => {
        r.histoire += String(d.chunk || '');
        setReponse({ ...r });
      },
      meditation: (d) => {
        r.meditation += String(d.chunk || '');
        setReponse({ ...r });
      },
      perspective: (d) => {
        r.perspective = String(d.text || '');
        setReponse({ ...r });
      },
      questionOuverte: (d) => {
        r.questionOuverte = String(d.text || '');
        setReponse({ ...r });
      },
      erreur: (d) => {
        r.erreur = String(d.message || '');
        setReponse({ ...r });
      },
      distress: (d) => {
        r.distress = d as never;
        setReponse({ ...r });
      },
      final: (d) => {
        const f = d as { echangeId: string; sessionId: string; niveau: number; suiteDisponible?: boolean };
        if (f.sessionId) setSessionId(f.sessionId);
        r.final = f as never;
        setReponse({ ...r });
      },
      'http-error': (d) => {
        r.erreur = String(d.error || 'Erreur');
        setReponse({ ...r });
      },
    });
    // Stream terminé → la réponse part dans le fil (horodatée, avec son étiquette de niveau).
    r.enCours = false;
    if (r.final || r.erreur || r.distress) {
      const etiquette = r.final?.niveau
        ? `Niveau ${r.final.niveau}/3 — ${r.final.niveau === 1 ? 'OUVERTURE' : r.final.niveau === 2 ? 'INTROSPECTION' : 'PERSPECTIVE'}`
        : undefined;
      setMessages((m) => [...m, { ...finaliser(r), etiquette }]);
    }
    setReponse(null);
  };

  const poser = (q: string) => {
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: q }]);
    void appeler({ question: q, niveau: 1 });
  };

  const dernierSpu = [...messages].reverse().find((m) => m.role === 'spu');
  const suiteDisponible = dernierSpu?.reponse?.final?.suiteDisponible && (dernierSpu.reponse.final.niveau === 1 || dernierSpu.reponse.final.niveau === 2);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {messages.length === 0 && !reponse && (
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold mb-1">Mode Deep</h1>
          <Badge variant="outline" className="mb-4">Niveau {niveau}/3 — {niveau === 1 ? 'OUVERTURE' : niveau === 2 ? 'INTROSPECTION' : 'PERSPECTIVE'}</Badge>
          <p className="text-sm text-[--muted-foreground] mb-4">
            Un parcours contemplatif : trois niveaux de profondeur, un ton plus lent, une musique plus présente.
            Prends ton temps.
          </p>
        </div>
      )}

      <FilDiscussion
        messages={messages}
        enfants={(m) =>
          m.role === 'utilisateur' ? (
            <BulleUtilisateur message={m} />
          ) : (
            <BulleSpu
              message={m}
              enfants={<VueReponse reponse={m.reponse || REPONSE_VIDE} />}
            />
          )
        }
      />
      {reponse && (
        <BulleSpu
          message={{ id: 'live', role: 'spu', heure: '', reponse }}
          enfants={
            <>
              <EtapesEnDirect reponse={reponse} />
              <VueReponse reponse={reponse} />
            </>
          }
        />
      )}

      {suiteDisponible && !reponse && (
        <div className="mt-6 pl-9 space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={dernierSpu!.reponse!.final!.niveau === 1 ? 'Si tu veux noter ce qui a résonné (optionnel)…' : 'Un dernier mot avant la perspective finale (optionnel)…'}
            className="rounded-2xl resize-none"
            aria-label="note facultative"
          />
          <div className="flex justify-center">
            <Button
              onClick={() => {
                const questionEnvoyee = note.trim() || '(je continue le parcours)';
                const prochainNiveau = dernierSpu!.reponse!.final!.niveau! + 1;
                setNiveau(prochainNiveau);
                setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: questionEnvoyee }]);
                void appeler({ reponse: note.trim(), niveau: prochainNiveau });
                setNote('');
              }}
              className="rounded-full min-h-[44px]"
            >
              <ArrowDown className="h-4 w-4 mr-2" aria-hidden /> Descendre au niveau {dernierSpu!.reponse!.final!.niveau! + 1}
            </Button>
          </div>
        </div>
      )}

      {dernierSpu?.reponse?.final?.niveau === 3 && !reponse && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => { setNiveau(1); setMessages([]); }} className="rounded-full">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden /> Remonter — nouveau parcours
          </Button>
        </div>
      )}

      {messages.length === 0 && !reponse && (
        <div className="mt-6">
          <ZoneQuestion onEnvoyer={poser} enCours={false} placeholder="Quelle question t'accompagne en ce moment ?" modeDeep />
        </div>
      )}
    </div>
  );
}

// ── Pied de page (collé en bas, respect safe-area) ───────────────────────────
function PiedDePage({ aller }: { aller: (v: Vue) => void }) {
  return (
    <footer className="mt-auto border-t border-[--border]/60 bg-[--card]/60 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[--muted-foreground]">
        <span className="font-medium text-[--foreground]">SPU v{VERSION_SPU}</span>
        <button onClick={() => aller('transparence')} className="hover:text-[--primary]">Transparence</button>
        <button onClick={() => aller('confidentialite')} className="hover:text-[--primary]">Confidentialité &amp; RGPD</button>
        <button onClick={() => aller('corpus')} className="hover:text-[--primary]">Corpus</button>
        <span className="ml-auto">Un mentor, pas un maître. 🌿</span>
      </div>
    </footer>
  );
}

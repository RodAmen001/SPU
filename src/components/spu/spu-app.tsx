// SPU v4.7 — Application principale (single route, navigation par vues)
// v4.7 : grande fluidité — matching parallèle aux sources, histoire et perspective
// en parallèle, tonalité locale, escalade plafonnée, budget de réponse garanti.
// v4.5 : sources adaptatives 2→3→4→5 (confiance ≥ 50 %, sinon meilleur score),
// questions d'affinage facultatives (max 2, invitation douce, poursuite libre),
// parole du Mentor repliée dans l'onglet réflexion, TOUTE la réponse lue par
// le narrateur. Historique : v4.4 structure universelle de réponse (parabole +
// interprétation + histoire + perspective), synthèse repliée, carte « Quoi de
// neuf » ; v4.1 fil de discussion, musique MP3 par mode, théâtre sonore, compte.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sparkles, Compass, Moon, Baby, NotebookPen, Library, Eye, ShieldCheck,
  Volume2, VolumeX, ArrowLeft, ArrowDown, RefreshCw, Send, AudioLines, Music4,
  Menu, X, LogOut, Newspaper, HeartHandshake, Leaf,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { streamSSE } from '@/lib/spu/sse-client';
import { useSpuStore, REPONSE_VIDE, heureMaintenant, texteNarrationComplete, type ReponseVue } from '@/lib/spu/store';
import { VERSION_SPU } from '@/lib/spu/constants';
import { getMoteurAudio, type ModeMusique } from '@/lib/spu/audio-engine';
import { ttsStop, ttsParler, profilParId } from '@/lib/spu/tts';
import { VueReponse, EtapesEnDirect, AnglesMentor } from './reponse-view';
import { BulleUtilisateur, BulleSpu, FilDiscussion, type MessageFil } from './fil-discussion';
import { VueEnfant } from './child-view';
import { VueJournal } from './journal-view';
import { VueCorpus } from './corpus-view';
import { VueTransparence, VueConfidentialite, VueFonctionnement, VueNouveautes, VueSoutien } from './pages-view';
import { ReglagesVoix } from './reglages-voix';
import { VoletCompte } from './compte-volet';

type Vue = 'accueil' | 'oracle' | 'mentor' | 'deep' | 'enfant' | 'journal' | 'corpus' | 'transparence' | 'confidentialite' | 'fonctionnement' | 'nouveautes' | 'soutien';

// v4.8 — La barre de menu : toutes les écrits et options de l'application,
// disposés de la manière la plus claire possible (ordinateur : barre complète
// sous l'en-tête ; téléphone : menu déroulant).

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
  const { sessionId, audioActive, setAudioActive, volume, setVolume, ttsActive, setTtsActive } = useSpuStore();
  const [vue, setVue] = useState<Vue>('accueil');
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [quitterOuvert, setQuitterOuvert] = useState(false);
  const [adieu, setAdieu] = useState(false);

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

  // v4.8 — Narration complète : ACTIVÉE PAR DÉFAUT (exigence du concepteur),
  // désactivable en un clic depuis le bouton dédié de l'en-tête ou du menu.
  const basculeNarration = (v: boolean) => {
    setTtsActive(v);
    if (!v) ttsStop();
  };

  // v4.8 — Bouton de SORTIE : coupe musique et voix, affiche l'adieu et tente
  // la fermeture réelle de l'onglet (le navigateur ne permet de fermer que les
  // onglets non ouverts par un script — sinon l'écran d'adieu reste affiché).
  const quitter = () => {
    getMoteurAudio().couper();
    ttsStop();
    setQuitterOuvert(false);
    setAdieu(true);
    try { window.close(); } catch { /* l'écran d'adieu reste affiché */ }
  };

  const naviguer = (v: Vue) => {
    setMenuOuvert(false);
    setVue(v);
  };

  return (
    <div className="fond-spu min-h-screen flex flex-col text-[--foreground]">
      <EnTete
        vue={vue}
        retour={() => naviguer('accueil')}
        audioActive={audioActive}
        basculeAudio={basculeAudio}
        volume={volume}
        setVolume={setVolume}
        narrationActive={ttsActive}
        basculeNarration={basculeNarration}
        onQuitter={() => setQuitterOuvert(true)}
        menuOuvert={menuOuvert}
        setMenuOuvert={setMenuOuvert}
        naviguer={naviguer}
      />
      <main className="flex-1">
        {vue === 'accueil' && <VueAccueil choisir={naviguer} aller={naviguer} />}
        {vue === 'oracle' && <FluxOracle />}
        {vue === 'mentor' && <FluxMentor />}
        {vue === 'deep' && <FluxDeep />}
        {vue === 'enfant' && <VueEnfant surRetour={() => naviguer('accueil')} />}
        {vue === 'journal' && <div className="py-8 px-4"><VueJournal /></div>}
        {vue === 'corpus' && <div className="py-8 px-4"><VueCorpus /></div>}
        {vue === 'transparence' && <div className="py-8 px-4"><VueTransparence /></div>}
        {vue === 'confidentialite' && <div className="py-8 px-4"><VueConfidentialite /></div>}
        {vue === 'fonctionnement' && <div className="py-8 px-4"><VueFonctionnement /></div>}
        {vue === 'nouveautes' && <div className="py-8 px-4"><VueNouveautes /></div>}
        {vue === 'soutien' && <div className="py-8 px-4"><VueSoutien /></div>}
      </main>
      <PiedDePage aller={naviguer} />

      {/* v4.8 — confirmation avant de quitter l'application */}
      <Dialog open={quitterOuvert} onOpenChange={setQuitterOuvert}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <LogOut className="h-4 w-4 text-[--primary]" aria-hidden /> Quitter le SPU ?
            </DialogTitle>
            <DialogDescription>
              La musique et la narration s&apos;arrêteront. Tes échanges restent dans ton journal
              (purge automatique après 90 jours). Tu pourras revenir quand tu veux.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQuitterOuvert(false)} className="rounded-full">Rester</Button>
            <Button variant="destructive" onClick={quitter} className="rounded-full">
              <LogOut className="h-4 w-4 mr-1" aria-hidden /> Quitter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* v4.8 — écran d'adieu (affiché si le navigateur ne ferme pas l'onglet) */}
      {adieu && (
        <div className="fixed inset-0 z-50 fond-spu flex flex-col items-center justify-center text-center px-6">
          <span className="text-5xl mb-5" aria-hidden>🌿</span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold mb-3">Merci d&apos;avoir partagé tes questions avec le SPU.</h2>
          <p className="text-sm text-[--muted-foreground] max-w-md leading-relaxed mb-8">
            La musique est coupée, la narration est silencieuse. Ton journal de bord t&apos;attend
            quand tu reviens — les paraboles ne se lassent pas.
          </p>
          <p className="text-[15px] font-medium mb-10">Un mentor, pas un maître.</p>
          <Button onClick={() => setAdieu(false)} className="rounded-full min-h-[44px]">
            <Leaf className="h-4 w-4 mr-2" aria-hidden /> Revenir au SPU
          </Button>
        </div>
      )}
    </div>
  );
}

// ── v4.8 — Barre de menu : tous les écrits et options, ergonomie d'abord ──────
const MENU: { vue: Vue; label: string; labelCourt: string; icone: React.ReactNode }[] = [
  { vue: 'fonctionnement', label: 'Comment fonctionne le SPU', labelCourt: 'Fonctionnement', icone: <Compass className="h-4 w-4" aria-hidden /> },
  { vue: 'nouveautes', label: 'Quoi de neuf', labelCourt: 'Quoi de neuf', icone: <Newspaper className="h-4 w-4" aria-hidden /> },
  { vue: 'journal', label: 'Journal de bord', labelCourt: 'Journal', icone: <NotebookPen className="h-4 w-4" aria-hidden /> },
  { vue: 'corpus', label: 'Le corpus (50 + 15)', labelCourt: 'Corpus', icone: <Library className="h-4 w-4" aria-hidden /> },
  { vue: 'transparence', label: 'Transparence', labelCourt: 'Transparence', icone: <Eye className="h-4 w-4" aria-hidden /> },
  { vue: 'confidentialite', label: 'Confidentialité & RGPD', labelCourt: 'RGPD', icone: <ShieldCheck className="h-4 w-4" aria-hidden /> },
  { vue: 'soutien', label: 'Soutenir le concepteur', labelCourt: 'Soutenir', icone: <HeartHandshake className="h-4 w-4" aria-hidden /> },
];

function BarreMenu({
  vue, naviguer, menuOuvert, setMenuOuvert, narrationActive, basculeNarration, onQuitter,
}: {
  vue: Vue; naviguer: (v: Vue) => void; menuOuvert: boolean; setMenuOuvert: (v: boolean) => void;
  narrationActive: boolean; basculeNarration: (v: boolean) => void; onQuitter: () => void;
}) {
  const item = (m: (typeof MENU)[number], surMobile = false) => (
    <button
      key={m.vue}
      onClick={() => naviguer(m.vue)}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors whitespace-nowrap ${
        vue === m.vue
          ? 'bg-[--primary] text-[--primary-foreground] font-medium'
          : 'text-[--muted-foreground] hover:text-[--foreground] hover:bg-[--muted]'
      } ${surMobile ? 'min-h-[44px] w-full px-4 text-[15px]' : ''}`}
      aria-current={vue === m.vue ? 'page' : undefined}
    >
      {m.icone}
      <span>{surMobile ? m.label : m.labelCourt}</span>
    </button>
  );

  return (
    <nav aria-label="menu principal" className="border-t border-[--border]/60 bg-[--card]/60 backdrop-blur-md">
      {/* Ordinateur : barre complète */}
      <div className="hidden md:flex max-w-4xl mx-auto px-4 h-11 items-center gap-1 overflow-x-auto scroll-spu">
        {MENU.map((m) => item(m))}
        <span className="mx-1 h-5 w-px bg-[--border]" aria-hidden />
        <button
          onClick={() => basculeNarration(!narrationActive)}
          title="Narration complète de la réponse — activée par défaut, désactivable ici"
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${
            narrationActive
              ? 'bg-[--secondary]/15 text-[--secondary] font-medium'
              : 'text-[--muted-foreground] hover:bg-[--muted]'
          }`}
          aria-pressed={narrationActive}
        >
          {narrationActive ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
          Narration {narrationActive ? 'activée' : 'coupée'}
        </button>
        <button
          onClick={onQuitter}
          title="Quitter l'application"
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[--muted-foreground] hover:bg-destructive/10 hover:text-destructive transition-colors whitespace-nowrap ml-auto"
        >
          <LogOut className="h-4 w-4" aria-hidden /> Quitter
        </button>
      </div>

      {/* Téléphone : menu déroulant */}
      {menuOuvert && (
        <div className="md:hidden border-t border-[--border]/60 bg-[--background]/95 backdrop-blur-md">
          <div className="max-w-4xl mx-auto px-2 py-2 flex flex-col">
            {MENU.map((m) => item(m, true))}
            <div className="h-px bg-[--border] my-2" aria-hidden />
            <button
              onClick={() => { basculeNarration(!narrationActive); }}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] text-[--muted-foreground] hover:bg-[--muted] min-h-[44px]"
              aria-pressed={narrationActive}
            >
              {narrationActive ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
              Narration {narrationActive ? 'activée (réponse lue)' : 'coupée (tu lis toi-même)'}
            </button>
            <button
              onClick={onQuitter}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[15px] text-destructive hover:bg-destructive/10 min-h-[44px]"
            >
              <LogOut className="h-4 w-4" aria-hidden /> Quitter l&apos;application
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── En-tête : navigation, narration, musique, voix, compte ───────────────────
function EnTete({
  vue, retour, audioActive, basculeAudio, volume, setVolume,
  narrationActive, basculeNarration, onQuitter, menuOuvert, setMenuOuvert, naviguer,
}: {
  vue: Vue; retour: () => void; audioActive: boolean; basculeAudio: (v: boolean) => void;
  volume: number; setVolume: (v: number) => void;
  narrationActive: boolean; basculeNarration: (v: boolean) => void;
  onQuitter: () => void; menuOuvert: boolean; setMenuOuvert: (v: boolean) => void;
  naviguer: (v: Vue) => void;
}) {
  const modeActuel = MODES.find((m) => m.id === vue);
  return (
    <header className="sticky top-0 z-20 backdrop-blur-md bg-[--background]/85 border-b border-[--border]/70 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2 sm:gap-3">
        {vue !== 'accueil' ? (
          <Button variant="ghost" size="sm" onClick={retour} className="rounded-full" aria-label="retour à l'accueil">
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
          {/* v4.8 — bouton dédié : activer / désactiver la narration (défaut : activée) */}
          <Button
            variant="ghost" size="sm"
            onClick={() => basculeNarration(!narrationActive)}
            className="rounded-full px-2"
            title={narrationActive ? 'Narration activée — cliquer pour lire toi-même' : 'Narration coupée — cliquer pour écouter la réponse lue'}
            aria-pressed={narrationActive}
            aria-label="narration de la réponse"
          >
            {narrationActive ? <Volume2 className="h-4 w-4 text-[--secondary]" aria-hidden /> : <VolumeX className="h-4 w-4 text-[--muted-foreground]" aria-hidden />}
            <span className="hidden lg:inline ml-1 text-xs">Narration</span>
          </Button>
          {/* Théâtre sonore — réglages des 10 voix */}
          <ReglagesVoix>
            <Button variant="ghost" size="sm" className="rounded-full px-2" aria-label="régler les voix du théâtre sonore" title="Voix du théâtre sonore">
              <AudioLines className="h-4 w-4" aria-hidden />
              <span className="hidden lg:inline ml-1 text-xs">Voix</span>
            </Button>
          </ReglagesVoix>
          {/* Musique de fond */}
          <div className="flex items-center gap-1.5" title="Musique de fond — 51 musiques libres, variées à chaque conversation">
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
          <VoletCompte onOuvrirSession={() => naviguer('journal')} />
          {/* Menu (téléphone) */}
          <Button
            variant="ghost" size="sm"
            className="md:hidden rounded-full px-2"
            onClick={() => setMenuOuvert(!menuOuvert)}
            aria-expanded={menuOuvert}
            aria-label="ouvrir le menu"
          >
            {menuOuvert ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </Button>
        </div>
      </div>
      <BarreMenu
        vue={vue}
        naviguer={naviguer}
        menuOuvert={menuOuvert}
        setMenuOuvert={setMenuOuvert}
        narrationActive={narrationActive}
        basculeNarration={basculeNarration}
        onQuitter={onQuitter}
      />
    </header>
  );
}

// ── Accueil ───────────────────────────────────────────────────────────────────
function VueAccueil({ choisir, aller }: { choisir: (v: Vue) => void; aller: (v: Vue) => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <div className="text-center mb-12">
        <p className="text-sm tracking-[0.3em] text-[--muted-foreground] uppercase mb-4">Version {VERSION_SPU}</p>
        <h1 className="text-4xl sm:text-6xl font-serif font-bold leading-tight mb-5 halo-titre">
          Pose ta question.<br />
          <span className="text-[--primary]">Ferme les yeux.<br />Écoute la parabole.</span>
        </h1>
        <p className="text-[15px] sm:text-base text-[--muted-foreground] leading-relaxed max-w-xl mx-auto">
          Je consulte plusieurs sources d&apos;intelligence et de recherche, je synthétise leurs réponses,
          puis je te propose une <span className="text-[--foreground] font-medium">parabole réelle et sourcée</span> et une
          histoire écrite pour toi. Et <span className="text-[--foreground] font-medium">je te lis tout</span> —
          tu n&apos;as rien à lire, seulement à écouter. Un miroir narratif, jamais une vérité absolue.
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <Badge variant="outline" className="rounded-full">🎭 10 voix locales</Badge>
          <Badge variant="outline" className="rounded-full">🔊 réponse entièrement lue</Badge>
          <Badge variant="outline" className="rounded-full">🎵 51 musiques libres, variées</Badge>
          <Badge variant="outline" className="rounded-full">📚 65 paraboles sourcées</Badge>
          <Badge variant="outline" className="rounded-full">🔒 sans clé API</Badge>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => choisir(m.id)}
            className="group text-left rounded-2xl border border-[--border] bg-[--card] p-6 transition-all hover:border-[--primary]/60 hover:shadow-xl hover:shadow-[--primary]/5 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[--primary] min-h-[44px]"
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
              <Music4 className="h-3 w-3" aria-hidden /> musique {m.musique} — variée à chaque conversation
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={() => aller('fonctionnement')} className="rounded-full">
          <Compass className="h-4 w-4" aria-hidden /> Comment fonctionne le SPU
        </Button>
        <Button variant="outline" size="sm" onClick={() => aller('nouveautes')} className="rounded-full">
          <Newspaper className="h-4 w-4" aria-hidden /> Quoi de neuf
        </Button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {([
          ['journal', 'Journal de bord', <NotebookPen key="a" className="h-4 w-4" aria-hidden />],
          ['corpus', 'Le corpus (50 + 15)', <Library key="b" className="h-4 w-4" aria-hidden />],
          ['transparence', 'Transparence', <Eye key="c" className="h-4 w-4" aria-hidden />],
          ['confidentialite', 'Confidentialité & RGPD', <ShieldCheck key="d" className="h-4 w-4" aria-hidden />],
          ['soutien', 'Soutenir le concepteur', <HeartHandshake key="e" className="h-4 w-4" aria-hidden />],
        ] as [Vue, string, React.ReactNode][]).map(([v, label, icone]) => (
          <Button key={v} variant="ghost" size="sm" onClick={() => aller(v)} className="rounded-full text-[--muted-foreground]">
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

// ── Lecture complète de la réponse par le narrateur (exigence du concepteur) ──
// TOUTE la réponse du SPU est lue par LA voix du narrateur : la parabole, son
// interprétation, l'histoire et la mise en perspective — dans cet ordre.
// (le script texteNarrationComplete vit dans store.ts, partagé avec le mode Enfant)
function narrerReponseComplete(r: ReponseVue, reglages: { voixNarrateur: string; debitVoix: number }) {
  const texte = texteNarrationComplete(r);
  if (!texte.trim()) return;
  void ttsParler(texte, {
    profil: profilParId(reglages.voixNarrateur),
    debitGlobal: reglages.debitVoix,
  });
}

// ── Hook commun : finalise une réponse terminée (son + lecture) et crée la bulle ──
function useFinalisation() {
  const { ttsActive, voixNarrateur, debitVoix, audioActive } = useSpuStore();

  return useCallback(
    (finie: ReponseVue): MessageFil => {
      const msg: MessageFil = {
        id: uid(),
        role: 'spu',
        heure: heureMaintenant(),
        reponse: { ...finie, enCours: false, heure: null },
      };
      if (audioActive) getMoteurAudio().jingleReponse();
      if (ttsActive) narrerReponseComplete(finie, { voixNarrateur, debitVoix });
      return msg;
    },
    [ttsActive, voixNarrateur, debitVoix, audioActive]
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
      // le serveur émet le nom hyphéné « question-ouverte » — même gestionnaire
      'question-ouverte': (d) => {
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

  // L'utilisateur n'est JAMAIS forcé de répondre aux questions d'affinage :
  // il peut poursuivre sans rien préciser, et la suite reste complète.
  const poursuivreSansRepondre = () => {
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: '(je poursuis sans préciser davantage)' }]);
    void appeler({ reponse: '', saute: true, etape });
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
              placeholder="Partage librement ce que tu veux — un détail, un ressenti, un souvenir…"
              className="rounded-2xl resize-none"
              aria-label="ce que tu veux partager avec le mentor (facultatif)"
            />
            <div className="flex flex-wrap justify-end gap-2 mt-2">
              <Button variant="ghost" onClick={() => { poursuivreSansRepondre(); setBrouillon(''); }} className="rounded-full min-h-[44px] text-[--muted-foreground]">
                Poursuivre sans répondre
              </Button>
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
      // le serveur émet le nom hyphéné « question-ouverte » — même gestionnaire
      'question-ouverte': (d) => {
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
      <div className="max-w-4xl mx-auto px-4 py-5 space-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[--muted-foreground]">
          <span className="font-medium text-[--foreground]">SPU v{VERSION_SPU}</span>
          <button onClick={() => aller('journal')} className="hover:text-[--primary]">Journal de bord</button>
          <button onClick={() => aller('corpus')} className="hover:text-[--primary]">Corpus</button>
          <button onClick={() => aller('transparence')} className="hover:text-[--primary]">Transparence</button>
          <button onClick={() => aller('confidentialite')} className="hover:text-[--primary]">Confidentialité &amp; RGPD</button>
          <button onClick={() => aller('soutien')} className="hover:text-[--primary]">Soutenir le concepteur</button>
          <span className="ml-auto">Un mentor, pas un maître. 🌿</span>
        </div>
        <p className="text-[11px] text-[--muted-foreground]/70">
          Conçu avec soin pour qui cherche un éclairage — soutien et retours bienvenus :{' '}
          <a href="mailto:ramenyido@gmail.com" className="underline underline-offset-2 hover:text-[--primary]">ramenyido@gmail.com</a>
          {' '}· 00228 9-364-364-1
        </p>
      </div>
    </footer>
  );
}

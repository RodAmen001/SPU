// SPU v5.1 — Application principale (single route, navigation par vues)
// v5.1 : chaque requête reçoit UNE PARABOLE cadrée (ré-arbitrage vers la synthèse
// puis recherche en ligne si le corpus ne cadre pas) — fin des questions d'affinage
// et de la « simple écoute » du Mentor.
// Historique : v4.7 grande fluidité (matching parallèle aux sources, histoire et
// perspective en parallèle, tonalité locale, escalade plafonnée) ; v4.5 sources
// adaptatives 2→3→4→5, parole du Mentor repliée dans l'onglet réflexion, TOUTE la
// réponse lue par le narrateur ; v4.4 structure universelle de réponse (parabole +
// interprétation + histoire + perspective) ; v4.1 fil de discussion, musique MP3
// par mode, théâtre sonore, compte.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sparkles, Compass, Baby, NotebookPen, Library, Eye, ShieldCheck,
  Volume2, VolumeX, ArrowLeft, RefreshCw, Send, AudioLines, Music4,
  Menu, X, LogOut, Newspaper, HeartHandshake, Leaf, Repeat, SkipForward, Zap,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { streamSSE } from '@/lib/spu/sse-client';
import { useSpuStore, REPONSE_VIDE, heureMaintenant, texteNarrationComplete, type ReponseVue } from '@/lib/spu/store';
import type { ScenarioBoost } from '@/lib/spu/boost';
import { VERSION_SPU } from '@/lib/spu/constants';
import { getMoteurAudio, type ModeMusique } from '@/lib/spu/audio-engine';
import { ttsStop, ttsParler, profilParId, prechaufferNeurales } from '@/lib/spu/tts';
import { VueReponse, EtapesEnDirect } from './reponse-view';
import { TheatreBoost } from './theatre-boost';
import { BulleUtilisateur, BulleSpu, FilDiscussion, type MessageFil } from './fil-discussion';
import { VueEnfant } from './child-view';
import { VueJournal } from './journal-view';
import { VueCorpus } from './corpus-view';
import { VueTransparence, VueConfidentialite, VueFonctionnement, VueNouveautes, VueSoutien, VueMusiques } from './pages-view';
import { ReglagesVoix } from './reglages-voix';
import { VoletCompte } from './compte-volet';

type Vue = 'accueil' | 'oracle' | 'mentor' | 'oracle-inverse' | 'enfant' | 'journal' | 'corpus' | 'musiques' | 'transparence' | 'confidentialite' | 'fonctionnement' | 'nouveautes' | 'soutien';

// v4.8 — La barre de menu : toutes les écrits et options de l'application,
// disposés de la manière la plus claire possible (ordinateur : barre complète
// sous l'en-tête ; téléphone : menu déroulant).

const MODES: { id: Vue; icone: React.ReactNode; titre: string; description: string; musique: string }[] = [
  { id: 'oracle', icone: <Sparkles className="h-6 w-6" aria-hidden />, titre: 'Oracle', description: 'Une réponse unique : synthèse, parabole, histoire. Pour une question ponctuelle.', musique: 'majestueuse et contemplative' },
  { id: 'mentor', icone: <Compass className="h-6 w-6" aria-hidden />, titre: 'Mentor', description: 'Un dialogue progressif en 3 étapes, pour clarifier pas à pas.', musique: 'chaleureuse, un compagnon de route' },
  { id: 'oracle-inverse', icone: <Repeat className="h-6 w-6" aria-hidden />, titre: 'Oracle Inversé', description: 'Le SPU te donne UNE parabole : dis ce que tu en comprends — il analyse ta lecture et te répond. Pour te découvrir toi-même.', musique: 'profonde, au rythme du souffle' },
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

  // v5.0 — Musique de fond sur TOUTES les pages (exigence du concepteur :
  // « pas de page sans musique ») : les quatre modes gardent leur ambiance,
  // l'accueil et les pages documentaires jouent le sac « accueil » (calme).
  const modeMusiqueDe = (v: Vue): ModeMusique =>
    v === 'oracle' || v === 'mentor' || v === 'enfant' ? v : v === 'oracle-inverse' ? 'deep' : 'accueil';

  useEffect(() => {
    const moteur = getMoteurAudio();
    moteur.setVolume(volume);
    if (audioActive) moteur.jouerMode(modeMusiqueDe(vue));
    else moteur.couper();
  }, [vue, audioActive]);

  const basculeAudio = (v: boolean) => {
    setAudioActive(v);
    const moteur = getMoteurAudio();
    moteur.setVolume(volume);
    if (v) moteur.jouerMode(modeMusiqueDe(vue));
    else moteur.couper();
  };

  // v4.8 — Narration complète : ACTIVÉE PAR DÉFAUT (exigence du concepteur),
  // désactivable en un clic depuis le bouton dédié de l'en-tête ou du menu.
  const basculeNarration = (v: boolean) => {
    setTtsActive(v);
    if (!v) ttsStop();
  };

  // v6.3 — PRÉCHAUFFAGE des voix neuronales au démarrage (et à l'activation de
  // la narration) : le modèle Piper est chargé en mémoire AVANT la première
  // réponse — quand la réponse arrive, la lecture démarre sans délai.
  useEffect(() => {
    void prechaufferNeurales();
  }, [ttsActive]);

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
        {vue === 'oracle-inverse' && <FluxOracleInverse />}
        {vue === 'enfant' && <VueEnfant surRetour={() => naviguer('accueil')} />}
        {vue === 'journal' && <div className="py-8 px-4"><VueJournal /></div>}
        {vue === 'corpus' && <div className="py-8 px-4"><VueCorpus /></div>}
        {vue === 'musiques' && <div className="py-8 px-4"><VueMusiques /></div>}
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
  { vue: 'corpus', label: 'Le corpus (100)', labelCourt: 'Corpus', icone: <Library className="h-4 w-4" aria-hidden /> },
  { vue: 'musiques', label: 'Les musiques du SPU', labelCourt: 'Musiques', icone: <Music4 className="h-4 w-4" aria-hidden /> },
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
          {/* Musique de fond + MUSIQUE SUIVANTE (v6.1) + CADRE MUSIQUE (v6.3) */}
          <div className="flex items-center gap-1.5" title="Musique de fond — 100 musiques libres, variées à chaque conversation">
            <button
              onClick={() => naviguer('musiques')}
              className="flex items-center"
              title="Cadre musique — noter la piste, la rejouer ou la passer"
              aria-label="ouvrir le cadre musique"
            >
              <Music4 className={`h-4 w-4 ${audioActive ? 'text-[--primary]' : 'text-[--muted-foreground]'}`} aria-hidden />
            </button>
            <Switch checked={audioActive} onCheckedChange={basculeAudio} aria-label="musique de fond" />
            {audioActive && (
              <Button
                variant="ghost" size="sm"
                onClick={() => getMoteurAudio().pisteSuivante()}
                className="rounded-full px-1.5"
                title="Musique suivante — passer cette piste"
                aria-label="musique suivante"
              >
                <SkipForward className="h-4 w-4 text-[--primary]" aria-hidden />
              </Button>
            )}
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

// ── Accueil (v4.9 — page « vivante » : couleurs, gradients, modes colorés) ────
// Exigence du concepteur : une page d'accueil qui vit — des couleurs chaleureuses
// qui annoncent l'objet même de l'application, sans perdre la sobriété du ton.
const COULEURS_MODES: Record<string, { carte: string; pastille: string; survol: string }> = {
  oracle: {
    carte: 'from-amber-500/15 via-orange-500/10 to-transparent',
    pastille: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-white',
    survol: 'hover:border-amber-500/60 hover:shadow-amber-500/15',
  },
  mentor: {
    carte: 'from-emerald-500/15 via-teal-500/10 to-transparent',
    pastille: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-500 group-hover:text-white',
    survol: 'hover:border-emerald-500/60 hover:shadow-emerald-500/15',
  },
  'oracle-inverse': {
    carte: 'from-violet-500/15 via-indigo-500/10 to-transparent',
    pastille: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 group-hover:bg-violet-500 group-hover:text-white',
    survol: 'hover:border-violet-500/60 hover:shadow-violet-500/15',
  },
  enfant: {
    carte: 'from-rose-500/15 via-pink-500/10 to-transparent',
    pastille: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 group-hover:bg-rose-500 group-hover:text-white',
    survol: 'hover:border-rose-500/60 hover:shadow-rose-500/15',
  },
};

const BADGES_ACCUEIL: { texte: string; teinte: string }[] = [
  { texte: '🎭 12 voix locales distinctes', teinte: 'border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200' },
  { texte: '⚡ théâtre BOOST en 5 phases', teinte: 'border-orange-500/50 bg-orange-500/10 text-orange-800 dark:text-orange-200' },
  { texte: '🔊 réponse entièrement lue', teinte: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200' },
  { texte: '🎵 51 musiques libres, variées', teinte: 'border-violet-500/50 bg-violet-500/10 text-violet-800 dark:text-violet-200' },
  { texte: '📚 100 paraboles réelles et sourcées', teinte: 'border-sky-500/50 bg-sky-500/10 text-sky-800 dark:text-sky-200' },
  { texte: '🌍 du monde entier', teinte: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200' },
  { texte: '🔒 sans clé API', teinte: 'border-[--border] bg-[--muted]/40 text-[--muted-foreground]' },
];

function VueAccueil({ choisir, aller }: { choisir: (v: Vue) => void; aller: (v: Vue) => void }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-14">
      {/* — Héros « vivant » : gradient, orbes de couleur floutées, halo du titre — */}
      <div className="relative overflow-hidden rounded-3xl border border-[--border] bg-gradient-to-br from-[--primary]/10 via-[--accent]/15 to-[--secondary]/10 px-6 py-10 sm:px-12 sm:py-14 mb-10">
        <span className="pointer-events-none absolute -top-12 -right-8 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl animate-pulse" aria-hidden />
        <span className="pointer-events-none absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute top-1/4 left-1/2 h-40 w-40 rounded-full bg-violet-400/15 blur-3xl" aria-hidden />
        <div className="relative text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-[--accent]/50 bg-[--accent]/10 px-4 py-1.5 text-xs tracking-[0.22em] text-[--primary] uppercase mb-5">
            <Leaf className="h-3.5 w-3.5" aria-hidden /> Version {VERSION_SPU} · Un mentor, pas un maître
          </p>
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
            {BADGES_ACCUEIL.map((b) => (
              <Badge key={b.texte} variant="outline" className={`rounded-full ${b.teinte}`}>{b.texte}</Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {MODES.map((m) => {
          const c = COULEURS_MODES[m.id] || COULEURS_MODES.oracle;
          return (
            <button
              key={m.id}
              onClick={() => choisir(m.id)}
              className={`group text-left rounded-2xl border border-[--border] bg-gradient-to-br ${c.carte} p-6 transition-all ${c.survol} hover:shadow-xl hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[--primary] min-h-[44px]`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className={`h-11 w-11 rounded-xl flex items-center justify-center transition-colors ${c.pastille}`} aria-hidden>
                  {m.icone}
                </span>
                <h2 className="text-lg font-semibold">{m.titre}</h2>
                {m.id === 'enfant' && <Badge className="ml-auto text-xs bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20">espace protégé</Badge>}
              </div>
              <p className="text-sm text-[--muted-foreground] leading-relaxed">{m.description}</p>
              <p className="text-xs text-[--muted-foreground]/80 mt-2 flex items-center gap-1">
                <Music4 className="h-3 w-3" aria-hidden /> musique {m.musique} — variée à chaque conversation
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-3">
        <Button size="sm" onClick={() => aller('fonctionnement')} className="rounded-full bg-[--primary] hover:bg-[--primary]/85">
          <Compass className="h-4 w-4" aria-hidden /> Comment fonctionne le SPU
        </Button>
        <Button variant="outline" size="sm" onClick={() => aller('nouveautes')} className="rounded-full border-[--accent]/60 bg-[--accent]/10 hover:bg-[--accent]/20">
          <Newspaper className="h-4 w-4" aria-hidden /> Quoi de neuf
        </Button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {([
          ['journal', 'Journal de bord', <NotebookPen key="a" className="h-4 w-4" aria-hidden />],
          ['corpus', 'Le corpus (100)', <Library key="b" className="h-4 w-4" aria-hidden />],
          ['musiques', 'Les musiques du SPU', <Music4 key="f" className="h-4 w-4" aria-hidden />],
          ['transparence', 'Transparence', <Eye key="c" className="h-4 w-4" aria-hidden />],
          ['confidentialite', 'Confidentialité & RGPD', <ShieldCheck key="d" className="h-4 w-4" aria-hidden />],
          ['soutien', 'Soutenir le concepteur', <HeartHandshake key="e" className="h-4 w-4" aria-hidden />],
        ] as [Vue, string, React.ReactNode][]).map(([v, label, icone]) => (
          <Button key={v} variant="ghost" size="sm" onClick={() => aller(v)} className="rounded-full text-[--muted-foreground] hover:text-[--primary]">
            {icone} {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ── Zone de question partagée ─────────────────────────────────────────────────
function ZoneQuestion({
  onEnvoyer, enCours, placeholder, suggestions, modeLong, boutonLibre,
}: {
  onEnvoyer: (q: string) => void; enCours: boolean; placeholder: string; suggestions?: string[];
  modeLong?: boolean; boutonLibre?: string; // v6.0 — envoi sans texte (Oracle Inversé)
}) {
  const [texte, setTexte] = useState('');
  const envoyer = () => {
    if (texte.trim() || boutonLibre) {
      onEnvoyer(texte.trim());
      setTexte('');
    }
  };
  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
        className="space-y-3"
      >
        <Textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder={placeholder}
          rows={modeLong ? 3 : 2}
          maxLength={2000}
          className="rounded-2xl border-[--border] bg-[--card] text-[15px] resize-none focus-visible:ring-[--primary]"
          aria-label="ta question"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && (texte.trim() || boutonLibre)) {
              envoyer();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[--muted-foreground]">{texte.length}/2000 · ⌘/Ctrl+Entrée pour envoyer</span>
          <Button type="submit" disabled={enCours || (!texte.trim() && !boutonLibre)} className="rounded-full min-h-[44px]">
            <Send className="h-4 w-4 mr-2" aria-hidden />
            {boutonLibre || 'Envoyer'}
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
        // v5.0 — la musique s'accorde à LA parabole offerte (culture + famille)
        const dp = d as { culture?: string; famille?: string };
        getMoteurAudio().accorderParabole({ culture: dp.culture, famille: dp.famille });
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
  const [boostScenario, setBoostScenario] = useState<ScenarioBoost | null>(null);
  const [boostEnAttente, setBoostEnAttente] = useState<{ echangeId: string } | null>(null);
  const finaliser = useFinalisation();

  const appeler = async (corps: Record<string, unknown>) => {
    ttsStop();
    if (audioActive) getMoteurAudio().jouerMode('mentor');
    const r: ReponseVue = { ...REPONSE_VIDE, enCours: true };
    setReponse(r);
    let boostRecu: ScenarioBoost | null = null;
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
        // v5.0 — la musique s'accorde à LA parabole offerte (culture + famille)
        const dp = d as { culture?: string; famille?: string };
        getMoteurAudio().accorderParabole({ culture: dp.culture, famille: dp.famille });
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
      // v6.0 — LE BOOST arrive après la 3ᵉ étape : le théâtre prend le relais
      boost: (d) => {
        boostRecu = ((d as { scenario?: ScenarioBoost }).scenario || null) as ScenarioBoost | null;
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
      const msg = finaliser(r);
      const finalBoost = (r.final as { boostEnPreparation?: boolean } | undefined) || undefined;
      if (boostRecu) {
        // scénario reçu dans le flux (compatibilité) : offre directe
        setBoostScenario(boostRecu);
      } else if (finalBoost?.boostEnPreparation && r.final?.echangeId) {
        // v6.2 — le BOOST est préparé en arrière-plan : la carte « en préparation »
        // s'affiche, le polling /api/boost ramène le scénario dès qu'il est écrit.
        setBoostEnAttente({ echangeId: r.final.echangeId });
      }
      setMessages((m) => [...m, { ...msg, etiquette }]);
    }
    setReponse(null);
  };

  // v6.2 — polling du BOOST préparé en arrière-plan : toutes les 5 s, jusqu'à
  // 4 min. Dès que le scénario est prêt → l'offre « Lancer le BOOST ». En cas
  // d'échec, la carte s'efface discrètement — jamais au détriment de la réponse.
  useEffect(() => {
    if (!boostEnAttente) return;
    let vivant = true;
    let essais = 0;
    const id = setInterval(async () => {
      essais++;
      try {
        const res = await fetch(`/api/boost?echangeId=${encodeURIComponent(boostEnAttente.echangeId)}`);
        const j = (await res.json()) as { pret: boolean; echec?: boolean; scenario?: ScenarioBoost };
        if (!vivant) return;
        if (j.pret && j.scenario) {
          setBoostScenario(j.scenario);
          setBoostEnAttente(null);
          return;
        }
        if (j.echec || essais >= 48) setBoostEnAttente(null);
      } catch {
        /* le prochain tick réessaiera */
      }
    }, 5000);
    return () => {
      vivant = false;
      clearInterval(id);
    };
  }, [boostEnAttente]);

  const poser = (q: string) => {
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: q }]);
    void appeler({ question: q, etape: 1 });
  };

  const repondreAngle = (texte: string, angle?: string) => {
    const contenu = angle ? `${angle}\n${texte}` : texte;
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: texte }]);
    void appeler({ reponse: contenu, etape });
  };

  // v5.1 : chaque message avance le dialogue et reçoit sa réponse complète.
  const poursuivreSansRepondre = () => {
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: '(je poursuis sans préciser davantage)' }]);
    void appeler({ reponse: '', saute: true, etape });
  };

  const dernierSpu = [...messages].reverse().find((m) => m.role === 'spu');
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

      {(etape === 2 || etape === 3) && !reponse && (
        <div className="mt-5 pl-9">
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
                Avancer sans préciser davantage
              </Button>
              <Button onClick={() => { if (brouillon.trim()) { repondreAngle(brouillon.trim()); setBrouillon(''); } }} disabled={!brouillon.trim()} className="rounded-full min-h-[44px]">
                <Send className="h-4 w-4 mr-2" aria-hidden /> {etape === 2 ? 'Continuer (étape 2/3)' : 'Recevoir la synthèse (3/3)'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* v6.2 — le BOOST se prépare en arrière-plan : carte d'attente */}
      {boostEnAttente && !boostScenario && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-4 mt-5 flex items-start gap-3">
          <Zap className="h-5 w-5 mt-0.5 text-amber-600 animate-pulse shrink-0" aria-hidden />
          <div>
            <p className="font-semibold text-sm">⚡ BOOST en préparation…</p>
            <p className="text-xs text-[--muted-foreground] mt-0.5">
              Ton théâtre du courage est en train d&apos;être écrit pour ce chemin parcouru — l&apos;offre s&apos;affichera ici dans un instant.
              Ta réponse, elle, est complète ci-dessus.
            </p>
          </div>
        </div>
      )}

      {/* v6.0 — LE BOOST : théâtre courageux après la toute dernière question */}
      {boostScenario && <TheatreBoost scenario={boostScenario} />}

      {dialogueFini && !reponse && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => { setEtape(1); setMessages([]); setBoostScenario(null); setBoostEnAttente(null); ttsStop(); getMoteurAudio().jouerMode('mentor'); }} className="rounded-full">
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

// ── FLUX ORACLE INVERSÉ (v6.0, remplace le mode Deep) ────────────────────────
// Le SPU présente UNE parabole nue ; la personne dit ce qu'elle en comprend ;
// le SPU analyse sa lecture face aux interprétations des intelligences
// réflexives, donne LA BONNE INTERPRÉTATION, une APPRÉCIATION valorisante
// (jamais rabaisser) et une ORIENTATION née du rapprochement réponse ↔ parabole.
interface AnalyseOracle {
  comprehension: string;
  appreciation: string;
  interpretation: string;
  autres: string[];
  orientation: string;
}

function FluxOracleInverse() {
  const { sessionId, setSessionId, audioActive, ttsActive, voixNarrateur, debitVoix } = useSpuStore();
  const [messages, setMessages] = useState<MessageFil[]>([]);
  const [reponse, setReponse] = useState<ReponseVue | null>(null);
  const [theme, setTheme] = useState('');
  const [reponseLecture, setReponseLecture] = useState('');
  const finaliser = useFinalisation();

  const appeler = async (corps: Record<string, unknown>) => {
    ttsStop();
    if (audioActive) getMoteurAudio().jouerMode('deep');
    const r: ReponseVue = { ...REPONSE_VIDE, enCours: true };
    setReponse(r);
    await streamSSE('/api/oracle-inverse', { sessionId: sessionId || undefined, ...corps }, {
      status: (d) => {
        r.statut = String(d.step || '');
        setReponse({ ...r });
      },
      parabole: (d) => {
        r.parabole = d as never; // interprétation VOULUE vide : la parabole arrive nue
        setReponse({ ...r });
      },
      'demande-reflexion': (d) => {
        r.questionOuverte = String(d.texte || '');
        setReponse({ ...r });
      },
      'oracle-analyse': (d) => {
        const a = d as { comprehension?: string; appreciation?: string; interpretation?: string; autres?: string[]; orientation?: string };
        // v6.0 — l'analyse est affichée DANS la réponse : appréciation valorisante
        // bien visible (carte dédiée), bonne interprétation sur la parabole,
        // orientation dans la mise en perspective.
        r.oracle = {
          comprehension: a.comprehension || '',
          appreciation: a.appreciation || '',
          autres: a.autres || [],
        };
        if (a.interpretation && r.parabole) {
          r.parabole = { ...r.parabole, interpretation: a.interpretation };
        }
        r.perspective = a.orientation || '';
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
      },
      'http-error': (d) => {
        r.erreur = String(d.error || 'Erreur');
        setReponse({ ...r });
      },
    });
    r.enCours = false;
    if (r.final || r.erreur || r.distress) {
      setMessages((m) => [...m, finaliser(r)]);
    }
    setReponse(null);
  };

  const dernierSpu = [...messages].reverse().find((m) => m.role === 'spu');
  const parabolePresente = dernierSpu?.reponse?.parabole && !dernierSpu.reponse.erreur;
  const analyseFaite = !!dernierSpu?.reponse?.oracle;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {messages.length === 0 && !reponse && (
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold mb-1">Mode Oracle Inversé</h1>
          <Badge variant="outline" className="mb-4">Le renversement : c&apos;est TOI qui lis d&apos;abord</Badge>
          <p className="text-sm text-[--muted-foreground] mb-4">
            Je te donne une parabole — sans son interprétation. Dis-moi ce que TU comprends :
            j&apos;analyse ta lecture avec les intelligences réflexives, je te donne la bonne
            interprétation, une appréciation sincère de ta réponse, et une orientation.
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

      {/* Étape 2 : la personne dit ce qu'elle a compris */}
      {parabolePresente && !analyseFaite && !reponse && (
        <div className="mt-6 pl-9 space-y-3">
          <Textarea
            value={reponseLecture}
            onChange={(e) => setReponseLecture(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Avec tes mots : que comprends-tu de cette parabole ? Une image, une leçon, un souvenir…"
            className="rounded-2xl resize-none"
            aria-label="ce que tu comprends de la parabole"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (reponseLecture.trim()) {
                  setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: reponseLecture.trim() }]);
                  void appeler({ reponse: reponseLecture.trim(), etape: 2 });
                  setReponseLecture('');
                }
              }}
              disabled={!reponseLecture.trim()}
              className="rounded-full min-h-[44px]"
            >
              <Send className="h-4 w-4 mr-2" aria-hidden /> Je dis ce que je comprends
            </Button>
          </div>
        </div>
      )}

      {/* Après l'analyse : nouveau parcours */}
      {analyseFaite && !reponse && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={() => { setMessages([]); setTheme(''); setReponseLecture(''); }} className="rounded-full">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden /> Nouvelle parabole
          </Button>
        </div>
      )}

      {messages.length === 0 && !reponse && (
        <div className="mt-6">
          <ZoneQuestion
            onEnvoyer={(q) => {
              setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: q || '(je reçois une parabole libre)' }]);
              void appeler({ theme: q, etape: 1 });
            }}
            enCours={false}
            placeholder="Si tu veux, note ce qui te traverse en ce moment (facultatif) — ou envoie vide pour recevoir une parabole libre"
            modeLong
            boutonLibre="Recevoir ma parabole"
          />
        </div>
      )}
      {messages.length === 0 && !reponse && (
        <p className="mt-2 text-xs text-[--muted-foreground] text-center">
          {ttsActive ? 'La lecture complète sera lue à voix haute par le narrateur.' : ''}
        </p>
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

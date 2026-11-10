// Mode Enfant — espace protégé séparé (4.4 du cahier) : gros boutons, théâtre sonore
// avec voix distinctes, contes doux, fil de discussion horodaté type messagerie.
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Volume2, VolumeX, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { streamSSE } from '@/lib/spu/sse-client';
import { useSpuStore, REPONSE_VIDE, heureMaintenant, type ReponseVue } from '@/lib/spu/store';
import { getMoteurAudio } from '@/lib/spu/audio-engine';
import { ttsStop, lireTheatre } from '@/lib/spu/tts';
import { EtapesEnDirect } from './reponse-view';
import { BulleUtilisateur, BulleSpu, type MessageFil } from './fil-discussion';

const SUGGESTIONS = [
  { emoji: '🐢', texte: 'Je trouve que je suis trop lent(e), les autres vont plus vite que moi' },
  { emoji: '😤', texte: 'Je me suis disputé(e) avec mon meilleur(e) ami(e)' },
  { emoji: '⭐', texte: 'J\'ai peur de me tromper devant les autres à l\'école' },
  { emoji: '🌧️', texte: 'Il pleut et je m\'ennuie, raconte-moi quelque chose' },
  { emoji: '🍼', texte: 'Un nouveau bébé arrive à la maison' },
  { emoji: '🌳', texte: 'Comment devenir sage comme un vieux sage ?' },
];

let _uid = 0;
const uid = () => `e${Date.now()}-${_uid++}`;

export function VueEnfant({ surRetour }: { surRetour: () => void }) {
  const { sessionId, setSessionId, ttsActive, setTtsActive, audioActive, voixNarrateur, voixPersonnages, debitVoix } = useSpuStore();
  const [question, setQuestion] = useState('');
  const [reponse, setReponse] = useState<ReponseVue | null>(null);
  const [messages, setMessages] = useState<MessageFil[]>([]);
  // Accumulateur du streaming (mis à jour uniquement dans les gestionnaires d'événements)
  const acc = useRef<ReponseVue>(REPONSE_VIDE);

  // musique du mode enfant quand l'ambiance sonore est activée
  useEffect(() => {
    const moteur = getMoteurAudio();
    if (audioActive) moteur.jouerMode('enfant');
    else moteur.couper();
    return () => moteur.couper();
  }, [audioActive]);

  const poser = async (q: string) => {
    if (!q.trim() || reponse?.enCours) return;
    ttsStop();
    setQuestion('');
    setMessages((m) => [...m, { id: uid(), role: 'utilisateur', heure: heureMaintenant(), question: q }]);
    const r = acc;
    r.current = { ...REPONSE_VIDE, enCours: true };
    setReponse({ ...r.current });
    let sid = sessionId || '';
    await streamSSE('/api/ask', { question: q, mode: 'enfant', sessionId: sid || undefined, audioActive: false }, {
      status: (d) => {
        r.current.statut = String(d.step || '');
        setReponse({ ...r.current });
      },
      synthesis: (d) => {
        r.current.synthese = d as never;
        setReponse({ ...r.current });
      },
      parabole: (d) => {
        r.current.parabole = d as never;
        setReponse({ ...r.current });
      },
      histoire: (d) => {
        r.current.histoire += String(d.chunk || '');
        setReponse({ ...r.current });
      },
      perspective: (d) => {
        r.current.perspective = String(d.text || '');
        setReponse({ ...r.current });
      },
      erreur: (d) => {
        r.current.erreur = String(d.message || '');
        setReponse({ ...r.current });
      },
      distress: (d) => {
        r.current.distress = d as never;
        setReponse({ ...r.current });
      },
      final: (d) => {
        const f = d as { echangeId: string; sessionId: string };
        if (f.sessionId && !sid) setSessionId(f.sessionId);
        r.current.final = f as never;
        setReponse({ ...r.current });
      },
      'http-error': (d) => {
        r.current.erreur = String(d.error || 'Erreur');
        setReponse({ ...r.current });
      },
    });
    // Stream terminé → bulle horodatée + jingle + théâtre sonore si la voix est activée
    r.current.enCours = false;
    const finie = { ...r.current };
    setMessages((m) => [...m, { id: uid(), role: 'spu', heure: heureMaintenant(), reponse: { ...finie, heure: null } }]);
    if (getMoteurAudio().volume > 0) getMoteurAudio().jingleReponse();
    if (ttsActive && finie.histoire) {
      void lireTheatre(finie.histoire, { narrateur: voixNarrateur, personnages: voixPersonnages, debit: debitVoix });
    }
    setReponse(null);
  };

  const dernierSpu = [...messages].reverse().find((m) => m.role === 'spu');

  return (
    <div className="min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={surRetour} className="rounded-full h-11" aria-label="retour à l'accueil">
          <ArrowLeft className="h-5 w-5 mr-1" aria-hidden /> Accueil
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const v = !ttsActive;
            setTtsActive(v);
            if (!v) ttsStop();
            else if (dernierSpu?.reponse?.histoire) {
              void lireTheatre(dernierSpu.reponse.histoire, { narrateur: voixNarrateur, personnages: voixPersonnages, debit: debitVoix });
            }
          }}
          className="rounded-full h-11 text-base"
          aria-pressed={ttsActive}
        >
          {ttsActive ? <Volume2 className="h-5 w-5 mr-2" aria-hidden /> : <VolumeX className="h-5 w-5 mr-2" aria-hidden />}
          Voix {ttsActive ? 'activée' : 'coupée'}
        </Button>
      </div>

      <Card className="p-6 sm:p-8 mb-6 bg-gradient-to-br from-[--card] via-[--accent]/20 to-[--card] border-2 border-[--accent]/50">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">📗 Le Jardin des Contes</h1>
        <p className="text-center text-lg text-[--muted-foreground]">
          Pose ta question, je te raconte une histoire douce 🌱
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.texte}
            onClick={() => poser(s.texte)}
            disabled={!!reponse?.enCours}
            className="text-left rounded-2xl border-2 border-[--border] bg-[--card] p-5 text-base sm:text-lg font-medium hover:border-[--accent] hover:bg-[--accent]/10 transition-all disabled:opacity-50 min-h-[72px] flex items-center gap-3"
          >
            <span className="text-3xl" aria-hidden>{s.emoji}</span>
            {s.texte}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          poser(question);
        }}
        className="flex gap-2 mb-8"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Écris ta question ici…"
          className="flex-1 h-14 rounded-2xl border-2 border-[--border] bg-[--card] px-5 text-lg focus:outline-none focus:border-[--accent]"
          maxLength={500}
          aria-label="ta question"
        />
        <Button type="submit" size="lg" disabled={!!reponse?.enCours || !question.trim()} className="h-14 rounded-2xl text-lg px-7">
          {reponse?.enCours ? '…' : 'Raconte !'}
        </Button>
      </form>

      {/* Fil de discussion enfant */}
      <div className="space-y-6" aria-live="polite">
        {messages.map((m) =>
          m.role === 'utilisateur' ? (
            <BulleUtilisateur key={m.id} message={m} />
          ) : (
            <BulleSpu
              key={m.id}
              message={m}
              enfants={
                <Card className="p-6 sm:p-8" aria-live="polite">
                  {m.reponse?.parabole && (
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-5 w-5 text-[--primary]" aria-hidden />
                        <h2 className="text-xl font-bold">La sagesse du jour</h2>
                      </div>
                      <blockquote className="font-serif text-xl leading-relaxed border-l-4 border-[--accent] pl-4">
                        « {m.reponse.parabole.enonce} »
                      </blockquote>
                      <p className="text-[--muted-foreground] mt-2">{m.reponse.parabole.culture}</p>
                      {m.reponse.parabole.interpretation && (
                        <p className="text-lg leading-relaxed mt-3">
                          <span className="font-semibold">Ce que ça veut dire : </span>
                          {m.reponse.parabole.interpretation}
                        </p>
                      )}
                    </div>
                  )}
                  {m.reponse?.erreur && <p className="text-lg whitespace-pre-line">{m.reponse.erreur}</p>}
                  {m.reponse?.histoire && (
                    <>
                      <h2 className="text-xl font-bold mb-3">📖 Ton histoire</h2>
                      <p className="font-serif text-lg sm:text-xl leading-[1.9] whitespace-pre-line">{m.reponse.histoire}</p>
                    </>
                  )}
                  {m.reponse?.perspective && (
                    <div className="mt-5 rounded-2xl bg-[--accent]/20 p-4">
                      <h3 className="text-lg font-bold mb-1">🌟 Et toi alors ?</h3>
                      <p className="text-base sm:text-lg leading-relaxed">{m.reponse.perspective}</p>
                    </div>
                  )}
                  {m.reponse?.synthese && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-[--muted-foreground]">
                        Pour les grands — la réflexion derrière le conte
                      </summary>
                      <p className="text-sm text-[--muted-foreground] leading-relaxed mt-2">{m.reponse.synthese.text}</p>
                    </details>
                  )}
                </Card>
              }
            />
          )
        )}
        {reponse && (
          <BulleSpu
            message={{ id: 'live', role: 'spu', heure: '', reponse }}
            enfants={
              <>
                <EtapesEnDirect reponse={reponse} />
                {reponse.erreur && (
                  <Card className="p-6"><p className="text-lg whitespace-pre-line">{reponse.erreur}</p></Card>
                )}
              </>
            }
          />
        )}
      </div>

      {messages.length > 0 && !reponse && (
        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={() => setMessages([])} className="rounded-full h-12 text-base">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden /> Nouvelle discussion
          </Button>
        </div>
      )}
    </div>
  );
}

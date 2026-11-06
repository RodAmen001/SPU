// Composants de discussion (façon messagerie) + indicateur de réflexion animé
'use client';

import { useEffect, useState } from 'react';
import { Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';

/** Heure courte « 21:45 » pour les bulles de discussion. */
export function heureCourte(d: number | Date): string {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/** Séparateur de jour « aujourd'hui / hier / le 3 novembre ». */
export function SeparateurJour({ precedent, actuel }: { precedent?: number; actuel: number }) {
  const memeJour = precedent && new Date(precedent).toDateString() === new Date(actuel).toDateString();
  if (memeJour) return null;
  const d = new Date(actuel);
  const aujourdhui = new Date().toDateString() === d.toDateString();
  const hier = new Date(Date.now() - 86400000).toDateString() === d.toDateString();
  const label = aujourdhui ? "Aujourd'hui" : hier ? 'Hier' : d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="flex items-center gap-3 my-4" role="separator">
      <span className="h-px flex-1 bg-[--border]" />
      <span className="text-xs text-[--muted-foreground]">{label}</span>
      <span className="h-px flex-1 bg-[--border]" />
    </div>
  );
}

/** Message de l'utilisateur — bulle à droite, horodatée. */
export function BulleUtilisateur({ texte, heure }: { texte: string; heure: number }) {
  return (
    <div className="flex justify-end mb-4">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[--primary] text-[--primary-foreground] px-4 py-3 shadow-sm">
        <p className="text-[15px] leading-relaxed whitespace-pre-line break-words">{texte}</p>
        <p className="text-[11px] opacity-70 mt-1 text-right" aria-label={`envoyé à ${heureCourte(heure)}`}>
          {heureCourte(heure)}
        </p>
      </div>
    </div>
  );
}

/** En-tête d'une réponse du SPU — avatar + heure, façon messagerie. */
export function CarteSysteme({ heure, children }: { heure: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 mb-5">
      <div className="shrink-0 h-8 w-8 rounded-full bg-[--accent]/30 border border-[--accent]/60 flex items-center justify-center mt-1" aria-hidden>
        <span className="font-serif text-sm text-[--primary]">♠</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-xs font-semibold text-[--foreground]">SPU</span>
          <span className="text-[11px] text-[--muted-foreground]">{heureCourte(heure)}</span>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Indicateur de réflexion : jamais de blanc, un texte qui tourne en boucle ──

const PHASES: { cle: string; label: string }[] = [
  { cle: 'détresse', label: 'Précaution' },
  { cle: 'sources', label: 'Sources' },
  { cle: 'synthèse', label: 'Synthèse' },
  { cle: 'préoccupation', label: 'Écoute' },
  { cle: 'matching', label: 'Parabole' },
  { cle: 'histoire', label: 'Histoire' },
];

const MESSAGES_ATTENTE = [
  'Les intelligences se consultent…',
  'Je compare plusieurs points de vue…',
  'Je vérifie chaque source…',
  'Je cherche la parabole qui résonne avec ta question…',
  'Une histoire s\'écrit doucement pour toi…',
  'Encore un instant — je tisse le fil…',
  'Chaque mot mérite d\'être choisi…',
];

const MESSAGES_ATTENTE_ENFANT = [
  '✨ Les petites lumières se consultent…',
  '🌟 Je cherche une belle histoire pour toi…',
  '🐰 Un personnage s\'éveille doucement…',
  '🌱 Les mots poussent, un par un…',
  '📖 Ton histoire arrive, encore un peu…',
  '🎵 J\'accorde la musique du conte…',
];

export function IndicateurReflexion({ statut, enfant = false }: { statut: string | null; enfant?: boolean }) {
  const [indice, setIndice] = useState(0);
  const liste = enfant ? MESSAGES_ATTENTE_ENFANT : MESSAGES_ATTENTE;
  useEffect(() => {
    const t = setInterval(() => setIndice((i) => (i + 1) % liste.length), 2600);
    return () => clearInterval(t);
  }, [liste.length]);

  const indicePhase = statut ? PHASES.findIndex((p) => p.cle === statut) : -1;

  return (
    <div className="rounded-2xl border border-[--border] bg-[--card]/70 p-4 mb-4" aria-live="polite" role="status">
      <div className="flex items-center gap-3">
        <span className="relative flex h-8 w-8 items-center justify-center">
          <span className="absolute h-8 w-8 rounded-full bg-[--primary]/10 animate-ping opacity-40" aria-hidden />
          <Loader2 className="h-5 w-5 animate-spin text-[--primary]" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] text-[--foreground] font-medium transition-all duration-500" key={indice}>
            {liste[indice]}
          </p>
          <p className="text-xs text-[--muted-foreground]">Ta requête est prise en compte — le silence n&apos;est jamais un plantage.</p>
        </div>
      </div>
      {!enfant && (
        <div className="flex flex-wrap gap-1.5 mt-3" aria-hidden>
          {PHASES.map((p, i) => {
            const fait = indicePhase > i || (indicePhase === -1 && false);
            const actif = indicePhase === i;
            return (
              <span
                key={p.cle}
                className={`text-[11px] rounded-full px-2 py-0.5 border transition-colors ${
                  actif
                    ? 'border-[--primary] text-[--primary] bg-[--primary]/10'
                    : fait
                      ? 'border-[--border] text-[--muted-foreground] bg-[--muted]/40'
                      : 'border-[--border]/60 text-[--muted-foreground]/60'
                }`}
              >
                {fait ? '✓ ' : actif ? '● ' : '○ '}
                {p.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Placeholder avant première question. */
export function InvitationQuestion({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="text-center py-10 text-[--muted-foreground]">
      <MessageCircleQuestion className="h-8 w-8 mx-auto mb-3 opacity-60" aria-hidden />
      <p className="font-medium text-[--foreground] mb-1">{titre}</p>
      <p className="text-sm max-w-md mx-auto leading-relaxed">{texte}</p>
      <Sparkles className="h-4 w-4 mx-auto mt-3 opacity-40" aria-hidden />
    </div>
  );
}

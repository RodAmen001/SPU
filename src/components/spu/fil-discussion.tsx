// Fil de discussion type messagerie — bulles horodatées pour l'utilisateur et
// pour le SPU. La mise en forme riche (cartes Synthèse → Parabole → Histoire)
// est conservée à l'intérieur des messages du SPU.
'use client';

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import type { ReponseVue } from '@/lib/spu/store';

export interface MessageFil {
  id: string;
  role: 'utilisateur' | 'spu';
  heure: string; // « 14:07 »
  question?: string; // rôle utilisateur
  reponse?: ReponseVue; // rôle SPU
  etiquette?: string; // « Étape 2/3 — APPROFONDISSEMENT » (Mentor / Deep)
}

/** Bulle de l'utilisateur — alignée à droite, horodatée. */
export function BulleUtilisateur({ message }: { message: MessageFil }) {
  return (
    <div className="flex justify-end animate-bulle">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="rounded-2xl rounded-br-md bg-[--primary] text-[--primary-foreground] px-4 py-3 text-[15px] leading-relaxed shadow-sm whitespace-pre-wrap break-words">
          {message.question}
        </div>
        <div className="text-[11px] text-[--muted-foreground] mt-1 text-right pr-1">{message.heure}</div>
      </div>
    </div>
  );
}

/** En-tête d'un message SPU : avatar + étiquette d'étape éventuelle. */
export function EnteteSpu({ etiquette, heure, enCours }: { etiquette?: string; heure: string | null; enCours?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span
        className="h-7 w-7 shrink-0 rounded-full bg-[--primary] text-[--primary-foreground] flex items-center justify-center font-serif text-xs shadow-sm"
        aria-hidden
      >
        ♠
      </span>
      <span className="text-xs font-semibold text-[--muted-foreground]">SPU</span>
      {etiquette && (
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[--accent]/30 text-[--foreground] font-medium">{etiquette}</span>
      )}
      {heure && !enCours && <span className="text-[11px] text-[--muted-foreground] ml-auto">{heure}</span>}
      {enCours && (
        <span className="text-[11px] text-[--muted-foreground] ml-auto flex items-center gap-1">
          écrit
          <span className="points-attente" aria-hidden>
            <i /><i /><i />
          </span>
        </span>
      )}
    </div>
  );
}

/** Conteneur d'un message SPU (à gauche) — les cartes de contenu passent en enfants. */
export function BulleSpu({
  message,
  enfants,
}: {
  message: MessageFil;
  enfants: React.ReactNode;
}) {
  return (
    <div className="animate-bulle">
      <EnteteSpu etiquette={message.etiquette} heure={message.heure} enCours={message.reponse?.enCours} />
      <div className="pl-9 space-y-3">{enfants}</div>
    </div>
  );
}

/** Conteneur scrollable du fil avec défilement automatique vers le bas. */
export function FilDiscussion({ messages, enfants }: { messages: MessageFil[]; enfants: (m: MessageFil) => React.ReactNode }) {
  const finRef = useRef<HTMLDivElement>(null);
  const compteur = messages.length;
  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [compteur]);
  return (
    <div className="space-y-6" aria-live="polite">
      {messages.map((m) => (
        <div key={m.id}>{enfants(m)}</div>
      ))}
      <div ref={finRef} />
    </div>
  );
}

/** Petit indicateur « Loader » discret utilisé ailleurs. */
export function MiniLoader() {
  return <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />;
}

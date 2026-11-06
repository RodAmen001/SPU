// Affichage de la réponse streamée (sections Synthèse → Parabole → Histoire → …)
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpenText, Sparkles, Loader2, Quote, Eye, Phone, AlertCircle, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReponseVue } from '@/lib/spu/store';

const ETAPES_LISIBILES: Record<string, string> = {
  'détresse': 'Je prends soin de toi d\'abord…',
  'sources': 'Je consulte mes sources…',
  'synthèse': 'Je synthétise…',
  'matching': 'Je cherche la parabole qui résonne…',
  'histoire': 'J\'écris ton histoire…',
  'assemblage': 'J\'assemble le tout…',
  'préparation': 'Je prépare la suite…',
  'approfondissement': 'J\'approfondis avec toi…',
  'méditation': 'Je compose une méditation…',
};

// Phrases de patience affichées en rotation pendant que le SPU réfléchit —
// plus aucun blanc vide : l'utilisateur sait toujours ce qui se passe.
const PHRASES_PATIENCE = [
  'Je tisse les fils de ta réponse…',
  'Je confronte plusieurs points de vue…',
  'Je cherche la parabole qui te ressemble…',
  'Les histoires les plus justes demandent un peu de temps…',
  'Je prends soin de bien comprendre ta question…',
];

/** Indicateur d'attente animé : orbe qui tourne, phrase qui change, points qui pulsent
 *  + aperçu scintillant des sections à venir. Rien ne reste vide pendant la réflexion. */
export function EtapesEnDirect({ reponse }: { reponse: ReponseVue }) {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (!reponse.enCours) return;
    const t = setInterval(() => setPhraseIdx((i) => (i + 1) % PHRASES_PATIENCE.length), 3600);
    return () => clearInterval(t);
  }, [reponse.enCours]);

  if (!reponse.enCours || reponse.final) return null;
  const etape = reponse.statut ? ETAPES_LISIBILES[reponse.statut] || reponse.statut : null;

  return (
    <div className="rounded-2xl border border-[--border] bg-[--card]/70 p-4 animate-bulle" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="orb-spu" aria-hidden>
          <span className="orb-spu-noyau" />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] text-[--foreground] font-medium respiration">
            {PHRASES_PATIENCE[phraseIdx % PHRASES_PATIENCE.length]}
            <span className="points-attente ml-1" aria-hidden>
              <i /><i /><i />
            </span>
          </p>
          {etape && <p className="text-xs text-[--muted-foreground] mt-0.5">{etape}</p>}
        </div>
      </div>
      {/* aperçu scintillant des sections à venir */}
      <div className="mt-3 space-y-2" aria-hidden>
        <div className="h-2.5 rounded-full barre-scintillante" style={{ width: '72%' }} />
        <div className="h-2.5 rounded-full barre-scintillante" style={{ width: '55%', animationDelay: '0.25s' }} />
        <div className="h-2.5 rounded-full barre-scintillante" style={{ width: '63%', animationDelay: '0.5s' }} />
      </div>
    </div>
  );
}

export function VueReponse({
  reponse,
  surPerspective,
  perspectiveEnCours,
  modeEtape,
  enfantine,
}: {
  reponse: ReponseVue;
  surPerspective?: () => void;
  perspectiveEnCours?: boolean;
  modeEtape?: string;
  enfantine?: boolean;
}) {
  const [sourcesOuvertes, setSourcesOuvertes] = useState(false);

  if (reponse.distress) {
    return (
      <Card className="p-6 border-[--primary]/40 bg-[--card]" role="alert">
        <div className="flex items-start gap-3 mb-4">
          <Phone className="h-5 w-5 text-[--primary] mt-1 shrink-0" aria-hidden />
          <h3 className="text-lg font-semibold">
            {reponse.distress.prudent ? 'Tu comptes pour moi' : 'Ta vie compte'}
          </h3>
        </div>
        <div className="whitespace-pre-line text-[15px] leading-relaxed">{reponse.distress.message}</div>
        <div className="grid sm:grid-cols-2 gap-3 mt-5">
          {reponse.distress.resources.map((r) => (
            <div key={r.region} className="rounded-xl border border-[--border] p-4 bg-[--muted]/40">
              <div className="font-semibold text-sm mb-1.5 text-[--primary]">{r.region}</div>
              <ul className="space-y-1 text-sm">
                {r.lignes.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (reponse.erreur && !reponse.synthese) {
    return (
      <Card className="p-6 border-[--accent]" role="alert">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[--primary] mt-0.5 shrink-0" aria-hidden />
          <p className="whitespace-pre-line text-[15px] leading-relaxed">{reponse.erreur}</p>
        </div>
      </Card>
    );
  }

  const rien = !reponse.synthese && !reponse.parabole && !reponse.histoire && !reponse.meditation && !reponse.reflexion && !reponse.perspective;
  if (rien) return null;

  return (
    <div className="space-y-5">
      {modeEtape && (
        <div className="flex items-center gap-2 text-sm text-[--secondary] font-medium" aria-label="étape en cours">
          <Sparkles className="h-4 w-4" aria-hidden /> {modeEtape}
        </div>
      )}

      {/* Synthèse sourcée */}
      {reponse.synthese && (
        <Card className="p-5 apparu">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="h-4 w-4 text-[--primary]" aria-hidden />
            <h3 className="font-semibold text-[15px]">Synthèse de mes sources</h3>
            <Badge variant="outline" className="ml-auto text-xs">
              confiance {Math.round(reponse.synthese.confiance * 100)} %
            </Badge>
          </div>
          <p className="text-[15px] leading-relaxed">{reponse.synthese.text}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {reponse.synthese.sources.map((s) => (
              <Badge key={s} className="text-xs bg-[--muted] text-[--muted-foreground] hover:bg-[--muted]">{s}</Badge>
            ))}
            <button
              className="text-xs text-[--primary] underline-offset-2 hover:underline ml-1"
              onClick={() => setSourcesOuvertes((v) => !v)}
              aria-expanded={sourcesOuvertes}
            >
              {sourcesOuvertes ? 'masquer' : 'pourquoi plusieurs sources ?'}
            </button>
          </div>
          {sourcesOuvertes && (
            <p className="text-xs text-[--muted-foreground] mt-2 leading-relaxed">
              Aucune intelligence seule ne détient la vérité : je compare plusieurs points de vue et je te
              montre d&apos;où vient chaque élément. Cette synthèse est un éclairage, pas une sentence.
            </p>
          )}
        </Card>
      )}

      {/* Réflexion Mentor (étape 2) */}
      {reponse.reflexion && (
        <Card className="p-5 apparu border-[--secondary]/50">
          <h3 className="font-semibold text-[15px] mb-2 text-[--secondary]">Le Mentor t&apos;écoute</h3>
          <p className="text-[15px] leading-relaxed whitespace-pre-line">{reponse.reflexion}</p>
        </Card>
      )}

      {/* Méditation Deep (niveau 2) */}
      {reponse.meditation && (
        <Card className="p-5 apparu border-[--secondary]/50 bg-[--muted]/30">
          <h3 className="font-semibold text-[15px] mb-2 text-[--secondary]">Méditation</h3>
          <p className="text-[15px] leading-relaxed font-serif italic whitespace-pre-line">{reponse.meditation}</p>
        </Card>
      )}

      {/* Parabole */}
      {reponse.parabole && (
        <Card className="p-6 apparu border-[--primary]/30 bg-gradient-to-br from-[--card] to-[--accent]/15">
          <div className="flex items-center gap-2 mb-3">
            <BookOpenText className="h-4 w-4 text-[--primary]" aria-hidden />
            <h3 className="font-semibold text-[15px]">La parabole</h3>
            <Badge variant="outline" className="text-xs ml-auto">{reponse.parabole.code}</Badge>
          </div>
          <blockquote className="font-serif text-lg leading-relaxed border-l-2 border-[--accent] pl-4 mb-3">
            « {reponse.parabole.enonce} »
          </blockquote>
          <p className="text-sm text-[--muted-foreground] mb-2">
            {reponse.parabole.culture} · {reponse.parabole.famille.startsWith('F') ? `Famille ${reponse.parabole.famille}` : reponse.parabole.famille}
          </p>
          <p className="text-[15px] leading-relaxed">
            <span className="font-medium">Interprétation : </span>
            {reponse.parabole.interpretation}
          </p>
          {reponse.parabole.sousSeuil && (
            <p className="text-xs text-[--muted-foreground] mt-3 italic">
              Parabole la plus proche du corpus pour ta question — une recherche de correspondances plus fines est en cours dans mon corpus.
            </p>
          )}
          {reponse.parabole.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-[--border]/60">
              <button
                className="flex items-center gap-1 text-xs text-[--muted-foreground] hover:text-[--primary] transition-colors"
                onClick={() => setSourcesOuvertes((v) => !v)}
                aria-expanded={sourcesOuvertes}
              >
                <Eye className="h-3 w-3" aria-hidden /> sources vérifiables
                <ChevronDown className={`h-3 w-3 transition-transform ${sourcesOuvertes ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {sourcesOuvertes && (
                <ul className="mt-2 space-y-1">
                  {reponse.parabole.sources.map((s) => (
                    <li key={s} className="text-xs text-[--muted-foreground]">
                      {s.startsWith('http') ? (
                        <a href={s} target="_blank" rel="noopener noreferrer" className="text-[--primary] hover:underline break-all">{s}</a>
                      ) : (
                        s
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Histoire */}
      {reponse.histoire && (
        <Card className="p-6 apparu">
          <div className="flex items-center gap-2 mb-3">
            <Quote className="h-4 w-4 text-[--secondary]" aria-hidden />
            <h3 className="font-semibold text-[15px]">Ton histoire</h3>
            {reponse.enCours && !reponse.final && <Loader2 className="h-3.5 w-3.5 animate-spin text-[--muted-foreground]" aria-hidden />}
          </div>
          <p className="font-serif text-[16px] leading-[1.85] whitespace-pre-line">{reponse.histoire}</p>
        </Card>
      )}

      {/* Perspective (Oracle) */}
      {reponse.perspective && (
        <Card className="p-6 apparu border-[--secondary]/50">
          <h3 className="font-semibold text-[15px] mb-2 text-[--secondary]">Mise en perspective</h3>
          <p className="font-serif text-[15px] leading-relaxed whitespace-pre-line">{reponse.perspective}</p>
        </Card>
      )}

      {/* Question ouverte finale */}
      {reponse.questionOuverte && (
        <Card className="p-5 apparu bg-[--secondary]/10 border-[--secondary]/40">
          <p className="text-[15px] leading-relaxed">{reponse.questionOuverte}</p>
        </Card>
      )}

      {/* Action perspective */}
      {reponse.final?.perspectiveDisponible && !reponse.perspective && surPerspective && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={surPerspective} disabled={perspectiveEnCours} className="rounded-full">
            {perspectiveEnCours ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden /> : <Sparkles className="h-4 w-4 mr-2" aria-hidden />}
            Souhaites-tu une mise en perspective ?
          </Button>
        </div>
      )}

      {!enfantine && reponse.final && !reponse.enCours && (
        <p className="text-center text-xs text-[--muted-foreground]">
          Réponse assemblée à partir de plusieurs sources — un éclairage, jamais une vérité absolue. 🌿
        </p>
      )}
    </div>
  );
}

export function AnglesMentor({ angles, enCours, choisir }: { angles: string[]; enCours: boolean; choisir?: (a: string) => void }) {
  if (!angles.length) return null;
  return (
    <Card className="p-5 border-[--accent] apparu">
      <h3 className="font-semibold text-[15px] mb-3">Pour affiner, je te demande</h3>
      <ul className="space-y-2.5">
        {angles.map((a, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed">
            <span className="shrink-0 h-6 w-6 rounded-full bg-[--accent]/30 text-[--foreground] text-xs flex items-center justify-center font-semibold mt-0.5">
              {i + 1}
            </span>
            {choisir ? (
              <button
                onClick={() => choisir(a)}
                className="text-left hover:text-[--primary] transition-colors"
                title="Cliquer pour reprendre cette piste dans ta réponse"
              >
                {a}
              </button>
            ) : (
              <span>{a}</span>
            )}
          </li>
        ))}
      </ul>
      {enCours && <p className="text-xs text-[--muted-foreground] mt-3">Réponds librement — ou passe à la synthèse si tu préfères.</p>}
    </Card>
  );
}

export function ZoneAttente({ texte }: { texte: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-[--muted-foreground] respiration" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {texte}
    </div>
  );
}

export function ScrollFluide({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="h-full">
      <div className="max-w-2xl mx-auto px-4 pb-10">{children}</div>
    </ScrollArea>
  );
}

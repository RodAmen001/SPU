// Journal de bord + exports RGPD (Partie 6 du cahier)
// v4.1 : présentation conversationnelle horodatée (question à droite, réponse à
// gauche, comme une messagerie) + export local (.txt/.json/.md) + export vers
// le compte SPU + ouverture des sessions rattachées au compte.
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Download, Trash2, BookOpen, ChevronDown, CloudUpload, FolderOpen } from 'lucide-react';
import { useSpuStore, dateHeureComplete } from '@/lib/spu/store';

interface EchangeJournal {
  id: string;
  date: string;
  mode: string;
  etape: number;
  question: string | null;
  synthese: string | null;
  sources: string[];
  parabole: { code: string; enonce: string; culture: string; famille: string } | null;
  interpretation: string | null;
  histoire: string | null;
}

interface SessionCompte {
  id: string;
  cree: string;
  mode: string;
  echanges: number;
}

export function VueJournal({ surRetour: _surRetour, surOuvrirSession }: { surRetour?: () => void; surOuvrirSession?: (id: string) => void }) {
  const { sessionId, setSessionId, compteToken, comptePseudo } = useSpuStore();
  const [echanges, setEchanges] = useState<EchangeJournal[] | null>(null);
  const [histoiresOuvertes, setHistoiresOuvertes] = useState<Set<string>>(new Set());
  const [sessionsCompte, setSessionsCompte] = useState<SessionCompte[] | null>(null);
  const [exportMsg, setExportMsg] = useState('');

  useEffect(() => {
    if (!sessionId) return;
    let vivant = true;
    fetch(`/api/journal?sessionId=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((j) => {
        if (vivant) setEchanges(j.echanges || []);
      })
      .catch(() => {
        if (vivant) setEchanges([]);
      });
    return () => {
      vivant = false;
    };
  }, [sessionId]);

  // sessions rattachées au compte (si connecté)
  useEffect(() => {
    if (!compteToken) return;
    fetch('/api/compte/moi', { headers: { Authorization: `Bearer ${compteToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSessionsCompte(j?.sessions || []))
      .catch(() => setSessionsCompte([]));
  }, [compteToken, sessionId]);

  const charge = !!sessionId && echanges === null;
  const listeEchanges = echanges || [];

  const exporter = async (format: 'txt' | 'json' | 'md') => {
    if (!sessionId) return;
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, format }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spu-journal-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exporterVersCompte = async () => {
    if (!sessionId || !compteToken) return;
    setExportMsg('');
    try {
      const res = await fetch('/api/compte/rattacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${compteToken}` },
        body: JSON.stringify({ sessionId }),
      });
      const j = await res.json();
      setExportMsg(j.message || j.error || '');
      const r2 = await fetch('/api/compte/moi', { headers: { Authorization: `Bearer ${compteToken}` } });
      if (r2.ok) setSessionsCompte((await r2.json()).sessions || []);
    } catch {
      setExportMsg('Réseau indisponible.');
    }
  };

  const ouvrirSessionCompte = (id: string) => {
    setSessionId(id);
    setEchanges(null);
    surOuvrirSession?.(id);
  };

  const basculerHistoire = (id: string) => {
    setHistoiresOuvertes((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toutEffacer = async () => {
    if (!sessionId) return;
    await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    setEchanges([]);
    setSessionId(''); // nouvelle session anonyme au prochain échange
  };

  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center" data-testid="journal-vierge">
          <BookOpen className="h-10 w-10 mx-auto text-[--accent] mb-3" aria-hidden />
          <h2 className="text-xl font-semibold mb-2">Ton journal est encore vierge</h2>
          <p className="text-[--muted-foreground] text-sm leading-relaxed mb-4">
            Chaque échange s&apos;y inscrit automatiquement (session anonyme). Tu pourras l&apos;exporter
            en .txt, .json ou .md, l&apos;exporter vers ton compte SPU, ou tout effacer — c&apos;est ton droit, garanti.
          </p>
          {comptePseudo && sessionsCompte && sessionsCompte.length > 0 && (
            <div className="text-left border-t border-[--border]/60 pt-4 mt-2">
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4 text-[--primary]" aria-hidden /> Sessions sur ton compte ({comptePseudo})
              </p>
              <div className="space-y-2">
                {sessionsCompte.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-xl border border-[--border] p-3">
                    <Badge variant="outline" className="capitalize text-xs">{s.mode}</Badge>
                    <span className="text-xs text-[--muted-foreground] flex-1">
                      {dateHeureComplete(s.cree)} · {s.echanges} échange{s.echanges > 1 ? 's' : ''}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => ouvrirSessionCompte(s.id)} className="rounded-full h-8 text-xs">
                      Ouvrir
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <h2 className="text-xl font-semibold mr-auto">Journal de bord</h2>
        {(['txt', 'json', 'md'] as const).map((f) => (
          <Button key={f} variant="outline" size="sm" onClick={() => exporter(f)} className="rounded-full">
            <Download className="h-3.5 w-3.5 mr-1" aria-hidden /> .{f}
          </Button>
        ))}
        {compteToken && (
          <Button variant="outline" size="sm" onClick={exporterVersCompte} className="rounded-full" title="Conserver cette session sur ton compte SPU">
            <CloudUpload className="h-3.5 w-3.5 mr-1" aria-hidden /> Vers mon compte
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full text-[--destructive] border-[--destructive]/40">
              <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden /> Effacer tout
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Effacer définitivement ton journal ?</AlertDialogTitle>
              <AlertDialogDescription>
                Toutes les sessions et tous les échanges liés à cet identifiant seront supprimés de la
                base (droit à l&apos;effacement RGPD). Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={toutEffacer} className="bg-[--destructive] text-white">
                Oui, tout effacer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {exportMsg && <p className="text-xs text-[--muted-foreground] mb-4">{exportMsg}</p>}

      {/* Sessions du compte (si connecté) */}
      {comptePseudo && sessionsCompte && sessionsCompte.length > 0 && (
        <div className="mb-6 rounded-xl border border-[--border] p-4">
          <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4 text-[--primary]" aria-hidden /> Sessions sur ton compte ({comptePseudo})
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto scroll-spu">
            {sessionsCompte.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-[--border]/70 p-2.5">
                <Badge variant="outline" className="capitalize text-xs">{s.mode}</Badge>
                <span className="text-xs text-[--muted-foreground] flex-1">
                  {dateHeureComplete(s.cree)} · {s.echanges} échange{s.echanges > 1 ? 's' : ''}
                </span>
                {s.id !== sessionId && (
                  <Button size="sm" variant="outline" onClick={() => ouvrirSessionCompte(s.id)} className="rounded-full h-8 text-xs">
                    Ouvrir
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {charge && <p className="text-sm text-[--muted-foreground] respiration">Chargement du journal…</p>}
      {!charge && listeEchanges.length === 0 && (
        <Card className="p-6 text-center text-sm text-[--muted-foreground]">Aucun échange enregistré pour l&apos;instant.</Card>
      )}

      {/* Fil conversationnel : question à droite, réponse à gauche, horodatage */}
      <div className="space-y-8">
        {listeEchanges.map((e) => {
          const histoireOuverte = histoiresOuvertes.has(e.id);
          return (
            <div key={e.id} className="space-y-4" data-testid="journal-echange">
              {/* heure + mode */}
              <div className="flex items-center gap-2 text-xs text-[--muted-foreground] px-1">
                <Badge variant="outline" className="capitalize">{e.mode}{e.etape > 1 ? ` · étape ${e.etape}` : ''}</Badge>
                <span>{dateHeureComplete(e.date)}</span>
              </div>

              {/* question — bulle à droite */}
              {e.question && (
                <div className="flex justify-end">
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-br-md bg-[--primary] text-[--primary-foreground] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {e.question}
                    </div>
                    <div className="text-[11px] text-[--muted-foreground] mt-1 text-right pr-1">
                      {new Date(e.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )}

              {/* réponse — à gauche, avec avatar */}
              <div className="pl-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-7 w-7 rounded-full bg-[--primary] text-[--primary-foreground] flex items-center justify-center font-serif text-xs" aria-hidden>♠</span>
                  <span className="text-xs font-semibold text-[--muted-foreground]">SPU</span>
                  <span className="text-[11px] text-[--muted-foreground]">
                    {new Date(new Date(e.date).getTime() + 9000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="space-y-3">
                  {e.synthese && (
                    <Card className="p-4">
                      <p className="text-xs font-semibold text-[--muted-foreground] mb-1">SYNTHÈSE {e.sources.length > 0 && `(${e.sources.join(', ')})`}</p>
                      <p className="text-sm leading-relaxed">{e.synthese}</p>
                    </Card>
                  )}
                  {e.parabole && (
                    <Card className="p-4 border-[--primary]/30 bg-gradient-to-br from-[--card] to-[--accent]/15">
                      <p className="text-xs font-semibold text-[--muted-foreground] mb-1.5">PARABOLE {e.parabole.code} — {e.parabole.culture} · {e.parabole.famille}</p>
                      <blockquote className="font-serif italic border-l-2 border-[--accent] pl-3 leading-relaxed text-[15px]">« {e.parabole.enonce} »</blockquote>
                      {e.interpretation && <p className="text-sm mt-2 leading-relaxed">{e.interpretation}</p>}
                    </Card>
                  )}
                  {e.histoire && (
                    <Card className="p-4">
                      <button
                        className="flex items-center gap-1 text-xs font-semibold text-[--muted-foreground] hover:text-[--primary] transition-colors w-full"
                        onClick={() => basculerHistoire(e.id)}
                        aria-expanded={histoireOuverte}
                      >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${histoireOuverte ? 'rotate-180' : ''}`} aria-hidden />
                        HISTOIRE {histoireOuverte ? '(masquer)' : '(lire)'}
                      </button>
                      {histoireOuverte && (
                        <p className="font-serif text-[15px] leading-[1.85] whitespace-pre-line mt-3">{e.histoire}</p>
                      )}
                    </Card>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Consultation du corpus — 100 % hors-ligne via le cache du Service Worker (7.5 du cahier)
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BookOpen, Search, WifiOff } from 'lucide-react';

interface ParabolePub {
  code: string;
  texte: string;
  culture: string;
  famille: string;
  interpretations: string[];
  sources: string[];
  mode: string;
  statut: string;
}

export function VueCorpus() {
  const [paraboles, setParaboles] = useState<ParabolePub[]>([]);
  const [familles, setFamilles] = useState<{ code: string; nom: string }[]>([]);
  const [charge, setCharge] = useState(true);
  const [horsLigne, setHorsLigne] = useState(false);
  const [filtre, setFiltre] = useState('');
  const [famille, setFamille] = useState<string>('');

  useEffect(() => {
    fetch('/api/corpus')
      .then((r) => r.json())
      .then((j) => {
        setParaboles(j.paraboles || []);
        setFamilles(j.familles || []);
      })
      .catch(() => setHorsLigne(true))
      .finally(() => setCharge(false));
  }, []);

  const filtres = useMemo(() => {
    const q = filtre.trim().toLowerCase();
    return paraboles.filter(
      (p) =>
        (!famille || p.famille === famille) &&
        (!q || p.texte.toLowerCase().includes(q) || p.culture.toLowerCase().includes(q) || p.interpretations.some((i) => i.toLowerCase().includes(q)))
    );
  }, [paraboles, filtre, famille]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold flex items-center justify-center gap-2">
          <BookOpen className="h-5 w-5 text-[--primary]" aria-hidden /> Le corpus de paraboles
        </h2>
        <p className="text-sm text-[--muted-foreground] mt-1">
          {charge ? 'Chargement…' : `${filtres.length} parabole(s) — réelles, sourcées, jamais inventées par une IA.`}
        </p>
        {horsLigne && (
          <p className="text-xs text-[--secondary] mt-2 flex items-center justify-center gap-1.5">
            <WifiOff className="h-3.5 w-3.5" aria-hidden /> Hors-ligne : version en cache consultable.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[--muted-foreground]" aria-hidden />
          <Input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Rechercher un mot, une culture…" className="pl-9" aria-label="recherche dans le corpus" />
        </div>
        <button
          onClick={() => setFamille('')}
          className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${!famille ? 'bg-[--primary] text-[--primary-foreground] border-[--primary]' : 'border-[--border] hover:bg-[--muted]'}`}
        >
          Toutes
        </button>
        {familles.map((f) => (
          <button
            key={f.code}
            onClick={() => setFamille(famille === f.code ? '' : f.code)}
            className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${famille === f.code ? 'bg-[--primary] text-[--primary-foreground] border-[--primary]' : 'border-[--border] hover:bg-[--muted]'}`}
          >
            {f.code} · {f.nom}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtres.map((p) => (
          <Card key={p.code} className="p-5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs">{p.code}</Badge>
              <Badge className="text-xs bg-[--muted] text-[--muted-foreground] hover:bg-[--muted]">{p.culture}</Badge>
              <Badge className="text-xs bg-[--accent]/25 text-[--foreground] hover:bg-[--accent]/25">{p.famille}</Badge>
              {p.mode === 'enfant' && <Badge className="text-xs bg-[--secondary]/25 hover:bg-[--secondary]/25">mode enfant</Badge>}
              {p.statut === 'pending' && <Badge className="text-xs bg-[--accent]/40 hover:bg-[--accent]/40">en validation</Badge>}
            </div>
            <blockquote className="font-serif text-[17px] leading-relaxed border-l-2 border-[--accent] pl-4 mb-3">« {p.texte} »</blockquote>
            <ul className="space-y-1 mb-2">
              {p.interpretations.map((i, k) => (
                <li key={k} className="text-sm text-[--muted-foreground] leading-relaxed">— {i}</li>
              ))}
            </ul>
            {p.sources.length > 0 && (
              <div className="pt-2 border-t border-[--border]/60 text-xs text-[--muted-foreground] space-y-0.5">
                {p.sources.map((s) => (
                  <div key={s} className="break-all">
                    {s.startsWith('http') ? (
                      <a href={s} target="_blank" rel="noopener noreferrer" className="text-[--primary] hover:underline">{s}</a>
                    ) : (
                      s
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

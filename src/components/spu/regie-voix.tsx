// Régie des voix SPU — audition des 12 voix, choix du moteur (navigateur / neural local)
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Check, Loader2, Cpu, Globe, Drama } from 'lucide-react';
import { PROFILS_VOIX, profilParId, definirMoteur, moteurActuel, surChangementMoteur, ttsParler, ttsStop, type EtatMoteurVoix } from '@/lib/spu/voix';

export function RegieVoix({ compact = false }: { compact?: boolean }) {
  const [etat, setEtat] = useState<EtatMoteurVoix>({ moteur: 'navigateur', neuralDisponible: false });
  const [initialisation, setInitialisation] = useState(false);
  const [enLecture, setEnLecture] = useState<string | null>(null);

  useEffect(() => surChangementMoteur(setEtat), []);

  const basculer = async (moteur: 'navigateur' | 'neural') => {
    if (moteur === etat.moteur) return;
    ttsStop();
    if (moteur === 'neural') setInitialisation(true);
    const e = await definirMoteur(moteur);
    setInitialisation(false);
    setEtat(e);
  };

  const ecouter = (id: string) => {
    if (enLecture === id) {
      ttsStop();
      setEnLecture(null);
      return;
    }
    setEnLecture(id);
    const exemples: Record<string, string> = {
      narrateur: 'Il était une fois, au bord d une rivière tranquille, une histoire qui attendait d être racontée.',
      conteur: 'Et alors, tout doucement, la lumière du soir enveloppa le village de ses couleurs chaudes.',
      'enfant-fille': 'Tu savais que même les petites étoiles ont une histoire à raconter ? Moi, je l écoute chaque soir !',
      'enfant-garcon': 'Vite, viens voir ! La rivière a emporté le bateau que j avais construit avec des branches !',
      adolescent: 'Je ne sais pas encore ce que je veux devenir, mais je sais déjà ce qui est important pour moi.',
      'jeune-femme': 'J ai appris que demander de l aide n est pas une faiblesse, c est un courage discret.',
      'jeune-homme': 'Alors c est décidé : demain, je repars à l aube et je finis ce que j ai commencé.',
      femme: 'La patience n attend pas : elle construit, doucement, pendant que tout le monde regarde ailleurs.',
      homme: 'Un homme honnête tient sa promesse, même quand personne ne le regarde faire.',
      'vieille-dame': 'Avec les années, j ai compris une chose, mon petit : les storms passent toujours.',
      vieillard: 'Je vais te dire un secret, jeune ami : c est en tombant qu on apprend à mieux marcher.',
      sage: 'Celui qui connaît le chemin ne le décrit pas… il le montre en marchant devant toi.',
      creature: 'Renard que je suis, je sais que la ruse ouvre la porte… mais seule la confiance la laisse ouverte !',
    };
    ttsParler(exemples[id] || 'Bonjour, je suis une voix du SPU.', {
      profilId: id,
      fin: () => setEnLecture(null),
    });
  };

  return (
    <div className="space-y-4">
      {/* Choix du moteur */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Drama className="h-4 w-4 text-[--primary]" aria-hidden />
          <h3 className="font-semibold text-[15px]">Moteur de voix</h3>
          {initialisation && <Loader2 className="h-4 w-4 animate-spin text-[--muted-foreground]" aria-hidden />}
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={() => basculer('navigateur')}
            className={`text-left rounded-xl border p-4 transition-all ${etat.moteur === 'navigateur' ? 'border-[--primary] bg-[--primary]/10' : 'border-[--border] hover:border-[--primary]/50'}`}
            aria-pressed={etat.moteur === 'navigateur'}
          >
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-4 w-4 text-[--primary]" aria-hidden />
              <span className="font-medium text-sm">Voix du navigateur</span>
              {etat.moteur === 'navigateur' && <Check className="h-4 w-4 text-[--primary] ml-auto" aria-hidden />}
            </div>
            <p className="text-xs text-[--muted-foreground] leading-relaxed">Instantanée, toujours disponible, fonctionne hors ligne. 12 caractérisations distinctes.</p>
          </button>
          <button
            onClick={() => basculer('neural')}
            disabled={initialisation}
            className={`text-left rounded-xl border p-4 transition-all disabled:opacity-60 ${etat.moteur === 'neural' ? 'border-[--primary] bg-[--primary]/10' : 'border-[--border] hover:border-[--primary]/50'}`}
            aria-pressed={etat.moteur === 'neural'}
          >
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="h-4 w-4 text-[--primary]" aria-hidden />
              <span className="font-medium text-sm">Voix neurales locales</span>
              {etat.moteur === 'neural' && <Check className="h-4 w-4 text-[--primary] ml-auto" aria-hidden />}
              {initialisation && <Loader2 className="h-4 w-4 animate-spin text-[--muted-foreground] ml-auto" aria-hidden />}
            </div>
            <p className="text-xs text-[--muted-foreground] leading-relaxed">
              4 voix françaises réelles (Piper, servies par l&apos;app) transposées en 12 timbres. Premier chargement ~1 min, ensuite hors ligne.
            </p>
          </button>
        </div>
        {etat.moteur === 'neural' && !etat.neuralDisponible && (
          <p className="text-xs text-[--destructive] mt-2">
            Voix neurales indisponibles sur cet appareil — repli automatique sur les voix du navigateur.
          </p>
        )}
      </Card>

      {/* Les 12 voix */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold text-[15px]">Les 12 voix du SPU</h3>
          <Badge variant="outline" className="text-xs ml-auto">narrateur + personnages</Badge>
        </div>
        <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
          {PROFILS_VOIX.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${p.id === 'narrateur' ? 'border-[--accent] bg-[--accent]/15' : 'border-[--border]'} ${enLecture === p.id ? 'ring-2 ring-[--primary]/40' : ''}`}
            >
              <span className="text-2xl shrink-0" aria-hidden>{p.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">
                  {p.nom}
                  {p.id === 'narrateur' && <Badge className="ml-2 text-[10px] bg-[--accent]/40 text-[--foreground] hover:bg-[--accent]/40">voix principale</Badge>}
                </p>
                <p className="text-xs text-[--muted-foreground] truncate">{p.role}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full shrink-0 h-8"
                onClick={() => ecouter(p.id)}
                aria-label={`écouter la voix ${p.nom}`}
              >
                {enLecture === p.id ? <Square className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-[--muted-foreground] mt-4 leading-relaxed">
          Le SPU attribue automatiquement ces voix aux personnages de chaque histoire (âge, genre, animal, sage…)
          et garde la même voix pour le même personnage du début à la fin. Le narrateur reste toujours distinct.
        </p>
      </Card>
    </div>
  );
}

// Version réduite pour la vue enfant (audition rapide des voix principales)
export function RegieVoixCompacte() {
  const [enLecture, setEnLecture] = useState<string | null>(null);
  const ids = ['narrateur', 'enfant-fille', 'enfant-garcon', 'sage', 'creature', 'femme'];
  const ecouter = (id: string) => {
    if (enLecture === id) {
      ttsStop();
      setEnLecture(null);
      return;
    }
    setEnLecture(id);
    ttsParler(
      {
        narrateur: 'Je raconte toutes les histoires, d une voix posée et tranquille.',
        'enfant-fille': 'Bonjour ! Je suis une petite fille, et j adore les histoires !',
        'enfant-garcon': 'Salut ! Moi, je joue le petit garçon des contes !',
        sage: 'Je suis le sage. Écoute bien, et prends ton temps.',
        creature: 'Coucou ! Je suis le renard, et je parle avec ma voix à moi !',
        femme: 'Bonjour, je suis la mère dans les histoires du soir.',
      }[id] || 'Bonjour !',
      { profilId: id, fin: () => setEnLecture(null) }
    );
  };
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {ids.map((id) => {
        const p = profilParId(id);
        return (
          <button
            key={id}
            onClick={() => ecouter(id)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${enLecture === id ? 'border-[--primary] bg-[--primary]/10 text-[--primary]' : 'border-[--border] hover:bg-[--muted]'}`}
            aria-label={`écouter ${p.nom}`}
          >
            <span className="mr-1" aria-hidden>{p.emoji}</span>
            {p.nom}
          </button>
        );
      })}
    </div>
  );
}

// Réglages des voix du théâtre sonore — 10 voix locales paramétrables.
// L'utilisateur écoute chaque voix, choisit celle du narrateur et des personnages,
// ajuste le débit. Le SPU attribue automatiquement les voix pendant la lecture.
// Moteur : voix neuronales Piper (Tom, Pierre, Jessica, Siwis — hommes et femmes réelles)
// avec repli transparent sur les voix du navigateur si Piper est absent.
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { AudioLines, Play, Square, RotateCcw } from 'lucide-react';
import { useSpuStore } from '@/lib/spu/store';
import { VOIX_SPU, profilParId, ttsStop, ttsEssayer, verifierNeurales, type EtatNeurales } from '@/lib/spu/tts';

const PHRASE_ESSAI: Record<string, string> = {
  narrateur: 'Bienvenue dans le SPU. Je vais te raconter une histoire, et chaque personnage aura sa propre voix.',
  sage: 'Le vieux sage sourit doucement : la patience est une rivière qui finit toujours par tailler la pierre.',
  'vieille-femme': 'Ma grand-mère disait toujours : les maisons se réparent avec du temps et des mots doux.',
  'enfant-fille': 'Moi, quand je grandis, je veux avoir un jardin plein de fraises et un chien qui parle !',
  'enfant-garcon': 'Et puis après, le petit renard a trouvé le chemin de la maison tout seul. C\'est vrai ?',
  'femme-jeune': 'Elle marcha longtemps dans la vallée, portant sa question comme on porte une lampe.',
  'femme-mure': 'La gardienne du phare savait que les tempêtes finissent toujours par se taire.',
  'homme-jeune': 'Le jeune voyageur sortit sa carte, hésita, puis choisit le sentier de gauche.',
  'homme-mure': 'Le charpentier posa son rabot et regarda la poutre : elle était droite, enfin droite.',
  conteur: 'Au bord du feu, la voix se fait plus basse… et l\'histoire respire doucement.',
};

export function ReglagesVoix({ children }: { children: React.ReactNode }) {
  const {
    voixNarrateur, setVoixNarrateur, voixPersonnages, setVoixPersonnages, debitVoix, setDebitVoix, reinitialiserVoix,
  } = useSpuStore();
  const [essaiEnCours, setEssaiEnCours] = useState<string | null>(null);
  const [etatVoix, setEtatVoix] = useState<EtatNeurales | null>(null);

  // Détection du moteur (Piper ou navigateur) à l'ouverture du panneau.
  useEffect(() => {
    let vivant = true;
    void verifierNeurales().then((e) => {
      if (vivant) setEtatVoix(e);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const ecouter = (id: string) => {
    if (essaiEnCours === id) {
      ttsStop();
      setEssaiEnCours(null);
      return;
    }
    ttsStop();
    setEssaiEnCours(id);
    const phrase = PHRASE_ESSAI[id] || profilParId(id).nom;
    void ttsEssayer(id, phrase, debitVoix).finally(() => setEssaiEnCours(null));
  };

  const alternerPersonnage = (id: string) => {
    if (voixPersonnages.includes(id)) {
      if (voixPersonnages.length > 1) setVoixPersonnages(voixPersonnages.filter((x) => x !== id));
    } else {
      setVoixPersonnages([...voixPersonnages, id]);
    }
  };

  return (
    <Dialog onOpenChange={(ouvert) => { if (!ouvert) { ttsStop(); setEssaiEnCours(null); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto scroll-spu">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <AudioLines className="h-5 w-5 text-[--primary]" aria-hidden /> Théâtre sonore — les voix du SPU
          </DialogTitle>
          <DialogDescription>
            10 voix locales, aucune connexion requise. Écoute-les, choisis celle du narrateur, puis les voix
            des personnages (2 à 4 recommandé). Le SPU les répartit tout seul pendant l&apos;histoire.
          </DialogDescription>

          {etatVoix?.verifie && (
            <div className={`rounded-lg border px-3 py-2 text-xs ${etatVoix.disponible ? 'border-emerald-600/30 bg-emerald-600/5 text-emerald-800' : 'border-[--border] bg-[--muted] text-[--muted-foreground]'}`}>
              {etatVoix.disponible ? (
                <>
                  <span className='font-semibold'>Voix neuronales locales actives</span> — hommes et femmes réelles (Tom, Pierre, Jessica, Siwis). Moteur Piper intégré, aucune connexion nécessaire.
                </>
              ) : (
                <>
                  Voix du navigateur (repli). Pour les voix masculines réelles, lance le script <span className='font-mono'>TELECHARGER-VOIX</span> fourni avec l&apos;application.
                </>
              )}
            </div>
          )}
        </DialogHeader>

        {/* Débit global */}
        <div className="rounded-xl border border-[--border] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Débit de la lecture</span>
            <Badge variant="outline">{Math.round(debitVoix * 100)} %</Badge>
          </div>
          <Slider
            value={[debitVoix]}
            min={0.6} max={1.4} step={0.05}
            onValueChange={(v) => setDebitVoix(v[0])}
            aria-label="débit de la lecture"
          />
          <p className="text-xs text-[--muted-foreground] mt-2">Plus lent = plus contemplatif. 100 % = rythme naturel.</p>
        </div>

        {/* Liste des voix */}
        <div className="space-y-2">
          {VOIX_SPU.map((v) => {
            const estNarrateur = voixNarrateur === v.id;
            const estPersonnage = voixPersonnages.includes(v.id);
            return (
              <div
                key={v.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  estNarrateur ? 'border-[--primary] bg-[--primary]/5' : 'border-[--border] bg-[--card]'
                }`}
              >
                <span className="text-2xl shrink-0" aria-hidden>{v.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{v.nom}</p>
                  <p className="text-xs text-[--muted-foreground] leading-snug">{v.role}</p>
                  <p className="text-[11px] text-[--muted-foreground]/70 mt-0.5">
                    {etatVoix?.disponible && etatVoix.noms[v.id] ? (
                      <span className="text-emerald-700">neuronale · {etatVoix.noms[v.id]}</span>
                    ) : (
                      <>hauteur {v.pitch.toFixed(2)} · débit {v.rate.toFixed(2)}</>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm" variant="outline"
                    onClick={() => ecouter(v.id)}
                    className="h-8 rounded-full px-3 text-xs"
                    aria-label={`écouter la voix ${v.nom}`}
                  >
                    {essaiEnCours === v.id ? <Square className="h-3 w-3 mr-1" aria-hidden /> : <Play className="h-3 w-3 mr-1" aria-hidden />}
                    {essaiEnCours === v.id ? 'stop' : 'écouter'}
                  </Button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setVoixNarrateur(v.id)}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                        estNarrateur ? 'bg-[--primary] text-[--primary-foreground] border-[--primary]' : 'border-[--border] hover:bg-[--muted]'
                      }`}
                      aria-pressed={estNarrateur}
                    >
                      narrateur
                    </button>
                    <button
                      onClick={() => alternerPersonnage(v.id)}
                      className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                        estPersonnage ? 'bg-[--secondary] text-[--secondary-foreground] border-[--secondary]' : 'border-[--border] hover:bg-[--muted]'
                      }`}
                      aria-pressed={estPersonnage}
                    >
                      personnage
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-[--muted-foreground]">
            Personnages parlants : {voixPersonnages.map((id) => profilParId(id).nom).join(', ') || '—'}
          </p>
          <Button variant="ghost" size="sm" onClick={reinitialiserVoix} className="rounded-full text-xs">
            <RotateCcw className="h-3 w-3 mr-1" aria-hidden /> Réinitialiser
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

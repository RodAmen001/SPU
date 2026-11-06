// Pages Transparence (13.3) et Confidentialité / RGPD (7.6)
'use client';

import { Card } from '@/components/ui/card';
import { ShieldCheck, Eye, Scale, Users, HeartHandshake } from 'lucide-react';

export function VueTransparence() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Eye className="h-5 w-5 text-[--primary]" aria-hidden /> Transparence — comment je fonctionne
      </h2>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Mes sources d&apos;intelligence (consultées en parallèle)</h3>
        <ul className="space-y-2.5 text-sm leading-relaxed">
          <li><span className="font-medium">Recherche web intégrée</span> — résultats de recherche actuels, extraits sourcés.</li>
          <li><span className="font-medium">Une intelligence réflexive (LLM)</span> — éclairage bref, neutre, sans conseil personnalisé.</li>
          <li><span className="font-medium">Encyclopédie (Wikipédia)</span> — contexte encyclopédique vérifiable.</li>
          <li><span className="font-medium">DuckDuckGo Instant Answers</span> — définitions et références rapides.</li>
        </ul>
        <p className="text-xs text-[--muted-foreground] mt-3 leading-relaxed">
          Chaque source répond dans un délai strict de 8 secondes. Si toutes échouent, je te le dis
          honnêtement au lieu d&apos;inventer. Les réponses sont mises en cache 24 h par empreinte de question
          pour limiter les appels externes.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Ma méthodologie de synthèse</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed">
          <li>Je détecte d&apos;abord toute détresse (avant tout appel externe) — si c&apos;est le cas, je cesse tout et je te donne des contacts humains.</li>
          <li>Je consulte 1 à 5 sources en parallèle et je synthétise en 3 phrases maximum, sans prendre position, avec citation des sources.</li>
          <li>Je recherche dans mon corpus clos la parabole réelle la plus proche (similarité vectorielle + arbitrage sémantique, seuil de qualité 0,65).</li>
          <li>Je génère une histoire personnalisée, filtrée (aucune violence, aucune haine, rien d&apos;inapproprié).</li>
          <li>Je te rends la parole avec une question ouverte — jamais de conclusion à ta place.</li>
        </ol>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Mes limites connues</h3>
        <ul className="space-y-2 text-sm leading-relaxed">
          <li>• Je ne suis <span className="font-medium">ni médecin, ni psychologue, ni avocat, ni conseiller financier</span>.</li>
          <li>• Ma synthèse est un <span className="font-medium">miroir, pas une vérité absolue</span> — les sources peuvent se contredire, je le signale alors.</li>
          <li>• Mon corpus compte aujourd&apos;hui <span className="font-medium">50 paraboles adultes + 15 contes enfants</span>, toutes réelles et sourcées ; il s&apos;étend par lots validés.</li>
          <li>• Quand aucune parabole n&apos;atteint mon seuil de qualité, je te le dis et je propose la plus proche, clairement signalée.</li>
          <li>• Je ne peux pas fonctionner sans connexion pour la partie intelligence ; le corpus reste consultable hors-ligne.</li>
        </ul>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">Mes engagements éthiques</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="flex gap-2"><HeartHandshake className="h-4 w-4 text-[--primary] shrink-0 mt-0.5" aria-hidden /><span>Je suis un mentor, pas un maître : je ne décide jamais à ta place.</span></div>
          <div className="flex gap-2"><ShieldCheck className="h-4 w-4 text-[--primary] shrink-0 mt-0.5" aria-hidden /><span>Les cas de détresse ne quittent jamais le système (aucun tiers, logs anonymisés).</span></div>
          <div className="flex gap-2"><Users className="h-4 w-4 text-[--primary] shrink-0 mt-0.5" aria-hidden /><span>Le mode Enfant est un espace séparé, basé sur le domaine public uniquement.</span></div>
          <div className="flex gap-2"><Scale className="h-4 w-4 text-[--primary] shrink-0 mt-0.5" aria-hidden /><span>Chaque parabole est attribuée avec respect à sa culture d&apos;origine.</span></div>
        </div>
      </Card>
    </div>
  );
}

export function VueConfidentialite() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[--primary]" aria-hidden /> Confidentialité &amp; RGPD
      </h2>

      <Card className="p-6 space-y-4 text-sm leading-relaxed">
        <div>
          <h3 className="font-semibold mb-1">Aucune donnée personnelle collectée sans consentement</h3>
          <p>Sessions <span className="font-medium">anonymes par défaut</span> : un identifiant aléatoire vit uniquement dans ton navigateur. Aucune inscription, aucun email, aucun compte.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Droit à l&apos;effacement</h3>
          <p>Le bouton « Effacer tout » du journal supprime <span className="font-medium">immédiatement et définitivement</span> ta session et tous tes échanges de la base.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Droit à la portabilité</h3>
          <p>Exporte ton journal à tout moment en .txt, .json ou .md — c&apos;est le tien.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Purge automatique</h3>
          <p>Les sessions inactives sont purgées après <span className="font-medium">90 jours</span>. Les logs techniques ne sont conservés que 30 jours maximum.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Détresse : confidentialité renforcée</h3>
          <p>Aucune donnée de détresse n&apos;est envoyée à un tiers. Seul subsiste un log anonymisé (empreinte + horodatage, aucun texte) pour mesurer la santé du système.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Mineurs</h3>
          <p>Le mode Enfant ne stocke <span className="font-medium">aucune donnée personnelle</span> sur les mineurs sans consentement parental explicite.</p>
        </div>
        <div>
          <h3 className="font-semibold mb-1">Ce qui part vers l&apos;extérieur</h3>
          <p>Seule ta <span className="font-medium">question</span> (sans identifiant, sans adresse IP) est transmise aux sources d&apos;intelligence pour produire la synthèse — jamais ton journal, jamais ta session.</p>
        </div>
      </Card>
    </div>
  );
}

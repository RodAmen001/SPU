// Pages Transparence (13.3), Confidentialité / RGPD (7.6),
// Comment fonctionne le SPU (v4.8), Quoi de neuf + historique (v4.8),
// Soutenir le concepteur (v4.8).
'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Eye, Scale, Users, HeartHandshake, Compass, Newspaper, Volume2, Music4, Mail, Phone, Leaf, BookOpen, Sparkles, History } from 'lucide-react';
import { VERSION_SPU } from '@/lib/spu/constants';
import { VERSIONS } from '@/data/versions';

// ── v4.8 — « Comment fonctionne le SPU » (onglet dédié, exigence du concepteur) ──
export function VueFonctionnement() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Compass className="h-5 w-5 text-[--primary]" aria-hidden /> Comment fonctionne le SPU
      </h2>

      <Card className="p-6">
        <p className="text-[15px] leading-relaxed">
          Je consulte plusieurs sources d&apos;intelligence et de recherche, je synthétise leurs réponses,
          puis je te propose une <span className="font-medium">parabole réelle et sourcée</span> et une histoire
          écrite pour toi. Une <span className="font-medium">parabole et son interprétation sont choisies pour
          refléter la synthèse</span> — et si aucune des 65 paraboles du corpus ne convient efficacement,
          je vais chercher en ligne une parabole <span className="font-medium">réelle et traditionnelle</span> (jamais
          inventée), avec sa source vérifiée par une encyclopédie et une interprétation tournée vers ta
          synthèse. Une miroir narratif — jamais une vérité absolue.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline" className="rounded-full">🎭 10 voix locales</Badge>
          <Badge variant="outline" className="rounded-full">🎵 51 musiques libres, variées</Badge>
          <Badge variant="outline" className="rounded-full">📖 65 paraboles sourcées</Badge>
          <Badge variant="outline" className="rounded-full">🔒 sans clé API</Badge>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-[--primary]" aria-hidden /> Ta réponse est entièrement lue — pour te détendre
        </h3>
        <p className="text-sm leading-relaxed text-[--muted-foreground]">
          Tu passes une trentaine de secondes à écrire quelques lignes ; le SPU te répond avec un grand
          nombre de lignes — en lire toutes prendrait environ cinq minutes avant de poser ta question
          suivante. Pour te offrir une vraie détente, <span className="font-medium text-[--foreground]">toute la
          réponse écrite est complètement lue, narrée ou jouée en théâtre audio</span> : la parabole, son
          interprétation, l&apos;histoire et la mise en perspective, portées par les voix du théâtre sonore.
          Ferme les yeux, écoute — la réponse vient à toi.
        </p>
        <p className="text-sm leading-relaxed mt-3">
          <span className="font-medium">La narration est activée par défaut.</span> Tu préfères lire ? Un
          bouton dans le menu te permet de la désactiver — et de la réactiver quand tu veux. Le volume de
          la musique, la vitesse de lecture et le choix des voix se règlent aussi depuis l&apos;en-tête.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Music4 className="h-4 w-4 text-[--primary]" aria-hidden /> Une musique variée, jamais monotone
        </h3>
        <p className="text-sm leading-relaxed text-[--muted-foreground]">
          Chaque mode a son ambiance (majestueuse pour l&apos;Oracle, chaleureuse pour le Mentor, profonde
          pour Deep, espiègle pour l&apos;Enfant) et puise dans <span className="font-medium text-[--foreground]">51
          musiques libres de droits</span> — la piste change au fil de tes conversations, et une musique
          distincte accompagne chaque réponse. Tu peux couper le son à tout moment, et quitter
          l&apos;application proprement avec le bouton <span className="font-medium text-[--foreground]">Quitter</span> du
          menu.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-3">La promesse, en une phrase</h3>
        <p className="text-sm leading-relaxed flex items-center gap-2">
          <Leaf className="h-4 w-4 text-[--secondary]" aria-hidden />
          <span>Un mentor, pas un maître — je ne décide jamais à ta place.</span>
        </p>
      </Card>
    </div>
  );
}

// ── v4.8 — « Quoi de neuf » : nouveautés + historique COMPLET des versions ──
export function VueNouveautes() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Newspaper className="h-5 w-5 text-[--primary]" aria-hidden /> Quoi de neuf
      </h2>

      <Card className="p-6 border-[--primary]/40">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-[--primary]" aria-hidden />
          <h3 className="font-semibold">Version actuelle — v{VERSION_SPU}</h3>
          <Badge className="ml-auto rounded-full">à jour</Badge>
        </div>
        <ul className="space-y-1.5 text-sm text-[--muted-foreground] leading-relaxed list-disc pl-4">
          <li>Une <span className="font-medium text-[--foreground]">barre de menu</span> réunit désormais tout : fonctionnement, nouveautés, journal, corpus, transparence, RGPD et soutien.</li>
          <li><span className="font-medium text-[--foreground]">Narration activée par défaut</span> — toute la réponse est lue comme un théâtre audio ; un bouton permet de la désactiver.</li>
          <li><span className="font-medium text-[--foreground]">51 musiques libres</span> variées au fil des conversations (fin de la monotonie), avec arrêt du son et bouton de sortie.</li>
          <li><span className="font-medium text-[--foreground]">Paraboles orientées vers la synthèse</span> — et repli en ligne vers une parabole réelle sourcée quand le corpus ne suffit pas.</li>
        </ul>
        <p className="text-xs text-[--muted-foreground]/80 mt-3">
          Si cette page affiche encore une ancienne version, ferme-la puis rouvre-la (ou recharge avec
          Ctrl+Shift+R) : la mise à jour s&apos;appliquera aussitôt.
        </p>
      </Card>

      <div className="flex items-center gap-2 pt-2">
        <History className="h-4 w-4 text-[--muted-foreground]" aria-hidden />
        <h3 className="font-semibold text-[15px]">L&apos;historique des versions, depuis la création</h3>
      </div>

      {VERSIONS.map((v) => (
        <Card key={v.version} className={`p-5 ${v.actuelle ? 'border-[--primary]/30' : ''}`}>
          <div className="flex flex-wrap items-baseline gap-2 mb-2">
            <span className="font-serif font-bold text-[--primary]">{v.version}</span>
            <span className="text-xs text-[--muted-foreground]">{v.date}</span>
            <span className="text-sm font-medium">{v.titre}</span>
          </div>
          <ul className="space-y-1 text-sm text-[--muted-foreground] leading-relaxed list-disc pl-4">
            {v.points.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Card>
      ))}

      <Card className="p-5">
        <p className="text-sm leading-relaxed flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[--primary] shrink-0" aria-hidden />
          <span>
            Le détail de l&apos;architecture, des corpus et des choix éthiques est raconté dans le{' '}
            <a href="/LIVRE-BLANC-SPU-v4.4-2026-11-06.md" target="_blank" rel="noreferrer" className="text-[--primary] underline underline-offset-2">livre blanc</a>{' '}
            embarqué dans l&apos;application.
          </span>
        </p>
      </Card>
    </div>
  );
}

// ── v4.8 — « Soutenir le concepteur » ──────────────────────────────────────────
export function VueSoutien() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <HeartHandshake className="h-5 w-5 text-[--primary]" aria-hidden /> Soutenir le concepteur
      </h2>

      <Card className="p-6">
        <p className="text-sm leading-relaxed text-[--muted-foreground]">
          Le SPU est une œuvre indépendante, pensée, écrite et maintenue par un concepteur passionné :
          corpus rassemblé et sourcé, voix du théâtre sonore, musique libre, éthique du mentor — tout
          cela vit grâce à du temps donné. Si l&apos;application t&apos;a éclairé ou apaisé, un mot
          d&apos;encouragement, un retour d&apos;expérience ou un soutien matériel l&apos;aident à
          continuer de faire grandir le corpus et les voix.
        </p>
        <div className="mt-4 space-y-2.5 text-sm">
          <p className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[--primary] shrink-0" aria-hidden />
            <span>
              Écrire au concepteur :{' '}
              <a href="mailto:ramenyido@gmail.com" className="text-[--primary] underline underline-offset-2">ramenyido@gmail.com</a>
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-[--primary] shrink-0" aria-hidden />
            <span>
              Téléphone / WhatsApp :{' '}
              <a href="tel:+22893643641" className="text-[--primary] underline underline-offset-2">00228 9-364-364-1</a>
            </span>
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-2">Ce que ton soutien fait grandir</h3>
        <ul className="space-y-1.5 text-sm leading-relaxed list-disc pl-4 text-[--muted-foreground]">
          <li>Le corpus : de nouvelles paraboles réelles, sourcées et vérifiées (50 adultes + 15 contes aujourd&apos;hui).</li>
          <li>Les voix : de nouvelles voix neuronales pour le théâtre sonore.</li>
          <li>La diffusion : rendre le SPU accessible dans plus de langues et plus de foyers.</li>
        </ul>
        <p className="text-sm leading-relaxed mt-4 flex items-center gap-2">
          <Leaf className="h-4 w-4 text-[--secondary]" aria-hidden />
          <span className="font-medium">Un mentor, pas un maître — et toujours un merci sincère. 🌿</span>
        </p>
      </Card>
    </div>
  );
}

// ── Transparence (13.3) ────────────────────────────────────────────────────────
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

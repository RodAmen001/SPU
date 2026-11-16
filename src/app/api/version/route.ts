import { NextResponse } from 'next/server';
import { VERSION_SPU } from '@/lib/spu/constants';

export const dynamic = 'force-dynamic';

// Point de contrôle de versions pour SPU Pocket (APK Android).
// L'APK interroge {serveur}/api/version pour signaler les améliorations
// disponibles sans réinstallation silencieuse : l'utilisateur voit
// toujours clairement quelles nouveautés existent et où les obtenir.
export async function GET() {
  return NextResponse.json(
    {
      app: 'SPU Pocket',
      apk: { version: '1.3.0', code: 4 },
      serveur: { version: VERSION_SPU, nom: 'Système Parabolique Universel' },
      ameliorations: true,
      note: 'Le SPU évolue régulièrement : nouvelles paraboles, voix enrichies, mode création. Reviens sur ta page de distribution pour récupérer la dernière version de l\'application.',
      nouveautes: [
        'v1.3 — corpus porté à 100 textes (75 paraboles + 25 fables, même base que le serveur) et ORACLE INVERSÉ hors ligne : une parabole nue, ta lecture analysée (appréciation, bonne interprétation, éclairages, orientation)',
        'v1.2 — mode nomade : pose tes questions sans aucun serveur, réponse directe 🌤️',
        'Web v6.4 — noter la musique sans quitter ta conversation (cadre adjacent + retour en arrière) ; le BOOST gravé en un seul MP3 serveur avec voix distinctes garanties, didascalies parlées et revue IA du rendu',
        'Web v6.3 — lecture qui démarre sans attendre (voix préchauffées), cadre musique pour noter chaque piste (note globale remontée au SPU), BOOST joué comme une scène réelle : voix préparées à l\'avance, conteur qui annonce chaque personnage',
        'Web v6.2 — le théâtre BOOST est toujours proposé après la 3ᵉ question du Mentor (préparé en coulisses, joué seulement si tu le décides)',
        'Web v6.1 — narration continue sans silences, bouton « Musique suivante » toujours visible, mode Enfant en fil continu (jamais de nouvelle discussion obligatoire)',
        'À venir — le BOOST jouable via un serveur SPU connecté, voix neuronales enrichies, mode communautaire',
      ],
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

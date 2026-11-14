import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Point de contrôle de versions pour SPU Pocket (APK Android).
// L'APK interroge {serveur}/api/version pour signaler les améliorations
// disponibles sans réinstallation silencieuse : l'utilisateur voit
// toujours clairement quelles nouveautés existent et où les obtenir.
export async function GET() {
  return NextResponse.json(
    {
      app: 'SPU Pocket',
      apk: { version: '1.2.0', code: 3 },
      serveur: { version: '4.8', nom: 'Système Parabolique Universel' },
      ameliorations: true,
      note: 'Le SPU évolue régulièrement : nouvelles paraboles, voix enrichies, mode création. Reviens sur ta page de distribution pour récupérer la dernière version de l\'application.',
      nouveautes: [
        'v4.8 — barre de menu complète, narration activée par défaut (bouton pour la couper), 51 musiques libres variées, bouton de sortie, paraboles orientées vers la synthèse avec repli en ligne sourcé, écrans modernisés, historique des versions',
        'v4.7 — grande fluidité : réponse plafonnée à 90 s, parabole recherchée pendant la consultation des sources, histoire et perspective en parallèle',
        'v4.6 — horodatage complet de toutes les conversations (date + heure) + serveur plus résilient',
        'v1.2 — mode nomade : pose tes questions sans aucun serveur, réponse directe 🌤️',
        'v1.1 — écran « Poser une question » avec serveur : synthèse sourcée, parabole, histoire',
        'À venir — paraboles mensuelles, voix enrichies, mode communautaire',
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

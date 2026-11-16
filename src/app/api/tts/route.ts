// GET  /api/tts — capacités du moteur de voix (neuronales locales ou navigateur)
// POST /api/tts — génère le WAV d'un segment pour un profil de voix du SPU
// v6.0 — les voix manquantes sont téléchargées À LA DEMANDE depuis le cloud du
// concepteur (Hugging Face : Rodamen/spu-voix) puis servies 100 % local.
import { NextRequest, NextResponse } from 'next/server';
import { etatNeurales, genererVoix, voixDisponibles, nomHumainModele, prechargerVoixCloud } from '@/lib/spu/voix-neurales';

export const dynamic = 'force-dynamic';

export async function GET() {
  let disponible = etatNeurales();
  if (!disponible) disponible = await prechargerVoixCloud();
  if (!disponible) {
    return NextResponse.json({ disponible: false, moteur: 'navigateur', raison: 'Moteur Piper non installé — repli sur les voix du navigateur.' });
  }
  const disponibles = voixDisponibles();
  const nommes: Record<string, string | null> = {};
  for (const [profilId, v] of Object.entries(disponibles)) {
    nommes[profilId] = v ? nomHumainModele(v.modele, v.locuteur) : null;
  }
  return NextResponse.json({ disponible: true, moteur: 'piper', voix: disponibles, noms: nommes });
}

export async function POST(req: NextRequest) {
  const corps = (await req.json().catch(() => ({}))) as { voix?: string; texte?: string; debit?: number };
  if (!corps.voix || !corps.texte) {
    return NextResponse.json({ error: 'Paramètres « voix » et « texte » requis.' }, { status: 400 });
  }
  if (!etatNeurales()) {
    await prechargerVoixCloud(); // première utilisation : les voix descendent du cloud
  }
  if (!etatNeurales()) {
    return NextResponse.json({ disponible: false }, { status: 503 });
  }
  try {
    const wav = await genererVoix(String(corps.voix), String(corps.texte), Number(corps.debit) || 1);
    if (!wav) {
      return NextResponse.json({ disponible: false }, { status: 503 });
    }
    return new NextResponse(new Uint8Array(wav), {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'private, max-age=3600',
        'X-Voix-Source': 'piper',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Génération de voix impossible.' }, { status: 500 });
  }
}

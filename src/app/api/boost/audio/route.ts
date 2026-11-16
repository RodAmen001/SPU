// ═════════════════════════════════════════════════════════════════════════════
// v6.4 — /api/boost/audio : la conversion COMPLÈTE du scénario BOOST en un seul
// MP3 côté serveur, avec des voix distinctes garanties (une génération Piper à
// la fois, délais élargis) et une REVUE IA du rendu (ASR + correction).
//   POST { scenario }            → lance le job (réponse immédiate : { pret, id, etat })
//   GET ?id=…                    → état du job { etat, fait, total, phase, mp3?, manifest?, revue? }
//   GET ?id=…&format=mp3         → le MP3 complet du théâtre (audio/mpeg)
// ═════════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { lancerConversion, etatJob, fichierMp3 } from '@/lib/spu/boost-audio';
import type { ScenarioBoost } from '@/lib/spu/boost';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const corps = (await req.json().catch(() => null)) as { scenario?: ScenarioBoost } | null;
  const scenario = corps?.scenario;
  if (!scenario || !scenario.scenes?.length || !scenario.personnages?.length) {
    return NextResponse.json({ error: 'Scénario BOOST requis.' }, { status: 400 });
  }
  const job = lancerConversion(scenario);
  return NextResponse.json({
    id: job.id,
    etat: job.etat,
    fait: job.fait,
    total: job.total,
    phase: job.phase,
    mp3: job.mp3,
    manifest: job.manifest,
    revue: job.revue,
  });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) {
    return NextResponse.json({ error: 'id du job requis.' }, { status: 400 });
  }
  // MP3 directement (le client met cette URL dans <audio src>)
  if (req.nextUrl.searchParams.get('format') === 'mp3') {
    const chemin = fichierMp3(id);
    if (!chemin) return NextResponse.json({ error: 'MP3 pas encore prêt.' }, { status: 404 });
    const tampon = await readFile(chemin);
    return new NextResponse(new Uint8Array(tampon), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'private, max-age=3600',
        'Accept-Ranges': 'none',
      },
    });
  }
  const job = etatJob(id);
  if (!job) return NextResponse.json({ etat: 'echec', erreur: 'job inconnu — relance la conversion' }, { status: 404 });
  return NextResponse.json({
    id: job.id,
    etat: job.etat,
    fait: job.fait,
    total: job.total,
    phase: job.phase,
    erreur: job.erreur,
    mp3: job.mp3,
    manifest: job.manifest,
    revue: job.revue,
  });
}

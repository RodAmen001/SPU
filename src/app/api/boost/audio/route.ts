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
import { lancerConversion, etatJob, fichierMp3, scenarioValidePourGravure } from '@/lib/spu/boost-audio';
import { reponse429, verifierDebit } from '@/lib/spu/rate-limit';
import { db } from '@/lib/db';
import type { ScenarioBoost } from '@/lib/spu/boost';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // v6.6 — garde anti-saturation (audit §B1 : 5 lancements/min/IP) + LE SCÉNARIO
  // VIENT TOUJOURS DE LA BASE (audit §B2) : le client identifie l'échange, le
  // serveur relit le scénario qu'IL a écrit lui-même — plus aucun « calcul
  // gratuit » possible avec un scénario arbitraire.
  const debit = verifierDebit(req, 'boost-audio');
  if (!debit.ok) return reponse429(debit.attenteMs);
  const corps = (await req.json().catch(() => null)) as { echangeId?: string; sessionId?: string; scenario?: ScenarioBoost } | null;
  const echangeId = String(corps?.echangeId || '');
  const sessionId = String(corps?.sessionId || '');
  let scenario: ScenarioBoost | null = null;
  try {
    if (sessionId && echangeId) {
      // mode Enfant : le théâtre prêt est stocké dans boostState de la session
      const session = await db.session.findUnique({ where: { id: sessionId }, select: { boostState: true } });
      const b = session?.boostState
        ? (JSON.parse(session.boostState) as { pret?: { scenario?: ScenarioBoost; echangeId?: string } })
        : null;
      if (b?.pret?.scenario && b.pret.echangeId === echangeId) scenario = b.pret.scenario;
    } else if (echangeId) {
      // mode Mentor : le théâtre prêt est stocké dans le payload de l'échange
      const echange = await db.echange.findUnique({ where: { id: echangeId }, select: { payload: true } });
      const p = echange?.payload ? (JSON.parse(echange.payload) as { type?: string; scenario?: ScenarioBoost }) : null;
      if (p?.type === 'mentor-boost-pret' && p.scenario) scenario = p.scenario;
    }
  } catch (e) {
    console.error('[api/boost/audio] relecture du scénario en base :', e instanceof Error ? e.message : e);
  }
  if (!scenario || !scenarioValidePourGravure(scenario)) {
    return NextResponse.json(
      { error: 'Aucun scénario BOOST connu en base pour cet échange — relance un dialogue de 3 requêtes, le théâtre sera proposé à nouveau.' },
      { status: 403 }
    );
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

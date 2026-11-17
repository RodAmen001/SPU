// ═════════════════════════════════════════════════════════════════════════════
// v6.2 — GET /api/boost : le client RÉCUPÈRE le scénario BOOST préparé en
// arrière-plan (polling léger, 1 requête toutes les quelques secondes).
//   ?echangeId=…  → BOOST du mode Mentor (stocké dans le payload de l'échange)
//   ?sessionId=…&echangeId=…  → BOOST du mode Enfant (stocké dans boostState,
//     rattaché à l'échange qui l'a demandé — jamais de vieux théâtre ressorti)
// Réponse : { pret: true, scenario } | { pret: false } | { pret: false, echec: true }
// ═════════════════════════════════════════════════════════════════════════════
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const echangeId = req.nextUrl.searchParams.get('echangeId') || '';
  const sessionId = req.nextUrl.searchParams.get('sessionId') || '';
  try {
    // ── v6.6 — RESTAURATION (audit §C3) : retour sur la vue Mentor ──
    // ?sessionId=… (sans echangeId) : on ressort l'état du dernier dialogue
    // Mentor de la session — théâtre prêt, échec, ou préparation en cours —
    // pour que le BOOST soit TOUJOURS réclamé, même après avoir quitté la vue.
    if (sessionId && !echangeId) {
      const recents = await db.echange.findMany({
        where: { sessionId, mode: 'mentor', payload: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, payload: true },
      });
      for (const e of recents) {
        const p = JSON.parse(e.payload || '{}') as { type?: string; scenario?: unknown };
        if (p.type === 'mentor-boost-pret' && p.scenario) {
          return Response.json({ pret: true, scenario: p.scenario, echangeId: e.id });
        }
        if (p.type === 'mentor-boost-echec') return Response.json({ pret: false, echec: true, echangeId: e.id });
        if (p.type === 'mentor-synthese') return Response.json({ pret: false, enPreparation: true, echangeId: e.id });
      }
      return Response.json({ pret: false });
    }
    // ── Mentor : le BOOST est stocké dans le payload de l'échange de synthèse ──
    if (echangeId && !sessionId) {
      const echange = await db.echange.findUnique({ where: { id: echangeId }, select: { payload: true } });
      if (!echange?.payload) return Response.json({ pret: false });
      const p = JSON.parse(echange.payload) as { type?: string; scenario?: unknown };
      if (p.type === 'mentor-boost-pret' && p.scenario) return Response.json({ pret: true, scenario: p.scenario });
      if (p.type === 'mentor-boost-echec') return Response.json({ pret: false, echec: true });
      return Response.json({ pret: false }); // en cours de préparation
    }
    // ── Enfant : le BOOST est stocké dans boostState de la session ──
    if (sessionId && echangeId) {
      const session = await db.session.findUnique({ where: { id: sessionId }, select: { boostState: true } });
      if (!session?.boostState) return Response.json({ pret: false });
      const b = JSON.parse(session.boostState) as { pret?: { scenario?: unknown; echangeId?: string } };
      if (b.pret?.scenario && b.pret.echangeId === echangeId) return Response.json({ pret: true, scenario: b.pret.scenario });
      return Response.json({ pret: false });
    }
  } catch (e) {
    console.error('[api/boost]', e instanceof Error ? e.message : e);
  }
  return Response.json({ pret: false });
}

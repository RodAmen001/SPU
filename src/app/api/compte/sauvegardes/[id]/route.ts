// GET    /api/compte/sauvegardes/[id] — télécharge un instantané (txt/json/md)
// DELETE /api/compte/sauvegardes/[id] — supprime un instantané
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { utilisateurDeReq } from '@/lib/spu/compte';
import { formaterJournal, type EchangeExport } from '@/lib/spu/export-format';

async function charger(req: NextRequest, id: string) {
  const compte = await utilisateurDeReq(req);
  if (!compte) return { erreur: NextResponse.json({ error: 'Non connecté' }, { status: 401 }) };
  const sauvegarde = await db.sauvegarde.findUnique({ where: { id } });
  if (!sauvegarde || sauvegarde.compteId !== compte.id) {
    return { erreur: NextResponse.json({ error: 'Sauvegarde introuvable' }, { status: 404 }) };
  }
  return { sauvegarde };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await charger(req, id);
  if (r.erreur) return r.erreur;
  try {
    const donnees = JSON.parse(r.sauvegarde!.payload) as { echanges: EchangeExport[]; mode?: string };
    const fmt = (req.nextUrl.searchParams.get('format') || 'json') as 'txt' | 'json' | 'md';
    const { corps, type } = formaterJournal(donnees.echanges || [], ['txt', 'json', 'md'].includes(fmt) ? fmt : 'json', { mode: donnees.mode });
    return new NextResponse(corps, {
      headers: {
        'Content-Type': `${type}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="spu-compte-${id.slice(0, 8)}.${fmt}"`,
      },
    });
  } catch (err) {
    console.error('[api/compte/sauvegardes/id]', err);
    return NextResponse.json({ error: 'Sauvegarde illisible' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const r = await charger(req, id);
  if (r.erreur) return r.erreur;
  await db.sauvegarde.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

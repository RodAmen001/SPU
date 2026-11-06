// GET /api/compte/sauvegardes — liste les instantanés du compte
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { utilisateurDeReq } from '@/lib/spu/compte';

export async function GET(req: NextRequest) {
  const compte = await utilisateurDeReq(req);
  if (!compte) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
  const sauvegardes = await db.sauvegarde.findMany({
    where: { compteId: compte.id },
    orderBy: { createdAt: 'desc' },
    select: { id: true, titre: true, mode: true, nbEchanges: true, createdAt: true },
  });
  return NextResponse.json({ sauvegardes });
}

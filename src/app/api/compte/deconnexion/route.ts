// POST /api/compte/deconnexion — Révoque le token courant
import { NextResponse } from 'next/server';
import { revoquerToken, extraireToken } from '@/lib/spu/compte';

export async function POST(req: Request) {
  revoquerToken(extraireToken(req));
  return NextResponse.json({ ok: true });
}

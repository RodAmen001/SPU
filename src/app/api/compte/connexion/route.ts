// POST /api/compte/connexion — Connexion au compte SPU {pseudo, motDePasse}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifierMotDePasse, creerToken, verifierLimiteAuth } from '@/lib/spu/compte';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!verifierLimiteAuth(`connexion:${ip}`)) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessaie dans un instant.' }, { status: 429 });
    }
    const { pseudo, motDePasse } = (await req.json()) as { pseudo?: string; motDePasse?: string };
    const p = (pseudo || '').trim();
    if (!p || !motDePasse) {
      return NextResponse.json({ error: 'Pseudo et mot de passe requis.' }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { pseudo: p } });
    if (!user || !verifierMotDePasse(motDePasse, user.motDePasseHash)) {
      return NextResponse.json({ error: 'Pseudo ou mot de passe incorrect.' }, { status: 401 });
    }
    db.user.update({ where: { id: user.id }, data: { dernierAcces: new Date() } }).catch(() => {});
    return NextResponse.json({ token: creerToken(user.id), utilisateur: { pseudo: user.pseudo } });
  } catch (err) {
    console.error('[api/compte/connexion]', err);
    return NextResponse.json({ error: 'La connexion a échoué' }, { status: 500 });
  }
}

// POST /api/compte/inscrire — Créer un compte SPU {pseudo, motDePasse}
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashMotDePasse, pseudoValide, motDePasseValide, creerToken, verifierLimiteAuth } from '@/lib/spu/compte';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    if (!verifierLimiteAuth(`inscrire:${ip}`)) {
      return NextResponse.json({ error: 'Trop de tentatives. Réessaie dans un instant.' }, { status: 429 });
    }
    const { pseudo, motDePasse } = (await req.json()) as { pseudo?: string; motDePasse?: string };
    const p = (pseudo || '').trim();
    if (!pseudoValide(p)) {
      return NextResponse.json({ error: 'Pseudo invalide : 3 à 24 caractères (lettres, chiffres, _ - .).' }, { status: 400 });
    }
    if (!motDePasseValide(motDePasse || '')) {
      return NextResponse.json({ error: 'Mot de passe invalide : 6 caractères minimum.' }, { status: 400 });
    }
    const existant = await db.user.findUnique({ where: { pseudo: p }, select: { id: true } });
    if (existant) {
      return NextResponse.json({ error: 'Ce pseudo est déjà pris. Choisis-en un autre.' }, { status: 409 });
    }
    const user = await db.user.create({
      data: { pseudo: p, motDePasseHash: hashMotDePasse(motDePasse!) },
      select: { id: true, pseudo: true },
    });
    return NextResponse.json({ token: creerToken(user.id), utilisateur: { pseudo: user.pseudo } });
  } catch (err) {
    console.error('[api/compte/inscrire]', err);
    return NextResponse.json({ error: "La création du compte a échoué" }, { status: 500 });
  }
}

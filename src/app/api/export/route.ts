// POST /api/export — Export du journal (.txt / .json / .md) — Partie 6.2 du cahier
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { FAMILLES } from '@/lib/spu/constants';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, format } = (await req.json()) as { sessionId?: string; format?: string };
    if (!sessionId) return NextResponse.json({ error: 'sessionId requis' }, { status: 400 });
    const fmt = ['txt', 'json', 'md'].includes(format || '') ? format : 'txt';

    const session = await db.session.findUnique({
      where: { id: sessionId },
      include: {
        echanges: {
          orderBy: { createdAt: 'asc' },
          include: { parabole: { select: { code: true, texte: true, culture: true, famille: true } } },
        },
      },
    });
    if (!session || !session.echanges.length) {
      return NextResponse.json({ error: 'Journal introuvable ou vide' }, { status: 404 });
    }

    const horodatage = new Date().toISOString();
    const echanges = session.echanges.map((e) => ({
      id: e.id,
      date: e.createdAt.toISOString(),
      mode: e.mode,
      etape: e.etape,
      question: e.question,
      synthese: e.synthese,
      sources: (() => { try { return JSON.parse(e.sourcesReponse || '[]'); } catch { return []; } })(),
      parabole: e.parabole ? {
        code: e.parabole.code,
        enonce: e.parabole.texte,
        culture: e.parabole.culture,
        famille: `${e.parabole.famille} — ${FAMILLES[e.parabole.famille] || ''}`,
      } : null,
      interpretation: e.interpretation,
      histoire: e.histoire,
    }));

    let corps: string;
    let type: string;
    if (fmt === 'json') {
      corps = JSON.stringify({ exporte: horodatage, mode: session.mode, echanges }, null, 2);
      type = 'application/json';
    } else if (fmt === 'md') {
      const lignes: string[] = [`# Journal SPU v4.0`, ``, `_Exporté le ${horodatage}_`, ``];
      echanges.forEach((e, i) => {
        lignes.push(`## ${i + 1}. [${e.mode}${e.etape > 1 ? ` · étape ${e.etape}` : ''}] ${new Date(e.date).toLocaleString('fr-FR')}`);
        if (e.question) lignes.push(`**Question :** ${e.question}`, ``);
        if (e.synthese) lignes.push(`**Synthèse :** ${e.synthese}`, ``);
        if (e.parabole) lignes.push(`> « ${e.parabole.enonce} »`, `> — ${e.parabole.culture} · ${e.parabole.famille} (${e.parabole.code})`, ``);
        if (e.interpretation) lignes.push(`**Interprétation :** ${e.interpretation}`, ``);
        if (e.histoire) lignes.push(`**Histoire :**`, ``, e.histoire, ``);
        lignes.push(`---`, ``);
      });
      corps = lignes.join('\n');
      type = 'text/markdown';
    } else {
      const lignes: string[] = [
        '═══════════════════════════════════════════════',
        '  SPU v4.0 — JOURNAL DE BORD',
        `  Exporté le ${horodatage}`,
        '═══════════════════════════════════════════════',
        '',
      ];
      echanges.forEach((e, i) => {
        lignes.push(`── Échange ${i + 1} [${e.mode}${e.etape > 1 ? ` · étape ${e.etape}` : ''}] — ${new Date(e.date).toLocaleString('fr-FR')} ──`);
        if (e.question) lignes.push(`QUESTION : ${e.question}`);
        if (e.synthese) lignes.push(`SYNTHÈSE : ${e.synthese}`);
        if (e.parabole) lignes.push(`PARABOLE (${e.parabole.code} — ${e.parabole.culture}) : « ${e.parabole.enonce} »`);
        if (e.interpretation) lignes.push(`INTERPRÉTATION : ${e.interpretation}`);
        if (e.histoire) lignes.push(`HISTOIRE : ${e.histoire}`);
        lignes.push('');
      });
      corps = lignes.join('\n');
      type = 'text/plain';
    }

    return new NextResponse(corps, {
      headers: {
        'Content-Type': `${type}; charset=utf-8`,
        'Content-Disposition': `attachment; filename="spu-journal-${new Date().toISOString().slice(0, 10)}.${fmt}"`,
      },
    });
  } catch (err) {
    console.error('[api/export]', err);
    return NextResponse.json({ error: "L'export a échoué" }, { status: 500 });
  }
}

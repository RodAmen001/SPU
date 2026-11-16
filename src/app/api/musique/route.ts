// ═════════════════════════════════════════════════════════════════════════════
// v6.3 — LA NOTE GLOBALE DES MUSIQUES (cadre musique)
// POST /api/musique  { titre, artiste?, note (1-5), mode? } — une note d'auditeur
// GET  /api/musique  — pour CHAQUE musique : la note globale (moyenne), le nombre
//        de notes et le détail PAR MODE. C'est ce relevé qui est renvoyé au SPU
//        (le concepteur) : les pistes mal notées seront retirées du catalogue,
//        les préférées seront proposées en priorité dans leur mode.
// La table est créée de façon idempotente à la première utilisation — les bases
// restaurées (ancien instantané) reçoivent la table sans aucune migration.
// ═════════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

let tableVerifiee = false;
async function assurerTable() {
  if (tableVerifiee) return;
  await db.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS "NoteMusique" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "titre" TEXT NOT NULL,
      "artiste" TEXT,
      "note" INTEGER NOT NULL,
      "mode" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "NoteMusique_titre_idx" ON "NoteMusique"("titre")`);
  tableVerifiee = true;
}

interface LigneGlobale { titre: string; artiste: string | null; nb: number; moyenne: number }
interface LigneMode { titre: string; mode: string; nb: number; moyenne: number }

export async function GET() {
  try {
    await assurerTable();
    const globales = await db.$queryRawUnsafe<LigneGlobale[]>(
      `SELECT titre, MAX(artiste) as artiste, COUNT(*) as nb, AVG(note) as moyenne
       FROM "NoteMusique" GROUP BY titre ORDER BY nb DESC, moyenne DESC`
    );
    const parMode = await db.$queryRawUnsafe<LigneMode[]>(
      `SELECT titre, mode, COUNT(*) as nb, AVG(note) as moyenne
       FROM "NoteMusique" WHERE mode IS NOT NULL GROUP BY titre, mode`
    );
    // SQLite renvoie parfois des BigInt pour COUNT → normalisation JSON sûre
    const pistes = globales.map((g) => ({
      titre: g.titre,
      artiste: g.artiste || undefined,
      nb: Number(g.nb),
      moyenne: Math.round(Number(g.moyenne) * 10) / 10,
    }));
    const modes: Record<string, Record<string, { nb: number; moyenne: number }>> = {};
    for (const m of parMode) {
      if (!m.mode) continue;
      (modes[m.titre] ||= {})[m.mode] = { nb: Number(m.nb), moyenne: Math.round(Number(m.moyenne) * 10) / 10 };
    }
    return NextResponse.json({ pistes, parMode: modes });
  } catch (e) {
    console.error('[api/musique] GET :', e instanceof Error ? e.message : e);
    return NextResponse.json({ pistes: [], parMode: {} }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const corps = (await req.json().catch(() => ({}))) as {
    titre?: string; artiste?: string; note?: number; mode?: string;
  };
  const titre = String(corps.titre || '').trim();
  const note = Math.round(Number(corps.note));
  if (!titre || titre.length > 200 || !Number.isFinite(note) || note < 1 || note > 5) {
    return NextResponse.json({ error: 'Une note (1-5) et le titre de la musique sont requis.' }, { status: 400 });
  }
  const artiste = String(corps.artiste || '').trim().slice(0, 200) || null;
  const mode = String(corps.mode || '').trim().slice(0, 30) || null;
  try {
    await assurerTable();
    await db.$executeRawUnsafe(
      `INSERT INTO "NoteMusique" ("id", "titre", "artiste", "note", "mode", "createdAt")
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      crypto.randomUUID(), titre, artiste, note, mode
    );
    const agg = await db.$queryRawUnsafe<{ nb: number; moyenne: number }[]>(
      `SELECT COUNT(*) as nb, AVG(note) as moyenne FROM "NoteMusique" WHERE titre = ?`, titre
    );
    const g = agg[0];
    return NextResponse.json({
      enregistre: true,
      noteGlobale: g ? { nb: Number(g.nb), moyenne: Math.round(Number(g.moyenne) * 10) / 10 } : null,
    });
  } catch (e) {
    console.error('[api/musique] POST :', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Note non enregistrée — réessaie dans un instant.' }, { status: 500 });
  }
}

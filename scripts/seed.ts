// Peuple la base : corpus 50 paraboles adultes + 15 contes enfants (corpus "cloud dédié" du projet)
// Usage : bun run scripts/seed.ts
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import path from 'path';

const db = new PrismaClient();

interface Entree {
  code: string;
  texte: string;
  culture: string;
  famille: string;
  interpretations: string[];
  sources: string[];
}

async function inserer(fichier: string, mode: 'adulte' | 'enfant', prefixe: string) {
  const brut = readFileSync(path.join(process.cwd(), 'src', 'data', fichier), 'utf-8');
  const entrees = JSON.parse(brut) as Entree[];
  let n = 0;
  for (const e of entrees) {
    await db.parabole.upsert({
      where: { code: e.code },
      update: {
        texte: e.texte,
        culture: e.culture,
        famille: e.famille,
        interpretations: JSON.stringify(e.interpretations),
        sources: JSON.stringify(e.sources),
        motsCles: JSON.stringify(e.motsCles || []),
        statut: 'validated',
        mode,
        validateur: 'SPU-seed',
        dateValidation: new Date(),
      },
      create: {
        code: e.code,
        texte: e.texte,
        culture: e.culture,
        famille: e.famille,
        interpretations: JSON.stringify(e.interpretations),
        sources: JSON.stringify(e.sources),
        motsCles: JSON.stringify(e.motsCles || []),
        statut: 'validated',
        mode,
        validateur: 'SPU-seed',
        dateValidation: new Date(),
      },
    });
    n++;
  }
  console.log(`${prefixe} ${n} entrées insérées/mises à jour (${fichier})`);
}

async function main() {
  // purge RGPD : sessions expirées
  const purge = await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  if (purge.count) console.log(`Purge RGPD : ${purge.count} sessions expirées supprimées`);

  await inserer('corpus-adulte.json', 'adulte', '✓ Adulte :');
  await inserer('corpus-enfant.json', 'enfant', '✓ Enfant :');

  const total = await db.parabole.count();
  const adult = await db.parabole.count({ where: { mode: 'adulte' } });
  const child = await db.parabole.count({ where: { mode: 'enfant' } });
  const cultures = await db.parabole.groupBy({ by: ['culture'], where: { mode: 'adulte' }, _count: true });
  console.log(`\nCorpus total : ${total} (adulte ${adult} / enfant ${child})`);
  for (const c of cultures) console.log(`  - ${c.culture}: ${c._count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

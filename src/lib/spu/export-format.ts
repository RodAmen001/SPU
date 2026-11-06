// Formatage du journal (partagé par /api/export et /api/compte/sauvegardes)
import { FAMILLES } from './constants';

export interface EchangeExport {
  id: string;
  date: string;
  mode: string;
  etape: number;
  question: string | null;
  synthese: string | null;
  sources: string[];
  parabole: { code: string; enonce: string; culture: string; famille: string } | null;
  interpretation: string | null;
  histoire: string | null;
}

/** Corps d'export dans le format demandé (txt / json / md). */
export function formaterJournal(
  echanges: EchangeExport[],
  format: 'txt' | 'json' | 'md',
  meta: { mode?: string } = {}
): { corps: string; type: string } {
  const horodatage = new Date().toISOString();
  if (format === 'json') {
    return {
      corps: JSON.stringify({ exporte: horodatage, mode: meta.mode || 'oracle', echanges }, null, 2),
      type: 'application/json',
    };
  }
  if (format === 'md') {
    const lignes: string[] = [`# Journal SPU v4.2`, ``, `_Exporté le ${horodatage}_`, ``];
    echanges.forEach((e, i) => {
      lignes.push(`## ${i + 1}. [${e.mode}${e.etape > 1 ? ` · étape ${e.etape}` : ''}] ${new Date(e.date).toLocaleString('fr-FR')}`);
      if (e.question) lignes.push(`**Question :** ${e.question}`, ``);
      if (e.synthese) lignes.push(`**Synthèse :** ${e.synthese}`, ``);
      if (e.parabole) lignes.push(`> « ${e.parabole.enonce} »`, `> — ${e.parabole.culture} · ${e.parabole.famille} (${e.parabole.code})`, ``);
      if (e.interpretation) lignes.push(`**Interprétation :** ${e.interpretation}`, ``);
      if (e.histoire) lignes.push(`**Histoire :**`, ``, e.histoire, ``);
      lignes.push(`---`, ``);
    });
    return { corps: lignes.join('\n'), type: 'text/markdown' };
  }
  const lignes: string[] = [
    '═══════════════════════════════════════════════',
    '  SPU v4.2 — JOURNAL DE BORD',
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
  return { corps: lignes.join('\n'), type: 'text/plain' };
}

/** Normalise une ligne de la BDD en échange exportable. */
export function versEchangeExport(e: {
  id: string;
  createdAt: Date;
  mode: string;
  etape: number;
  question: string | null;
  synthese: string | null;
  sourcesReponse: string | null;
  parabole?: { code: string; texte: string; culture: string; famille: string } | null;
  interpretation: string | null;
  histoire: string | null;
}): EchangeExport {
  let sources: string[] = [];
  try { sources = JSON.parse(e.sourcesReponse || '[]'); } catch { sources = []; }
  return {
    id: e.id,
    date: e.createdAt.toISOString(),
    mode: e.mode,
    etape: e.etape,
    question: e.question,
    synthese: e.synthese,
    sources,
    parabole: e.parabole
      ? {
          code: e.parabole.code,
          enonce: e.parabole.texte,
          culture: e.parabole.culture,
          famille: `${e.parabole.famille} — ${FAMILLES[e.parabole.famille] || ''}`,
        }
      : null,
    interpretation: e.interpretation,
    histoire: e.histoire,
  };
}

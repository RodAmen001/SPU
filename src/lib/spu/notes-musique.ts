// ═════════════════════════════════════════════════════════════════════════════
// v6.6 — VALIDATION D'UNE NOTE MUSIQUE (audit v6.5 §B3)
// Le POST /api/musique n'accepte que des notes sur des pistes RÉELLES du
// catalogue (src/data/musiques-libres.json) : plus aucun titre hors catalogue,
// plus de spam de données. Fonction pure, partagée par la route et les tests.
// ═════════════════════════════════════════════════════════════════════════════

export interface NoteBrute {
  titre?: string;
  artiste?: string;
  note?: number;
  mode?: string;
}

export type NoteValidee =
  | { ok: true; titre: string; artiste: string | null; note: number; mode: string | null }
  | { ok: false; erreur: string };

const MODES_CONNUS = new Set(['accueil', 'oracle', 'mentor', 'deep', 'oracle-inverse', 'enfant', 'boost', 'musiques', 'journal']);

/** Valide et nettoie une note d'auditeur contre le catalogue réel. */
export function validerNoteMusique(
  corps: NoteBrute,
  titresCatalogue: ReadonlySet<string>
): NoteValidee {
  const titre = String(corps.titre || '').trim();
  const note = Number(corps.note);
  if (!titre || titre.length > 200) return { ok: false, erreur: 'Le titre de la musique est requis (200 caractères max).' };
  if (!Number.isInteger(note) || note < 1 || note > 5) return { ok: false, erreur: 'La note doit être un entier de 1 à 5.' };
  if (!titresCatalogue.has(titre)) return { ok: false, erreur: 'Cette musique ne fait pas partie du catalogue du SPU.' };
  const artiste = String(corps.artiste || '').trim().slice(0, 200) || null;
  const modeBrut = String(corps.mode || '').trim().slice(0, 30);
  const mode = modeBrut && MODES_CONNUS.has(modeBrut) ? modeBrut : null;
  return { ok: true, titre, artiste, note, mode };
}

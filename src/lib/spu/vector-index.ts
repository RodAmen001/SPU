// Index vectoriel en mémoire (TF-IDF pondéré + similarité cosinus)
// Correspond au "matching vectoriel" du cahier (3.4) : embeddings représentés par des
// vecteurs TF-IDF construits au démarrage à partir des paraboles en base.
// 100 % migrable vers pgvector : seule la fonction rechercherParaboles change.

const STOPWORDS = new Set(
  `le la les un une des du de d au aux a à et ou mais donc or ni car que qui quoi dont où
  je tu il elle on nous vous ils elles me te se ce cet cette ces mon ton son ma ta sa mes tes ses
  notre votre leur nos vos leurs est sont suis es être ete été étais était sommes êtes sont sera
  avoir ai as avons avez ont aura ai ais ait eu pour par sur dans en avec sans sous vers chez
  y ne pas plus moins tres très bien mal comme tout tous toute toutes rien autre autres meme même
  si quand alors ainsi alors pourquoi comment quel quelle quels quelles etre faire fait fais font
  cela ceci ca ça lui elle-meme elles-memes lui-même moi toi soi them the and for with that this
  what how why when who dont not mais quelque quelque-chose quelquechose chose thing`
    .split(/\s+/)
    .filter(Boolean)
);

/** Normalisation : minuscules, accents retirés. */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s'-]/g, ' ');
}

/** Stemming léger français : retrait des suffixes fréquents puis troncature à 6 caractères. */
export function stemmer(mot: string): string {
  let m = mot.replace(/'/g, '');
  const suffixes = ['issements', 'issement', 'ations', 'ation', 'ements', 'ement', 'euses', 'euse',
    'antes', 'ante', 'ants', 'ant', 'entes', 'ente', 'ents', 'ent', 'ions', 'ons', 'ez', 'ait',
    'ais', 'aient', 'era', 'erai', 'eraient', 'eres', 'ees', 'ee', 'ée', 'ées', 'es', 'er', 'ir', 're', 's'];
  for (const s of suffixes) {
    if (m.length - s.length >= 3 && m.endsWith(s)) {
      m = m.slice(0, -s.length);
      break;
    }
  }
  return m.slice(0, 6);
}

export function tokenizer(texte: string): string[] {
  return normaliser(texte)
    .split(/[\s'-]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
    .map(stemmer);
}

export interface DocIndexe {
  id: string;
  tokens: string[];
  vec: Map<string, number>;
  norme: number;
}

export interface CorpusIndex {
  docs: DocIndexe[];
  idf: Map<string, number>;
  tailleMoyenne: number;
}

/** Construit l'index TF-IDF complet à partir des documents (texte = texte + interprétations + culture + famille). */
export function construireIndex(documents: { id: string; texte: string }[]): CorpusIndex {
  const docs: DocIndexe[] = documents.map((d) => ({ id: d.id, tokens: tokenizer(d.texte), vec: new Map(), norme: 0 }));
  const df = new Map<string, number>();
  for (const doc of docs) {
    const uniques = new Set(doc.tokens);
    for (const t of uniques) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = docs.length || 1;
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log((N + 1) / (n + 0.5)) + 1); // IDF lissé
  let somme = 0;
  for (const doc of docs) {
    const tf = new Map<string, number>();
    for (const t of doc.tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const [t, c] of tf) {
      const w = (1 + Math.log(c)) * (idf.get(t) || Math.log((N + 1) / 1.5) + 1);
      doc.vec.set(t, w);
      doc.norme += w * w;
      somme += tf.size;
    }
    doc.norme = Math.sqrt(doc.norme) || 1;
  }
  return { docs, idf, tailleMoyenne: docs.length ? somme / docs.length : 0 };
}

/** Vectorise une requête avec l'IDF du corpus. */
export function vectoriserRequete(requete: string, index: CorpusIndex): { vec: Map<string, number>; norme: number } {
  const tokens = tokenizer(requete);
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const vec = new Map<string, number>();
  let norme = 0;
  for (const [t, c] of tf) {
    const w = (1 + Math.log(c)) * (index.idf.get(t) || 1.6); // termes inconnus gardés mais pondérés
    vec.set(t, w);
    norme += w * w;
  }
  return { vec, norme: Math.sqrt(norme) || 1 };
}

/** Similarité cosinus entre deux vecteurs creux. */
export function cosinus(a: Map<string, number>, normeA: number, b: Map<string, number>, normeB: number): number {
  let dot = 0;
  const [petit, grand] = a.size < b.size ? [a, b] : [b, a];
  for (const [t, w] of petit) {
    const w2 = grand.get(t);
    if (w2) dot += w * w2;
  }
  return dot / (normeA * normeB);
}

export interface ResultatMatching {
  id: string;
  score: number;
}

/** Top-k documents les plus proches d'une requête. */
export function rechercher(requete: string, index: CorpusIndex, k = 5): ResultatMatching[] {
  const q = vectoriserRequete(requete, index);
  return index.docs
    .map((d) => ({ id: d.id, score: cosinus(q.vec, q.norme, d.vec, d.norme) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

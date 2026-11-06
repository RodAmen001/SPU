// Vérifie chaque URL du corpus via page_reader (réseau SDK, non limité)
import ZAI from 'z-ai-web-dev-sdk';
import { readFileSync } from 'fs';

function extractUrls(files) {
  const set = new Set();
  for (const f of files) {
    const data = JSON.parse(readFileSync(f, 'utf-8'));
    for (const p of data) for (const s of p.sources) if (s.startsWith('http')) set.add(s);
  }
  return [...set];
}

const urls = extractUrls(['src/data/corpus-adulte.json', 'src/data/corpus-enfant.json']);
console.log(`Vérification de ${urls.length} URLs uniques...\n`);
const zai = await ZAI.create();
let ok = 0, ko = 0;
for (const u of urls) {
  try {
    const r = await zai.functions.invoke('page_reader', { url: u });
    const title = (r?.data?.title || 'SANS TITRE').slice(0, 50);
    const html = (r?.data?.html || '');
    const missing = /cette page n'existe pas|article inexistant|does not exist|Wikipédia:Article manquant/i.test(html);
    if (missing) { console.log(`KO (introuvable) ${u}`); ko++; }
    else { console.log(`OK [${title}] ${u}`); ok++; }
  } catch (e) {
    console.log(`ERREUR ${u} — ${e.message.slice(0, 60)}`);
    ko++;
  }
  await new Promise(r => setTimeout(r, 400));
}
console.log(`\nRésultat: ${ok} OK, ${ko} à corriger`);

// Test isolé de la génération d'histoire (voir l'erreur réelle)
import { genererHistoire, filtrerContenu } from '../src/lib/spu/story';
import { llmChat } from '../src/lib/spu/llm';

const consigne = `Tu es un conteur. Rédige une histoire de 150 à 300 mots, incarnée et émotionnelle, illustrant l'énoncé [La première flèche fait mal ; la seconde fait mal deux fois] et l'interprétation [La rumination est un choix]. Tonalité : neutre.`;

try {
  const t0 = Date.now();
  const texte = await llmChat([{ role: 'user', content: consigne }], { timeoutMs: 30000, temperature: 0.85, maxTokens: 700 });
  console.log(`LLM OK en ${Date.now() - t0}ms, ${texte.length} caractères`);
  console.log('Filtre:', JSON.stringify(filtrerContenu(texte)));
  console.log(texte.slice(0, 200));
} catch (e) {
  console.log('LLM ÉCHEC:', e instanceof Error ? e.message : e);
}

const r = await genererHistoire({
  enonce: 'La première flèche fait mal ; la seconde fait mal deux fois.',
  interpretation: 'La rumination est un choix.',
  contexte: 'non partagé',
  culture: 'Asie',
  tonalite: 'neutre',
  mode: 'adulte',
  preoccupation: 'comment rester patient quand tout va trop lentement ?',
});
console.log('\ngenererHistoire → regeneration:', r.regeneration, '| filtrePasse:', r.filtrePasse, '|', r.texte.length, 'caractères');

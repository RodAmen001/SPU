// Test direct du SDK z-ai + mesure du temps de réponse
import ZAI from 'z-ai-web-dev-sdk';

async function main() {
  const t0 = Date.now();
  try {
    const zai = await ZAI.create();
    console.log('ZAI.create :', Date.now() - t0, 'ms');
    const t1 = Date.now();
    const r = await zai.chat.completions.create({
      messages: [{ role: 'user', content: 'Réponds uniquement: OK' }],
      thinking: { type: 'disabled' },
      max_tokens: 10,
    } as never);
    console.log('chat OK :', Date.now() - t1, 'ms →', JSON.stringify(r.choices[0]?.message?.content || ''));
  } catch (e) {
    console.log('ERREUR :', e instanceof Error ? e.message : e);
  }
}
main();

// Test end-to-end du flux /api/ask (Oracle) — consomme le SSE et journalise les événements
const URL = process.env.SPU_URL || 'http://localhost:3000';
const question = process.argv[2] || 'comment rester patient quand tout va trop lentement ?';
const mode = process.argv[3] || 'oracle';

const t0 = Date.now();
const res = await fetch(`${URL}/api/ask`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question, mode }),
});

console.log(`HTTP ${res.status} — flux SSE :`);
const reader = res.body.getReader();
const decoder = new TextDecoder();
let tampon = '';
let histoire = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  tampon += decoder.decode(value, { stream: true });
  const blocs = tampon.split('\n\n');
  tampon = blocs.pop() || '';
  for (const bloc of blocs) {
    let ev = 'message';
    const data = [];
    for (const ligne of bloc.split('\n')) {
      if (ligne.startsWith('event: ')) ev = ligne.slice(7).trim();
      else if (ligne.startsWith('data: ')) data.push(ligne.slice(6));
    }
    if (!data.length) continue;
    const d = JSON.parse(data.join('\n'));
    const t = ((Date.now() - t0) / 1000).toFixed(1);
    if (ev === 'status') console.log(`[${t}s] STATUS: ${d.step}`);
    else if (ev === 'synthesis') console.log(`[${t}s] SYNTHÈSE (${d.sources.join(', ')} ; confiance ${d.confiance}): ${d.text.slice(0, 140)}…`);
    else if (ev === 'parabole') console.log(`[${t}s] PARABOLE ${d.code} (${d.culture}, score ${d.score}${d.sousSeuil ? ', sous-seuil' : ''}): « ${d.enonce.slice(0, 80)} »`);
    else if (ev === 'histoire') { histoire += d.chunk; process.stdout.write(''); }
    else if (ev === 'distress') console.log(`[${t}s] DÉTRESSE (prudent=${!!d.prudent}): ${d.message.slice(0, 90)}…`);
    else if (ev === 'erreur') console.log(`[${t}s] ERREUR: ${d.message.slice(0, 100)}`);
    else if (ev === 'final') console.log(`[${t}s] FINAL: echangeId=${d.echangeId} sessionId=${d.sessionId} perspective=${d.perspectiveDisponible}`);
    else console.log(`[${t}s] ${ev}: ${JSON.stringify(d).slice(0, 100)}`);
  }
}
console.log(`\nHistoire complète (${histoire.split(/\s+/).length} mots):\n${histoire.slice(0, 400)}${histoire.length > 400 ? '…' : ''}`);
console.log(`\nDurée totale: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// Test rapide des capacités du sandbox : SDK z-ai + réseau sortant
import ZAI from 'z-ai-web-dev-sdk';

async function main() {
  // 1. Chat LLM
  try {
    const zai = await ZAI.create();
    const c = await zai.chat.completions.create({
      messages: [{ role: 'user', content: 'Réponds exactement: OK' }],
      thinking: { type: 'disabled' },
    });
    console.log('CHAT_OK:', (c.choices[0]?.message?.content || '').slice(0, 60));
  } catch (e) {
    console.log('CHAT_FAIL:', e.message);
  }

  // 2. Web search
  try {
    const zai = await ZAI.create();
    const r = await zai.functions.invoke('web_search', { query: 'Lao Tseu proverbe voyage mille lieues', num: 3 });
    const arr = Array.isArray(r) ? r : r?.results || [];
    console.log('SEARCH_OK:', arr.length, 'résultats, premier:', JSON.stringify(arr[0])?.slice(0, 120));
  } catch (e) {
    console.log('SEARCH_FAIL:', e.message);
  }

  // 3. Fetch Wikipedia (réseau sortant direct)
  try {
    const t0 = Date.now();
    const res = await fetch('https://fr.wikipedia.org/api/rest_v1/page/summary/Laozi', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'SPU/4.0 (test)' },
    });
    const j = await res.json();
    console.log('WIKI_OK:', res.status, Date.now() - t0 + 'ms', (j.extract || '').slice(0, 60));
  } catch (e) {
    console.log('WIKI_FAIL:', e.message);
  }

  // 4. Fetch DuckDuckGo Instant Answer
  try {
    const t0 = Date.now();
    const res = await fetch('https://api.duckduckgo.com/?q=patience&format=json&no_html=1', {
      signal: AbortSignal.timeout(8000),
    });
    const j = await res.json();
    console.log('DDG_OK:', res.status, Date.now() - t0 + 'ms', (j.AbstractText || '').slice(0, 60));
  } catch (e) {
    console.log('DDG_FAIL:', e.message);
  }
}

main();

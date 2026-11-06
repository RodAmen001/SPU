// Test complémentaire : page_reader sur Wikipedia + contenu DDG réel
import ZAI from 'z-ai-web-dev-sdk';

async function main() {
  // 1. page_reader sur Wikipedia
  try {
    const zai = await ZAI.create();
    const r = await zai.functions.invoke('page_reader', {
      url: 'https://fr.wikipedia.org/wiki/Laozi',
    });
    console.log('PAGEREADER_OK:', (r?.data?.title || '').slice(0, 40), '| html len:', (r?.data?.html || '').length);
  } catch (e) {
    console.log('PAGEREADER_FAIL:', e.message);
  }

  // 2. DDG contenu réel
  try {
    const res = await fetch('https://api.duckduckgo.com/?q=patience+proverbe&format=json&no_html=1', {
      signal: AbortSignal.timeout(8000),
    });
    const j = await res.json();
    console.log('DDG:', JSON.stringify({ abs: (j.AbstractText || '').slice(0, 80), topics: (j.RelatedTopics || []).length }));
  } catch (e) {
    console.log('DDG_FAIL:', e.message);
  }

  // 3. Test fr.wikipedia.org/w/api.php (endpoint classique)
  try {
    const u = 'https://fr.wikipedia.org/w/api.php?action=query&list=search&srsearch=proverbe&format=json&srlimit=3&origin=*';
    const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
    const txt = await res.text();
    console.log('WIKIAPI:', res.status, txt.slice(0, 80).replace(/\n/g, ' '));
  } catch (e) {
    console.log('WIKIAPI_FAIL:', e.message);
  }
}

main();

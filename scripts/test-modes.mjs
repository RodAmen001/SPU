// Test des parcours Mentor (3 étapes), Deep (3 niveaux) et Enfant
const URL = process.env.SPU_URL || 'http://localhost:3000';

async function sse(route, corps, surEvent) {
  const res = await fetch(`${URL}${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let tampon = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    tampon += decoder.decode(value, { stream: true });
    const blocs = tampon.split('\n\n');
    tampon = blocs.pop() || '';
    for (const bloc of blocs) {
      let ev = 'message';
      const d = [];
      for (const ligne of bloc.split('\n')) {
        if (ligne.startsWith('event: ')) ev = ligne.slice(7).trim();
        else if (ligne.startsWith('data: ')) d.push(ligne.slice(6));
      }
      if (d.length) surEvent(ev, JSON.parse(d.join('\n')));
    }
  }
}

const recap = (nom, evenements) => {
  console.log(`\n═══ ${nom} ═══`);
  for (const [ev, info] of evenements) console.log(`  ${ev}: ${info}`);
};

// ── MENTOR ──
{
  const evs = [];
  let sessionId = '';
  let angles = [];
  await sse('/api/mentor', { question: 'je ne sais pas si je dois changer de métier', etape: 1 }, (ev, d) => {
    if (ev === 'final') sessionId = d.sessionId;
    if (ev === 'angles') angles = d.questions || [];
    if (ev === 'parabole') evs.push(['parabole', `${d.code} — « ${d.enonce.slice(0, 60)}… »`]);
    if (ev === 'synthesis') evs.push(['synthèse', d.text.slice(0, 90) + '…']);
    if (ev === 'histoire') {} // accumulé silencieusement
    if (ev === 'erreur') evs.push(['ERREUR', d.message.slice(0, 80)]);
  });
  recap('MENTOR ÉTAPE 1/3 — OUVERTURE', evs);
  console.log(`  angles: ${JSON.stringify(angles)}`);

  const evs2 = [];
  await sse('/api/mentor', { sessionId, reponse: 'j\'ai peur de perdre mes revenus, mais je m\'ennuie profondément', etape: 2 }, (ev, d) => {
    if (ev === 'reflexion') evs2.push(['réflexion', String(d.text).slice(0, 120) + '…']);
    if (ev === 'angles') evs2.push(['angles', JSON.stringify(d.questions)]);
    if (ev === 'erreur') evs2.push(['ERREUR', String(d.message).slice(0, 80)]);
  });
  recap('MENTOR ÉTAPE 2/3 — APPROFONDISSEMENT', evs2);

  const evs3 = [];
  await sse('/api/mentor', { sessionId, reponse: 'le plus lourd, c\'est de ne pas décevoir ma famille', etape: 3 }, (ev, d) => {
    if (ev === 'parabole') evs3.push(['parabole', `${d.code} — « ${d.enonce.slice(0, 60)}… »`]);
    if (ev === 'questionOuverte') evs3.push(['question ouverte', String(d.text).slice(0, 80) + '…']);
    if (ev === 'final') evs3.push(['final', `étape ${d.etape}`]);
    if (ev === 'erreur') evs3.push(['ERREUR', String(d.message).slice(0, 80)]);
  });
  recap('MENTOR ÉTAPE 3/3 — SYNTHÈSE', evs3);
}

// ── DEEP ──
{
  let sessionId = '';
  const evs1 = [];
  await sse('/api/deep', { question: 'comment accueillir le silence en moi ?', niveau: 1 }, (ev, d) => {
    if (ev === 'final') sessionId = d.sessionId;
    if (ev === 'parabole') evs1.push(['parabole', `${d.code}`]);
    if (ev === 'histoire') {} // silence
  });
  recap('DEEP NIVEAU 1', evs1);

  const evs2 = [];
  await sse('/api/deep', { sessionId, reponse: 'le silence me fait parfois peur', niveau: 2 }, (ev, d) => {
    if (ev === 'meditation') {} // accumulé
    if (ev === 'parabole') evs2.push(['parabole couche 2', `${d.famille}`]);
    if (ev === 'final') evs2.push(['final', `niveau ${d.niveau}`]);
    if (ev === 'erreur') evs2.push(['ERREUR', String(d.message).slice(0, 80)]);
  });
  recap('DEEP NIVEAU 2 — MÉDITATION', evs2);

  const evs3 = [];
  await sse('/api/deep', { sessionId, reponse: 'j ai respiré un peu', niveau: 3 }, (ev, d) => {
    if (ev === 'perspective') evs3.push(['perspective', String(d.text).slice(0, 100) + '…']);
    if (ev === 'questionOuverte') evs3.push(['question ouverte', String(d.text).slice(0, 60) + '…']);
    if (ev === 'final') evs3.push(['final', `niveau ${d.niveau}`]);
    if (ev === 'erreur') evs3.push(['ERREUR', String(d.message).slice(0, 80)]);
  });
  recap('DEEP NIVEAU 3 — PERSPECTIVE', evs3);
}

// ── ENFANT ──
{
  const evs = [];
  let histoire = '';
  await sse('/api/ask', { question: 'j ai peur de me tromper devant les autres à l école', mode: 'enfant' }, (ev, d) => {
    if (ev === 'parabole') evs.push(['conte', `${d.code} — « ${d.enonce.slice(0, 50)}… »`]);
    if (ev === 'histoire') histoire += d.chunk;
    if (ev === 'final') evs.push(['final', `histoire: ${histoire.split(/\s+/).length} mots`]);
    if (ev === 'erreur') evs.push(['ERREUR', String(d.message).slice(0, 80)]);
  });
  recap('MODE ENFANT', evs);
  console.log(`  début: ${histoire.slice(0, 140)}…`);
}

// ── PERSPECTIVE + EXPORT ──
{
  let echangeId = '';
  await sse('/api/ask', { question: 'comment apprendre la patience ?' }, (ev, d) => {
    if (ev === 'final') echangeId = d.echangeId;
  });
  const res = await fetch(`${URL}/api/perspective`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ echangeId }),
  });
  const j = await res.json();
  console.log('\n═══ PERSPECTIVE ═══');
  console.log(`  ${res.status}: ${(j.perspective || j.error || '').slice(0, 130)}…`);
}

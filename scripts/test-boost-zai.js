// Test du prompt BOOST via le SDK z.ai (moteur qui fonctionne dans ce bac à sable)
const ZAI = require('z-ai-web-dev-sdk').default;
const fs = require('fs');

const src = fs.readFileSync('/home/z/my-project/src/lib/spu/boost.ts', 'utf8');
const prompt = src.split("function promptBoost")[1].split("return `")[1].split("`;\n}")[0]
  .replace('${chemin.slice(0, 3000)}', `Première requête : « Comment rester patient alors que tout va trop lentement ? »
Puis : « Et si malgré tout j'échoue encore ? » — l'histoire reçue parlait de : le vieux forgeron qui refait chauffer le fer au lieu de jeter la pièce tordue.
Puis : « J'ai peur de ne pas y arriver avant la fin de l'année » — l'histoire reçue parlait de : la graine du baobab qui pousse sans bruit pendant sept ans.`)
  .replace("${audience === 'enfant' ? `", '')
  .replace('` : `PUBLIC : adulte. Ton vigoureux, sincère, jamais mièvre ; la foi et la prière sont des forces agissantes du héros (fidèle à l\'esprit des histoires du chemin parcouru).`', '');

async function main() {
  const zai = await ZAI.create();
  const t0 = Date.now();
  const r = await zai.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    thinking: { type: 'disabled' },
    temperature: 0.85,
    max_tokens: 2800,
  });
  const texte = r.choices[0]?.message?.content || '';
  console.error('durée:', Math.round((Date.now() - t0) / 1000), 's | longueur:', texte.length);
  const brut = texte.slice(texte.indexOf('{'), texte.lastIndexOf('}') + 1);
  const sc = JSON.parse(brut);
  const phases = sc.scenes.map((s) => s.phase);
  const vol = sc.scenes.reduce((n, s) => n + s.lignes.reduce((m, l) => m + l.texte.length, 0), 0);
  const vo = sc.personnages.map((p) => p.voix);
  console.log('titre:', sc.titre);
  console.log('héros:', sc.heros, '| personnages:', sc.personnages.map((p) => `${p.nom}(${p.voix})`).join(', '));
  console.log('phases:', phases.join(' → '));
  console.log('déclaration:', sc.declaration.slice(0, 110) + '…');
  console.log('volume parlé:', vol, 'car. | doublons de voix:', vo.filter((v, i) => vo.indexOf(v) !== i));
  for (const s of sc.scenes) console.log(`  phase ${s.phase.padEnd(4)} ${s.image} ${s.musique.padEnd(11)} ${s.lignes.length} répliques — ${s.titre.slice(0, 45)}`);
}
main().catch((e) => { console.error('ÉCHEC:', e.message); process.exit(1); });

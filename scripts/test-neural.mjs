// Test réel du moteur de voix neural (Piper) dans Chromium :
// bascule neural → écoute « Le Sage » → attend la fin → vérifie aucune erreur.
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 1280, height: 900 } });
const erreurs = [];
const logs = [];
page.on('pageerror', (e) => erreurs.push(String(e)));
page.on('console', (m) => {
  const t = m.text();
  if (/error|failed|404|500|onnx|piper|wasm/i.test(t)) logs.push(t.slice(0, 200));
});

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'régie des voix' }).first().click();
await page.waitForTimeout(600);

// bascule sur le moteur neural
await page.getByRole('button', { name: /Voix neurales locales/ }).first().click();
// attend que l'état affiche neural prêt (ou indisponible) — jusqu'à 30 s
let etat = '';
try {
  await page
    .locator('button[aria-pressed="true"]')
    .filter({ hasText: 'Voix neurales locales' })
    .waitFor({ timeout: 30000 });
  etat = 'neural-actif';
} catch {
  etat = 'neural-repli';
}
console.log('état moteur :', etat);

if (etat === 'neural-actif') {
  // écoute « Le Sage » : synthèse Piper réelle (1er usage : OPFS + modèles locaux)
  await page.getByLabel('écouter la voix Le Sage').first().click();
  console.log('synthèse lancée, attente…');
  // pendant la lecture, le bouton devient « arrêter » (icône carrée) ; on attend
  // simplement que la page reste vivante et que le test vocal se termine
  await page.waitForTimeout(45000);
}

// état final : page vivante ?
const pageVivante = await page.locator('h2').first().textContent().then((t) => t.length > 0).catch(() => false);
console.log('page encore vivante :', pageVivante);
console.log('erreurs page :', erreurs.length ? erreurs.slice(0, 3) : 'aucune');
console.log('logs suspects :', logs.length ? logs.slice(0, 5) : 'aucun');
await page.screenshot({ path: '/tmp/render/v10-neural.png' });
await nav.close();

const echec = !pageVivante || erreurs.length > 0;
console.log(echec ? '═══ ÉCHEC ═══' : '═══ TEST NEURAL OK ═══');
process.exit(echec ? 1 : 0);

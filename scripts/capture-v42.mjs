import { chromium } from 'playwright';
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: '/tmp/v42-accueil2.png' });
const btn = page.locator('header button:has-text("Voix")').first();
if (await btn.count()) { await btn.click(); await page.waitForTimeout(1500); await page.screenshot({ path: '/tmp/v42-voix.png' }); }
else console.log('bouton Voix introuvable');
const hero = await page.locator('p.uppercase').first().innerText().catch(() => '?');
console.log('BANDEAU:', hero);
await navigateur.close();

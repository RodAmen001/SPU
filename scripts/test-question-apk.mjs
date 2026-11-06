// Test E2E SPU Pocket v1.2 — mode nomade (sans serveur) + mode serveur + détresse
import { chromium } from 'playwright';
import { setTimeout as dormir } from 'timers/promises';

const URL_FICHIER = 'file:///home/z/my-project/apk-spu/assets/spu/index.html';
const SERVEUR = 'http://localhost:3000';
const erreursJs = [];
let ok = 0, ko = 0;
const verdict = (nom, cond) => { console.log((cond ? '✅' : '❌') + ' ' + nom); cond ? ok++ : ko++; };

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
page.on('pageerror', (e) => erreursJs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreursJs.push(m.text()); });
page.setDefaultTimeout(15000);

await page.goto(URL_FICHIER);

// 1) Accueil v1.2
const badgeVer = await page.locator('.badge-eval').first().textContent();
verdict('Badge version 1.2 sur l\'accueil', /1\.2/.test(badgeVer || ''));
await page.click('.carte[data-nav="demander"]');
await dormir(300);
const modeTexte = await page.locator('#dem-mode').textContent();
verdict('Mode nomade annoncé par défaut (aucun serveur)', /Mode nomade/.test(modeTexte || ''));
const astuceVisible = await page.locator('#dem-sans-serveur').isVisible();
verdict('Astuce « ajouter un serveur » visible', astuceVisible);

// 2) Sécurité détresse (avant tout réseau)
await page.fill('#dem-question', 'je veux mourir, plus envie de vivre');
await page.click('#btn-demander');
await dormir(300);
const detresse = await page.locator('#dem-resultat').textContent();
verdict('Détection de détresse : message 💙 + 3114', /3114/.test(detresse || '') && /seul/.test(detresse || ''));
await page.screenshot({ path: '/home/z/my-project/download/captures-apk/9-detresse.png' });

// 3) Mode nomade : réponse directe SANS serveur (avec reprise si limitation publique)
let nomadeOk = false;
for (let essai = 1; essai <= 3 && !nomadeOk; essai++) {
  await page.fill('#dem-question', 'Comment retrouver courage et patience quand tout semble échouer ?');
  await page.click('#btn-demander');
  try {
    await page.waitForSelector('#dem-resultat .dem-part', { timeout: 70000 });
    const t = await page.locator('#dem-resultat').textContent();
    if (/Réponse nomade/.test(t || '')) nomadeOk = true;
    else if (essai < 3) { console.log('   ⏳ service public limité, nouvelle tentative dans 46 s…'); await dormir(46000); }
  } catch {
    if (essai < 3) { console.log('   ⏳ attente dépassée, nouvelle tentative dans 46 s…'); await dormir(46000); }
  }
}
verdict('Mode nomade : réponse reçue sans aucun serveur', nomadeOk);
if (nomadeOk) {
  const texteNomade = await page.locator('#dem-resultat').textContent();
  verdict('Réponse nomade substantielle (> 120 caractères)', (texteNomade || '').length > 120);
  verdict('Bouton écouter disponible en mode nomade', await page.locator('#btn-dem-ecouter').isVisible());
  await page.screenshot({ path: '/home/z/my-project/download/captures-apk/7-question.png' });
}

// 4) Mode serveur : réponse narrée complète
await page.evaluate((s) => localStorage.setItem('spu-serveurs', JSON.stringify([s])), SERVEUR);
await page.goto(URL_FICHIER);
await page.click('.carte[data-nav="demander"]');
await dormir(300);
const modeServ = await page.locator('#dem-mode').textContent();
verdict('Mode serveur détecté après configuration', /Serveur SPU configuré/.test(modeServ || ''));
await page.fill('#dem-question', 'Comment aider un ami découragé ?');
await page.click('#btn-demander');
let serveurOk = false;
try {
  await page.waitForSelector('#dem-resultat .dem-part', { timeout: 110000 });
  const h = await page.locator('#dem-resultat').innerHTML();
  serveurOk = /Réponse/.test(h);
  verdict('Mode serveur : réponse narrée reçue', serveurOk);
  const aParabole = /Parabole/.test(h);
  console.log((aParabole ? '✅' : 'ℹ️ ') + ' Parabole liée ' + (aParabole ? 'présente' : 'absente cette fois (facultative selon la question — l\'app gère les deux)'));
} catch { verdict('Mode serveur : réponse narrée reçue', false); }
verdict('Aucune erreur JavaScript', erreursJs.length === 0);
if (erreursJs.length) console.log('   erreurs: ' + erreursJs.slice(0, 3).join(' | '));

await navigateur.close();
console.log('\n════════ RÉSULTAT : ' + ok + ' réussis, ' + ko + ' échoués ════════');
process.exit(ko ? 1 : 0);

// Test E2E SPU Pocket v1.1 — écran « Poser une question » avec vrai serveur
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
page.on('console', (m) => { if (m.type() === 'error') erreursJs.push(m.text()); });

await page.goto(URL_FICHIER);

// 1) Accueil : nouvelle carte
const carteQuestion = await page.locator('.carte[data-nav="demander"]').count();
verdict('Accueil — carte « Poser une question » présente', carteQuestion === 1);
const badge = await page.locator('.badge-nouveau').textContent().catch(() => '');
verdict('Badge « nouveau » visible', badge === 'nouveau');
const badgeVer = await page.locator('.badge-eval').first().textContent();
verdict('Badge version 1.1', /1\.1/.test(badgeVer || ''));

// 2) Sans serveur configuré
await page.click('.carte[data-nav="demander"]');
await dormir(300);
const active = await page.locator('#ecran-demander.active').count();
verdict('Écran demander actif', active === 1);
const sansServeurVisible = await page.locator('#dem-sans-serveur').isVisible();
verdict('Aide « configurer le serveur » visible sans serveur', sansServeurVisible);
await page.fill('#dem-question', 'Comment aider un ami découragé ?');
await page.click('#btn-demander');
await dormir(400);
const msgSans = await page.locator('#dem-resultat').textContent();
verdict('Message « aucun serveur » affiché', /Aucun serveur configuré/.test(msgSans || ''));

// 3) Serveur configuré (localStorage) → question réelle
await page.evaluate((s) => localStorage.setItem('spu-serveurs', JSON.stringify([s])), SERVEUR);
await page.goto(URL_FICHIER); // navigation propre : repart de l'accueil (sans hash)
await page.click('.carte[data-nav="demander"]');
await dormir(300);
const sansServeurCache = !(await page.locator('#dem-sans-serveur').isVisible());
verdict('Aide serveur cachée quand un serveur est configuré', sansServeurCache);

const t0 = Date.now();
await page.fill('#dem-question', 'Comment retrouver courage et patience quand tout semble échouer ?');
await page.click('#btn-demander');
console.log('   ⏳ question envoyée, attente de la réponse du serveur…');
try {
  await page.waitForSelector('#dem-resultat .dem-part', { timeout: 110000 });
} catch { /* géré ci-dessous */ }
const duree = Math.round((Date.now() - t0) / 1000);

const html = await page.locator('#dem-resultat').innerHTML();
const texte = await page.locator('#dem-resultat').textContent();
verdict('Réponse reçue en ' + duree + ' s', /Réponse/.test(html));
verdict('Section « Parabole » affichée', /Parabole/.test(html));
verdict('Section « Histoire » affichée', /Histoire/.test(html));
const paraboleCode = (html.match(/Parabole\s*(P\d{3}|F\d{3})/) || [])[1] || 'aucune';
console.log('   📜 parabole liée : ' + paraboleCode);
verdict('Texte de réponse substantiel (> 200 caractères)', (texte || '').length > 200);
const ecouterVisible = await page.locator('#btn-dem-ecouter').isVisible();
verdict('Bouton « Écouter la réponse » apparu', ecouterVisible);
const compteur = await page.locator('#dem-compteur').textContent();
verdict('Compteur de caractères actif', /\d+ \/ 2000/.test(compteur || ''));

await page.screenshot({ path: '/home/z/my-project/download/captures-apk/7-question.png', fullPage: false });

// 4) Vérification des mises à jour (doit dire « à jour » pour 1.1.0)
await page.click('#ecran-demander .barre [data-nav="accueil"]');
await dormir(250);
await page.click('.carte[data-nav="connexion"]');
await dormir(250);
await page.click('#btn-maj');
await dormir(2500);
const maj = await page.locator('#maj-resultat').textContent();
verdict('Vérif mises à jour : « SPU Pocket à jour »', /à jour/.test(maj || ''));
console.log('   → ' + (maj || '').slice(0, 90));

// 5) Retour Android + erreurs
const retour = await page.evaluate(() => { location.hash = '/demander'; return true; });
await dormir(250);
const r2 = await page.evaluate(() => window.spuRetour());
verdict('Bouton retour Android ramène à l\'accueil', r2 === true && retour);
verdict('Aucune erreur JavaScript', erreursJs.length === 0);
if (erreursJs.length) console.log('   erreurs: ' + erreursJs.slice(0, 3).join(' | '));

await navigateur.close();
console.log('\n════════ RÉSULTAT : ' + ok + ' réussis, ' + ko + ' échoués ════════');
process.exit(ko ? 1 : 0);

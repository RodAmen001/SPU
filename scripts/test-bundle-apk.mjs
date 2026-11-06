// Test visuel du bundle SPU Pocket embarqué dans l'APK
import { chromium } from 'playwright';
import fs from 'fs';

const URL = 'file:///home/z/my-project/apk-spu/assets/spu/index.html';
const sorties = '/home/z/my-project/download/captures-apk';
fs.mkdirSync(sorties, { recursive: true });

const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

const erreurs = [];
page.on('pageerror', (e) => erreurs.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') erreurs.push('CONSOLE: ' + m.text()); });

// 1. Accueil
await page.goto(URL);
await page.waitForTimeout(600);
const nbTextes = await page.textContent('#nb-textes');
await page.screenshot({ path: sorties + '/1-accueil.png' });

// 2. Bibliothèque
await page.click('[data-nav="bibliotheque"]');
await page.waitForTimeout(500);
const nbItems = await page.locator('.item').count();
await page.screenshot({ path: sorties + '/2-bibliotheque.png' });

// 3. Recherche
await page.fill('#recherche', 'ensemble');
await page.waitForTimeout(400);
const nbRecherche = await page.locator('.item').count();
await page.screenshot({ path: sorties + '/3-recherche.png' });
await page.fill('#recherche', '');

// 4. Onglet enfant
await page.click('.onglet[data-onglet="enfant"]');
await page.waitForTimeout(400);
const nbEnfant = await page.locator('.item').count();
await page.click('.onglet[data-onglet="adulte"]');

// 5. Lecteur (premier texte)
await page.locator('.item').first().click();
await page.waitForTimeout(500);
const codeTexte = await page.textContent('#lec-code');
const texteLu = await page.textContent('#lec-texte');
const interps = await page.locator('#lec-interpretations li').count();
await page.screenshot({ path: sorties + '/4-lecteur.png' });

// 6. Favori + navigation suivant
await page.click('#btn-favori');
await page.click('#btn-suiv');
await page.waitForTimeout(300);
const codeSuivant = await page.textContent('#lec-code');

// 7. Connexion serveur + vérification mises à jour vers le vrai serveur
await page.click('#ecran-lecteur .barre [data-nav="bibliotheque"]'); // lecteur → bibliothèque
await page.waitForTimeout(300);
await page.click('#ecran-bibliotheque .barre [data-nav="accueil"]'); // bibliothèque → accueil
await page.waitForTimeout(300);
await page.click('[data-nav="connexion"]');
await page.waitForTimeout(400);
await page.fill('#url-serveur', 'http://localhost:3000');
await page.click('#btn-maj');
await page.waitForTimeout(1500);
const majTxt = await page.textContent('#maj-resultat');
await page.screenshot({ path: sorties + '/5-connexion-maj.png' });

// 8. À propos
await page.click('#ecran-connexion .barre [data-nav="accueil"]'); // connexion → accueil
await page.waitForTimeout(300);
await page.click('[data-nav="apropos"]');
await page.waitForTimeout(400);
await page.screenshot({ path: sorties + '/6-apropos.png' });

// 9. Bouton retour simulé (spuRetour)
const retour = await page.evaluate(() => window.spuRetour());

const ok = nbTextes === '65' && nbItems > 40 && nbRecherche >= 1 && nbEnfant === 15 &&
  codeTexte === 'P001' && texteLu.length > 20 && interps === 3 && retour === true;

console.log(JSON.stringify({
  nbTextesAccueil: nbTextes,
  itemsBibliotheque: nbItems,
  resultatsRechercheEnsemble: nbRecherche,
  fablesEnfant: nbEnfant,
  premierTexte: codeTexte,
  longueurTexte: texteLu.length,
  interpretations: interps,
  suivant: codeSuivant,
  verifMaj: majTxt.slice(0, 90),
  retourSpu: retour,
  erreursJs: erreurs,
  verdict: ok ? '✅ SUCCÈS' : '❌ ÉCHEC',
}, null, 2));

await navigateur.close();
process.exit(ok && erreurs.length === 0 ? 0 : 1);

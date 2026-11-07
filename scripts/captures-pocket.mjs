// Capture les 5 écrans clés de SPU Pocket v1.2 pour la fiche Play Store
import { chromium } from 'playwright';
import { setTimeout as dormir } from 'timers/promises';

const URL_FICHIER = 'file:///home/z/my-project/apk-spu/assets/spu/index.html';
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });

const shot = async (nom) => page.screenshot({ path: '/home/z/my-project/download/captures-apk/' + nom });

await page.goto(URL_FICHIER);
await dormir(400);
await shot('1-accueil.png');

await page.click('.carte[data-nav="bibliotheque"]');
await dormir(400);
await shot('2-bibliotheque.png');

await page.fill('#recherche', 'ensemble');
await dormir(400);
await shot('3-recherche.png');

await page.fill('#recherche', '');
await page.click('#liste .item');
await dormir(400);
await shot('4-lecteur.png');

await page.click('#ecran-lecteur .barre [data-nav="bibliotheque"]');
await dormir(200);
await page.click('#ecran-bibliotheque .barre [data-nav="accueil"]');
await dormir(200);
await page.click('.carte[data-nav="connexion"]');
await dormir(300);
await page.click('#btn-maj');
await dormir(2500);
await shot('5-connexion-maj.png');

await page.click('#ecran-connexion .barre [data-nav="accueil"]');
await dormir(200);
await page.click('.carte[data-nav="apropos"]');
await dormir(400);
await shot('6-apropos.png');

await navigateur.close();
console.log('✅ 6 captures régénérées');

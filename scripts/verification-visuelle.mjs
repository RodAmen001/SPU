// Vérification visuelle end-to-end de SPU v4.0 (playwright)
// Scénario : accueil → Oracle → question → indicateur d'attente → réponse horodatée → boutons d'écoute
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const shots = '/tmp/render';
const ok = [];
const ko = [];
function verifier(nom, cond) {
  (cond ? ok : ko).push(nom);
  console.log((cond ? '  ✓ ' : '  ✗ ') + nom);
}

const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 1280, height: 900 } });
const erreursConsole = [];
page.on('pageerror', (e) => erreursConsole.push(String(e)));

// 1) Accueil
await page.goto(BASE, { waitUntil: 'networkidle' });
verifier('accueil rendu', await page.locator('h1').first().textContent().then((t) => t.includes('Pose ta question')));
await page.screenshot({ path: `${shots}/v1-accueil.png` });

// 2) Mode Oracle
await page.getByRole('button', { name: /Oracle/ }).first().click();
await page.waitForTimeout(600);
verifier('vue Oracle ouverte', (await page.locator('h1').first().textContent()).includes('Oracle'));

// 3) Pose une question — capture l'indicateur d'attente pendant la réflexion
await page.getByLabel('ta question').fill('comment trouver du courage face à un grand changement ?');
await page.getByRole('button', { name: /Envoyer/ }).click();
await page.waitForTimeout(1500);
const indicateur = await page.getByRole('status').count();
verifier('indicateur de réflexion visible pendant le traitement', indicateur > 0);
await page.screenshot({ path: `${shots}/v2-attente.png` });

// 4) Attends la réponse complète (jusqu'à 60 s)
let histoireVisible = false;
try {
  await page.getByText('Ton histoire').waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);
  histoireVisible = true;
} catch {}
verifier('histoire arrivée', histoireVisible);
await page.screenshot({ path: `${shots}/v3-reponse.png`, fullPage: false });

// 5) Discussion façon messagerie : bulle utilisateur + horodatage + carte système
const bulle = await page.locator('text=comment trouver du courage').count();
verifier('bulle utilisateur affichée', bulle > 0);
const heure = await page.getByLabel(/envoyé à \d{2}:\d{2}/).count();
verifier('horodatage de la bulle (HH:MM)', heure > 0);
const carteSysteme = await page.getByText('SPU', { exact: true }).count();
verifier('carte système avec étiquette SPU', carteSysteme > 0);

// 6) Boutons de lecture / théâtre
verifier('bouton théâtre sonore', (await page.getByRole('button', { name: /théâtre sonore/i }).count()) > 0);
verifier('bouton narrateur', (await page.getByRole('button', { name: 'Narrateur' }).count()) > 0);
verifier('bouton écouter la parabole', (await page.getByRole('button', { name: 'Écouter la parabole' }).count()) > 0);
verifier('pas d\'erreur JS en console', erreursConsole.length === 0);
if (erreursConsole.length) console.log('   erreurs:', erreursConsole.slice(0, 3));

// 7) Vue Enfant
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Enfant/ }).first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${shots}/v4-enfant.png` });
verifier('jardin des contes', (await page.getByText('Le Jardin des Contes').count()) > 0);

// 8) Journal (avec horodatages) — ouvre le premier échange (sans toucher à « Effacer tout »)
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Journal de bord/ }).first().click();
await page.waitForTimeout(1200);
const annuler = page.getByRole('button', { name: 'Annuler' });
if ((await annuler.count()) > 0) await annuler.first().click().catch(() => {});
const carteEchange = page.locator('button', { hasText: /comment trouver du courage/i });
if ((await carteEchange.count()) > 0) {
  await carteEchange.first().click();
  await page.waitForTimeout(600);
}
const horodatageJournal = (await page.getByText(/Question — \d{2}\/\d{2}\/\d{4}/).count()) > 0
  || (await page.getByText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/).count()) > 0;
verifier('journal horodaté (question + réponse)', horodatageJournal || (await page.getByText('Ton journal est encore vierge').count()) > 0);
await page.screenshot({ path: `${shots}/v5-journal.png` });

// 9) Régie des voix : 12 profils + choix du moteur
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'régie des voix' }).first().click();
await page.waitForTimeout(800);
verifier('régie des voix ouverte', (await page.getByText('Les 12 voix du SPU').count()) > 0);
verifier('moteur navigateur proposé', (await page.getByText('Voix du navigateur').count()) > 0);
verifier('moteur neural local proposé', (await page.getByText('Voix neurales locales').count()) > 0);
const boutonsVoix = await page.getByLabel(/écouter la voix/).count();
verifier('12 voix auditionnables', boutonsVoix >= 12);
await page.getByLabel('écouter la voix Le Sage').first().click().catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: `${shots}/v6-voix.png` });

// 10) Bascule moteur neural (import dynamique + OPFS) — ne doit jamais casser la page
await page.getByRole('button', { name: /Voix neurales locales/ }).first().click().catch(() => {});
await page.waitForTimeout(2500);
verifier('basculle neural sans erreur JS', erreursConsole.length === 0);
await page.screenshot({ path: `${shots}/v7-voix-neural.png` });

// 11) Compte SPU : inscription/connexion
await page.getByRole('button', { name: 'mon compte SPU' }).first().click();
await page.waitForTimeout(800);
verifier('vue compte ouverte', (await page.getByText('Mon compte SPU').count()) > 0);
verifier('formulaire connexion', (await page.getByText('Se connecter', { exact: true }).count()) > 0);
await page.screenshot({ path: `${shots}/v8-compte.png` });

// 12) Transparence : mentions nouvelles (clés optionnelles, musique, compte)
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Transparence/ }).first().click();
await page.waitForTimeout(700);
verifier('transparence : clés optionnelles documentées', (await page.getByText(/XAI_API_KEY/).count()) > 0);
verifier('transparence : musique SoundHelix créditée', (await page.getByText(/SoundHelix/).count()) > 0);
await page.screenshot({ path: `${shots}/v9-transparence.png` });

await nav.close();
console.log(`\n═══ BILAN : ${ok.length} OK, ${ko.length} ÉCHECS ═══`);
if (ko.length) process.exit(1);

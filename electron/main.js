// SPU — lanceur de fenêtre native (Windows / Mac / Linux) via Electron.
// Démarre le serveur Next.js embarqué, attend sa disponibilité, puis ouvre
// une fenêtre d'application (sans barre de navigateur). Construit par
// CREER-EXE-WINDOWS.bat / prepare-package.js — ne pas lancer directement.
const { app, BrowserWindow, shell, Menu } = require('electron');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.SPU_PORT) || 3000;
const URL_APP = `http://127.0.0.1:${PORT}`;
const RACINE = app.getAppPath(); // dossier de l'app (racine du projet empaqueté)

let serveur = null;
let fenetre = null;

function journaliser(...args) {
  console.log(`[SPU ${new Date().toLocaleTimeString()}]`, ...args);
}

/** Le serveur répond-t-il déjà (autre instance ou démarrage terminé) ? */
function serveurPret(delaiMs = 1500) {
  return new Promise((resoudre) => {
    const req = http.get(`${URL_APP}/api/health`, { timeout: delaiMs }, (r) => {
      r.resume();
      resoudre(r.statusCode === 200);
    });
    req.on('error', () => resoudre(false));
    req.on('timeout', () => { req.destroy(); resoudre(false); });
  });
}

function attendreServeur(maxMs = 120000) {
  const debut = Date.now();
  return new Promise((resoudre, rejeter) => {
    const sonder = async () => {
      if (await serveurPret(2000)) return resoudre(true);
      if (Date.now() - debut > maxMs) return rejeter(new Error('délai serveur dépassé'));
      setTimeout(sonder, 700);
    };
    sonder();
  });
}

/** Démarre le serveur Next.js : production standalone si disponible, sinon dev. */
function demarrerServeur() {
  const standalone = path.join(RACINE, '.next', 'standalone', 'server.js');
  const production = fs.existsSync(standalone);

  const args = production
    ? [standalone]
    : [path.join(RACINE, 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', String(PORT)];

  const options = {
    cwd: RACINE,
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: production ? 'production' : 'development',
      PORT: String(PORT),
      SPU_ELECTRON: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  };

  // Priorité au Node.js du système (l'installateur EXE exige Node) ;
  // repli : le moteur Node intégré d'Electron (ELECTRON_RUN_AS_NODE).
  const essais = [
    ['node', args, null],
    [process.execPath, args, { ...options.env, ELECTRON_RUN_AS_NODE: '1' }],
  ];

  return new Promise((resoudre, rejeter) => {
    let index = 0;
    const tenter = () => {
      if (index >= essais.length) return rejeter(new Error('aucun runtime Node disponible'));
      const [cmd, a, envSup] = essais[index++];
      journaliser(`démarrage du serveur (${production ? 'production' : 'dev'}) via ${path.basename(cmd)}…`);
      const enfant = spawn(cmd, a, envSup ? { ...options, env: envSup } : options);
      let t0 = Date.now();
      enfant.stdout?.on('data', (d) => journaliser(d.toString().trim().split('\n')[0]));
      enfant.stderr?.on('data', (d) => {
        const t = d.toString().trim();
        if (t) journaliser('! ', t.split('\n')[0].slice(0, 200));
      });
      enfant.on('error', (e) => {
        journaliser(`runtime ${cmd} indisponible (${e.message}) — essai suivant…`);
        tenter();
      });
      enfant.on('close', (code) => {
        if (code !== 0 && Date.now() - t0 < 4000 && index < essais.length) tenter();
      });
      serveur = enfant;
      // Valide ce runtime s'il survit 6 s sans crash immédiat
      setTimeout(() => {
        if (!enfant.killed) resoudre();
      }, 6000);
    };
    tenter();
  });
}

async function ouvrirFenetre() {
  fenetre = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: '#FAF6EC',
    title: 'SPU — Système Parabolique Universel',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  Menu.setApplicationMenu(null);
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(URL_APP)) shell.openExternal(url);
    return { action: 'deny' };
  });
  await fenetre.loadURL(URL_APP);
  fenetre.on('closed', () => { fenetre = null; });
}

const aLeVerrou = app.requestSingleInstanceLock();
if (!aLeVerrou) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (fenetre) { if (fenetre.isMinimized()) fenetre.restore(); fenetre.focus(); }
  });

  app.whenReady().then(async () => {
    try {
      if (!(await serveurPret(2000))) {
        await demarrerServeur();
        journaliser('attente de la disponibilité du serveur…');
        await attendreServeur();
      } else {
        journaliser('serveur déjà en cours — connexion directe');
      }
      await ouvrirFenetre();
      journaliser(`fenêtre ouverte sur ${URL_APP}`);
    } catch (e) {
      journaliser('échec :', e.message);
      const f = new BrowserWindow({ width: 560, height: 360, backgroundColor: '#FAF6EC', autoHideMenuBar: true });
      f.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(
        `<body style="font-family:sans-serif;background:#FAF6EC;color:#3A3226;padding:28px">` +
        `<h2 style="margin-top:0">Le SPU n'a pas pu démarrer</h2>` +
        `<p>Détail : ${e.message}</p>` +
        `<p>Ouvre le dossier de l'application et lance <b>DEMARRER-WINDOWS.bat</b> pour voir le journal complet.</p></body>`,
      )}`);
    }
  });

  app.on('window-all-closed', () => {
    if (serveur) {
      try { serveur.kill(); } catch { /* déjà parti */ }
      // Windows : arrêt de l'arborescence (node enfant compris)
      if (process.platform === 'win32' && serveur.pid) {
        spawn('taskkill', ['/pid', String(serveur.pid), '/T', '/F'], { windowsHide: true });
      }
    }
    app.quit();
  });
}

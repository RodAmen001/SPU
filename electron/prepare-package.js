// Prépare package.json pour la construction de l'EXE Windows (electron-builder).
// Idempotent : lancé par CREER-EXE-WINDOWS.bat juste avant electron-builder.
// Stratégie de taille : on exclut les moteurs inutiles sur Windows
// (voix-piper = binaire Linux) — l'app utilise alors les voix du navigateur,
// et l'EXE reste léger (~150 Mo installé).
const fs = require('fs');
const path = require('path');

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.main = 'electron/main.js';
pkg.build = {
  appId: 'org.spu.universel',
  productName: 'SPU',
  copyright: 'SPU — Système Parabolique Universel',
  directories: { output: 'dist-exe' },
  asar: false, // les spawns (next, piper) accèdent aux fichiers directement
  files: [
    '**/*',
    '!dist-exe',
    '!node_modules/.cache',
    '!.next/cache',
    '!download',
    '!examples',
    '!voix-piper',
    '!public/voix-neurales',
    '!*.zip',
    '!dev.log',
    '!server.log',
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'public/icons/icon-512.png',
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'SPU',
  },
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('✓ package.json prêt pour electron-builder (main + build, sans moteurs Linux)');

// Build production multiplateforme (Windows / Mac / Linux) du SPU.
// Remplace les commandes `cp` du shell, absentes de l'invite Windows.
// Étapes : next build → assemble .next/standalone (static + public + voix-piper).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RACINE = process.cwd();
const STANDALONE = path.join(RACINE, '.next', 'standalone');

function copier(src, dest) {
  fs.cpSync(src, dest, { recursive: true, force: true });
}

console.log('[1/4] next build (production, standalone)...');
execSync('npx next build', { stdio: 'inherit', cwd: RACINE });

console.log('[2/4] Copie des fichiers statiques...');
copier(path.join(RACINE, '.next', 'static'), path.join(STANDALONE, '.next', 'static'));
copier(path.join(RACINE, 'public'), path.join(STANDALONE, 'public'));

console.log('[3/4] Moteur de voix Piper (liens symboliques préservés si possible)...');
try {
  fs.rmSync(path.join(STANDALONE, 'voix-piper'), { recursive: true, force: true });
  // verbatimSymlinks: conserve les liens .so (Node >= 20) ; sinon copie brute
  copier(path.join(RACINE, 'voix-piper'), path.join(STANDALONE, 'voix-piper'));
} catch {
  console.log('      (voix-piper absent — les voix du navigateur seront utilisées)');
}

console.log('[4/4] Base de données embarquée...');
if (fs.existsSync(path.join(RACINE, 'db'))) {
  copier(path.join(RACINE, 'db'), path.join(STANDALONE, 'db'));
}

console.log('\n✓ Build standalone prêt : .next/standalone/server.js');
console.log('  Démarrage : NODE_ENV=production node .next/standalone/server.js');

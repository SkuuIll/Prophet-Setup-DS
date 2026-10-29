'use strict';

// Valida el manifest y los gitlinks, sin descargar código ni ejecutar juegos.
// --require-checkout verifica, además, que los cuatro juegos estén inicializados.
const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requireCheckout = process.argv.includes('--require-checkout');
const expected = [
  { path: 'web/public/games/2048', url: 'https://github.com/gabrielecirulli/2048.git', sha: '478b6ec346e3787f589e4af751378d06ded4cbbc' },
  { path: 'web/public/games/clumsybird', url: 'https://github.com/ellisonleao/clumsy-bird.git', sha: 'fae3d487d5102af29fb3f78431cbd45e9b83aed3' },
  { path: 'web/public/games/hextris', url: 'https://github.com/Hextris/hextris.git', sha: '3f4847dc8fd7dab3d1c87e6324b9159d92fbd396' },
  { path: 'web/public/games/pacman', url: 'https://github.com/mumuy/pacman.git', sha: '8a96194f7cf0102db2d7f0e69450166beb1d7116' },
];

function git(args, cwd = root) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

let failures = 0;
for (const entry of expected) {
  try {
    const url = git(['config', '--file', '.gitmodules', '--get', `submodule.${entry.path}.url`]);
    const declaredPath = git(['config', '--file', '.gitmodules', '--get', `submodule.${entry.path}.path`]);
    const index = git(['ls-files', '--stage', '--', entry.path]);
    const match = /^160000 ([a-f0-9]{40}) 0\t(.+)$/.exec(index);
    if (url !== entry.url || declaredPath !== entry.path) {
      throw new Error('La URL o ruta de .gitmodules no coincide con el origen verificado');
    }
    if (!match || match[1] !== entry.sha || match[2] !== entry.path) {
      throw new Error('El índice de Git no contiene el gitlink esperado (modo 160000 y SHA)');
    }
    if (requireCheckout) {
      const checkout = path.join(root, entry.path);
      if (!existsSync(path.join(checkout, 'index.html'))) {
        throw new Error('Falta index.html: ejecutá git submodule update --init --recursive');
      }
      const actual = git(['rev-parse', 'HEAD'], checkout);
      if (actual !== entry.sha) {
        throw new Error(`El submódulo quedó en ${actual}; se esperaba ${entry.sha}`);
      }
    }
    console.log(`OK  ${entry.path}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${entry.path}: ${error.message}`);
  }
}
if (failures) {
  console.error(`Fallaron ${failures} de ${expected.length} verificaciones.`);
  process.exitCode = 1;
} else {
  console.log(`Validados ${expected.length} gitlinks${requireCheckout ? ' y sus checkouts' : ''}.`);
}

'use strict';

const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const fixtures = [
  ['2048', '478b6ec346e3787f589e4af751378d06ded4cbbc'],
  ['clumsybird', 'fae3d487d5102af29fb3f78431cbd45e9b83aed3'],
  ['hextris', '3f4847dc8fd7dab3d1c87e6324b9159d92fbd396'],
  ['pacman', '8a96194f7cf0102db2d7f0e69450166beb1d7116'],
];

function git(cwd, args) {
  execFileSync('git', args, { cwd, stdio: 'pipe' });
}

function fixture() {
  const directory = mkdtempSync(path.join(tmpdir(), 'prophet-gitlinks-'));
  git(directory, ['init', '-q']);
  mkdirSync(path.join(directory, 'scripts'));
  copyFileSync(path.join(root, 'scripts', 'verify_game_submodules.js'), path.join(directory, 'scripts', 'verify_game_submodules.js'));
  copyFileSync(path.join(root, '.gitmodules'), path.join(directory, '.gitmodules'));
  for (const [name, sha] of fixtures) {
    git(directory, ['update-index', '--add', '--cacheinfo', '160000,' + sha + ',web/public/games/' + name]);
  }
  return directory;
}

function verify(directory, args = []) {
  return spawnSync(process.execPath, ['scripts/verify_game_submodules.js', ...args], {
    cwd: directory,
    encoding: 'utf8',
  });
}

test('los cuatro gitlinks y sus URLs coinciden con el manifiesto', () => {
  const directory = fixture();
  try {
    const result = verify(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Validados 4 gitlinks/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rechaza un origen modificado', () => {
  const directory = fixture();
  try {
    const manifest = path.join(directory, '.gitmodules');
    const original = readFileSync(manifest, 'utf8');
    assert.match(original, /https:\/\/github\.com\/mumuy\/pacman\.git/);
    writeFileSync(manifest, original.replace('https://github.com/mumuy/pacman.git', 'https://invalid.example/pacman.git'));
    const result = verify(directory);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /FAIL web\/public\/games\/pacman/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('--require-checkout falla cuando faltan los juegos', () => {
  const directory = fixture();
  try {
    const result = verify(directory, ['--require-checkout']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Fallaron 4 de 4 verificaciones/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

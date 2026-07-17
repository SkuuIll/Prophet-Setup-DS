#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'data', 'logs']);

function collectJavaScriptFiles(directory, files = []) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) collectJavaScriptFiles(fullPath, files);
        else if (entry.isFile() && entry.name.endsWith('.js')) files.push(fullPath);
    }
    return files;
}

const files = collectJavaScriptFiles(root);
const failures = [];

for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
        encoding: 'utf8',
        timeout: 15000,
    });
    if (result.status !== 0) {
        failures.push({
            file: path.relative(root, file),
            error: (result.stderr || result.stdout || 'Error desconocido').trim(),
        });
    }
}

if (failures.length) {
    for (const failure of failures) {
        console.error(`\n${failure.file}\n${failure.error}`);
    }
    console.error(`\nFalló la sintaxis en ${failures.length} archivo(s).`);
    process.exit(1);
}

console.log(`Sintaxis válida: ${files.length} archivos JavaScript.`);

#!/usr/bin/env node

const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const password = process.env.LAVALINK_PASSWORD;
if (!password) {
    console.error('LAVALINK_PASSWORD no está configurado.');
    process.exit(1);
}

const lavalinkDirectory = path.join(__dirname, '..', 'Lavalink');
const child = spawn('java', ['-jar', 'Lavalink.jar'], {
    cwd: lavalinkDirectory,
    env: {
        ...process.env,
        LAVALINK_SERVER_PASSWORD: password,
        LAVALINK_BIND_ADDRESS: process.env.LAVALINK_BIND_ADDRESS || '127.0.0.1',
        SPOTIFY_ENABLED: process.env.SPOTIFY_ENABLED || 'false',
    },
    stdio: 'inherit',
});

function forwardSignal(signal) {
    if (!child.killed) child.kill(signal);
}

process.on('SIGTERM', () => forwardSignal('SIGTERM'));
process.on('SIGINT', () => forwardSignal('SIGINT'));

child.on('error', error => {
    console.error(`No se pudo iniciar Lavalink: ${error.message}`);
    process.exit(1);
});

child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
});

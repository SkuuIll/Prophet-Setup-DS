#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const temporaryPath = `${envPath}.tmp`;
const password = crypto.randomBytes(36).toString('base64url');
const current = fs.readFileSync(envPath, 'utf8');
const line = `LAVALINK_PASSWORD=${password}`;
const updated = /^LAVALINK_PASSWORD=.*$/m.test(current)
    ? current.replace(/^LAVALINK_PASSWORD=.*$/m, line)
    : `${current.trimEnd()}\n${line}\n`;

fs.writeFileSync(temporaryPath, updated, { encoding: 'utf8', mode: 0o600 });
fs.renameSync(temporaryPath, envPath);
fs.chmodSync(envPath, 0o600);
console.log('LAVALINK_PASSWORD rotada en .env.');

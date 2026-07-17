#!/usr/bin/env node

const { spawnSync } = require('child_process');

const marker = '# ProphetBot-auto-update';
const cronLine = `*/10 * * * * /root/ProphetBot/scripts/auto_update.sh >> /root/ProphetBot/logs/auto-update.log 2>&1 ${marker}`;
const currentResult = spawnSync('crontab', ['-l'], { encoding: 'utf8' });
const current = currentResult.status === 0 ? currentResult.stdout : '';
const lines = current
    .split('\n')
    .filter(line => line.trim() && !line.includes(marker));
lines.push(cronLine);

const installResult = spawnSync('crontab', ['-'], {
    input: `${lines.join('\n')}\n`,
    encoding: 'utf8',
});

if (installResult.status !== 0) {
    console.error(installResult.stderr || 'No se pudo instalar la tarea automática.');
    process.exit(1);
}

console.log('Auto-update instalado: comprobación cada 10 minutos.');

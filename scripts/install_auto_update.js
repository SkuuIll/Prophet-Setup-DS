#!/usr/bin/env node
// Instala UNA VEZ el sondeo Git -> VPS con cron, sin guardar credenciales en GitHub.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const marker = '# ProphetBot-auto-update';
const allowedIntervals = new Set([1, 2, 5, 10, 15, 30, 60]);
const interval = Number.parseInt(process.env.AUTO_UPDATE_INTERVAL_MINUTES || '2', 10);
if (!allowedIntervals.has(interval)) {
    console.error('AUTO_UPDATE_INTERVAL_MINUTES debe ser 1, 2, 5, 10, 15, 30 o 60.');
    process.exit(1);
}
const quote = value => "'" + value.replace(/'/g, "'\\''") + "'";
fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
const schedule = interval === 60 ? '0 * * * *' : `*/${interval} * * * *`;
const autoScript = quote(path.join(__dirname, 'auto_update.sh'));
const logFile = quote(path.join(root, 'logs', 'auto-update.log'));
const cronLine = `${schedule} /usr/bin/env bash ${autoScript} >> ${logFile} 2>&1 ${marker}`;

const currentResult = spawnSync('crontab', ['-l'], { encoding: 'utf8' });
if (currentResult.status !== 0 && !/no crontab for/i.test(currentResult.stderr || '')) {
    console.error(currentResult.stderr || 'No fue posible leer crontab.');
    process.exit(1);
}
const lines = (currentResult.stdout || '').split('\n')
    .filter(line => line.trim() && !line.includes(marker));
lines.push(cronLine);

const result = spawnSync('crontab', ['-'], {
    input: lines.join('\n') + '\n',
    encoding: 'utf8',
});
if (result.status !== 0) {
    console.error(result.stderr || 'No se pudo instalar la tarea automática.');
    process.exit(1);
}
console.log(`Autoactualización de ${root} instalada. Intervalo: ${interval} min.`);
console.log('La primera actualización ocurre después de un commit fusionado a main.');

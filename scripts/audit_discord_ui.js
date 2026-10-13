#!/usr/bin/env node
// Inventario estático de interfaces de comandos. No ejecuta ni registra comandos.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', 'commands');

function auditCommandSources(root = ROOT) {
    const files = [];
    if (!fs.existsSync(root)) return { files, total: 0, redesigned: 0, pending: 0, categories: {} };
    for (const category of fs.readdirSync(root)) {
        const folder = path.join(root, category);
        if (!fs.statSync(folder).isDirectory()) continue;
        for (const filename of fs.readdirSync(folder).filter(x => x.endsWith('.js'))) {
            const source = fs.readFileSync(path.join(folder, filename), 'utf8');
            const redesigned = source.includes('discordUI');
            files.push({
                category, command: filename.replace(/\.js$/, ''), path: category + '/' + filename,
                themeIntegrated: redesigned,
                embedConstructors: (source.match(/new EmbedBuilder\(/g) || []).length,
                replyCalls: (source.match(/\binteraction\.(?:reply|editReply|followUp|update)\(/g) || []).length,
                privateReplyLegacy: (source.match(/ephemeral:\s*true/g) || []).length,
            });
        }
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    const categories = {};
    for (const item of files) {
        if (!categories[item.category]) categories[item.category] = { total: 0, themeIntegrated: 0 };
        categories[item.category].total += 1;
        if (item.themeIntegrated) categories[item.category].themeIntegrated += 1;
    }
    const redesigned = files.filter(x => x.themeIntegrated).length;
    return { total: files.length, redesigned, pending: files.length - redesigned, categories, files };
}

if (require.main === module) {
    const result = auditCommandSources();
    if (!process.argv.includes('--details')) delete result.files;
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

module.exports = { auditCommandSources };

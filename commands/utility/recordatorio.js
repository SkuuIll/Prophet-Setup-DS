// ═══ COMANDO: /recordatorio ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

// Almacenamiento en memoria de recordatorios activos
// Estructura: Map<userId, Array<{id, texto, expira, timer}>>
const recordatorios = new Map();
let nextId = 1;

function parseTiempo(str) {
    // Acepta formatos como: 10m, 2h, 1d, 30s, 1h30m, 2d4h
    const regex = /(\d+)\s*(s|seg|segundo[s]?|m|min|minuto[s]?|h|hora[s]?|d|dia[s]?|día[s]?)/gi;
    let totalMs = 0;
    let match;
    while ((match = regex.exec(str)) !== null) {
        const val = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit.startsWith('s')) totalMs += val * 1000;
        else if (unit.startsWith('m')) totalMs += val * 60 * 1000;
        else if (unit.startsWith('h')) totalMs += val * 3600 * 1000;
        else if (unit.startsWith('d') || unit.startsWith('d')) totalMs += val * 86400 * 1000;
    }
    return totalMs;
}

function formatTiempo(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (sec > 0 && d === 0 && h === 0) parts.push(`${sec}s`);
    return parts.join(' ') || '0s';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recordatorio')
        .setDescription('⏰ Programar un recordatorio que te llegará por DM')
        .addStringOption(o =>
            o.setName('tiempo')
                .setDescription('¿En cuánto tiempo? Ej: 10m, 2h, 1d, 1h30m')
                .setRequired(true))
        .addStringOption(o =>
            o.setName('mensaje')
                .setDescription('¿Qué querés recordar?')
                .setRequired(true)
                .setMaxLength(300)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const tiempoStr = interaction.options.getString('tiempo');
        const mensaje = interaction.options.getString('mensaje');
        const userId = interaction.user.id;

        const ms = parseTiempo(tiempoStr);

        // Validaciones
        if (ms < 10000) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription('> ❌ **Tiempo mínimo:** 10 segundos.\n> Ej: `10s`, `5m`, `2h`, `1d`')
                ]
            });
        }
        if (ms > 7 * 24 * 3600 * 1000) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription('> ❌ **Tiempo máximo:** 7 días.')
                ]
            });
        }

        // Límite de recordatorios por usuario
        const userRecs = recordatorios.get(userId) || [];
        if (userRecs.length >= 10) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.WARN || 0xFFB74D)
                    .setDescription(`> ⚠️ **Límite alcanzado:** tenés ${userRecs.length}/10 recordatorios activos.\n> Usá \`/recordatorio-lista\` para cancelar alguno.`)
                ]
            });
        }

        const id = nextId++;
        const expira = Date.now() + ms;
        const expiraTs = Math.floor(expira / 1000);

        // Programar el envío del DM
        const timer = setTimeout(async () => {
            try {
                const user = await interaction.client.users.fetch(userId);
                await user.send({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                        .setAuthor({ name: '⏰  Recordatorio · Prophet Bot' })
                        .setDescription(
                            `> 📌 **${mensaje}**\n\n` +
                            `> Este recordatorio fue programado en **${interaction.guild?.name || 'tu servidor'}**.`
                        )
                        .setFooter({ text: `Recordatorio #${id}  ·  Prophet Bot` })
                        .setTimestamp()
                    ]
                });
            } catch (e) {
                // DMs cerrados — no podemos hacer nada
            }

            // Limpiar de la lista
            const list = recordatorios.get(userId) || [];
            const idx = list.findIndex(r => r.id === id);
            if (idx !== -1) list.splice(idx, 1);
            if (list.length === 0) recordatorios.delete(userId);
            else recordatorios.set(userId, list);
        }, ms);

        userRecs.push({ id, texto: mensaje, expira, timer });
        recordatorios.set(userId, userRecs);

        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                .setAuthor({ name: '⏰  Recordatorio programado', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `> 📌 **${mensaje}**\n\n` +
                    `> 🕐 Te avisaré <t:${expiraTs}:R> (\`${formatTiempo(ms)}\`)\n` +
                    `> 📩 Llegará a tu **DM** — asegurate de tenerlos abiertos.`
                )
                .addFields(
                    { name: '🆔 ID', value: `\`#${id}\``, inline: true },
                    { name: '⏱️ Cuándo', value: `<t:${expiraTs}:F>`, inline: true },
                    { name: '📋 Activos', value: `\`${userRecs.length}/10\``, inline: true }
                )
                .setFooter({ text: 'Usá /recordatorio-lista para ver o cancelar los tuyos' })
                .setTimestamp()
            ]
        });
    },

    // Exponer el mapa para que /recordatorio-lista pueda acceder
    recordatorios,
};

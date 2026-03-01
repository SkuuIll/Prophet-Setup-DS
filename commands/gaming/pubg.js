// ═══ COMANDO: /pubg ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const pubgApi = require('../../modules/pubgApi');

const MODE_LABELS = {
    'solo': '🎯 Solo TPP',
    'solo-fpp': '🎯 Solo FPP',
    'duo': '👥 Duo TPP',
    'duo-fpp': '👥 Duo FPP',
    'squad': '🛡️ Squad TPP',
    'squad-fpp': '🛡️ Squad FPP',
};

const PLATFORM_EMOJIS = {
    'steam': '🖥️',
    'psn': '🎮',
    'xbox': '🟢',
    'kakao': '🇰🇷',
    'stadia': '☁️',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pubg')
        .setDescription('🔫 Ver estadísticas de un jugador de PUBG')
        .addStringOption(opt =>
            opt.setName('nombre')
                .setDescription('Nombre del jugador en PUBG')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('plataforma')
                .setDescription('Plataforma del jugador')
                .setRequired(false)
                .addChoices(
                    { name: '🖥️ Steam (PC)', value: 'steam' },
                    { name: '🎮 PlayStation', value: 'psn' },
                    { name: '🟢 Xbox', value: 'xbox' },
                ))
        .addStringOption(opt =>
            opt.setName('modo')
                .setDescription('Modo de juego a consultar')
                .setRequired(false)
                .addChoices(
                    { name: '🛡️ Squad FPP', value: 'squad-fpp' },
                    { name: '🛡️ Squad TPP', value: 'squad' },
                    { name: '👥 Duo FPP', value: 'duo-fpp' },
                    { name: '👥 Duo TPP', value: 'duo' },
                    { name: '🎯 Solo FPP', value: 'solo-fpp' },
                    { name: '🎯 Solo TPP', value: 'solo' },
                )),

    async execute(interaction) {
        const playerName = interaction.options.getString('nombre');
        const platform = interaction.options.getString('plataforma') || 'steam';
        const mode = interaction.options.getString('modo') || 'squad-fpp';

        await interaction.deferReply();

        try {
            const { player, stats } = await pubgApi.getPlayerStats(playerName, platform);
            const modeStats = stats[mode];

            if (!modeStats || modeStats.roundsPlayed === 0) {
                // Buscar un modo que tenga datos
                const availableModes = Object.entries(stats)
                    .filter(([, s]) => s.roundsPlayed > 0)
                    .sort((a, b) => b[1].roundsPlayed - a[1].roundsPlayed);

                if (availableModes.length === 0) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor(config.COLORES.WARN)
                            .setDescription(`> ⚠️ **${player.name}** no tiene partidas registradas en ningún modo.`)
                            .setFooter({ text: 'PUBG Stats • Prophet Bot' })
                        ]
                    });
                }

                // Mostrar stats del modo más jugado
                const [bestMode, bestStats] = availableModes[0];
                return interaction.editReply({
                    embeds: [buildStatsEmbed(player, bestStats, bestMode, platform,
                        `⚠️ Sin datos en ${MODE_LABELS[mode] || mode}. Mostrando ${MODE_LABELS[bestMode] || bestMode}:`)]
                });
            }

            await interaction.editReply({
                embeds: [buildStatsEmbed(player, modeStats, mode, platform)]
            });

        } catch (error) {
            const errorMessages = {
                'PLAYER_NOT_FOUND': `> ❌ No se encontró al jugador **${playerName}** en **${platform}**.\n> Verificá que el nombre sea exacto (mayúsculas/minúsculas importan).`,
                'API_KEY_INVALID': '> ❌ Error de autenticación con la API de PUBG. Contacta al administrador.',
                'RATE_LIMITED': '> ⏳ Demasiadas consultas. Esperá unos segundos e intentá de nuevo.',
            };

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setDescription(errorMessages[error.message] || `> ❌ Error al consultar stats: ${error.message}`)
                .setFooter({ text: 'PUBG Stats • Prophet Bot' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};

function buildStatsEmbed(player, stats, mode, platform, note = '') {
    const platEmoji = PLATFORM_EMOJIS[platform] || '🎮';
    const modeLabel = MODE_LABELS[mode] || mode;

    const embed = new EmbedBuilder()
        .setColor(0xF2A900) // Color dorado PUBG
        .setAuthor({
            name: `${player.name}  ·  PUBG Stats`,
            iconURL: 'https://cdn2.unrealengine.com/14br-zenyatta-keyart-3840x2160-3840x2160-a02c37c3c2f2.jpg',
        })
        .setDescription(
            (note ? `${note}\n\n` : '') +
            `${platEmoji} **Plataforma:** ${platform.toUpperCase()}  ·  ${modeLabel}\n` +
            `> 🎮 **${stats.roundsPlayed}** partidas jugadas  ·  **${stats.daysActive}** días activo`
        )
        .addFields(
            {
                name: '⚔️ Combate',
                value: [
                    `> 🔪 **Kills:** ${stats.kills.toLocaleString()}`,
                    `> 📊 **K/D:** ${stats.kdRatio}`,
                    `> 🎯 **Headshots:** ${stats.headshotKills.toLocaleString()} (${stats.headshotRate}%)`,
                    `> 💥 **Daño total:** ${stats.damageDealt.toLocaleString()}`,
                    `> 📈 **Daño/partida:** ${stats.avgDamage}`,
                    `> 🏹 **Kill más lejano:** ${stats.longestKill}m`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '🏆 Rendimiento',
                value: [
                    `> 🥇 **Wins:** ${stats.wins}`,
                    `> 📊 **Win Rate:** ${stats.winRate}%`,
                    `> 🔟 **Top 10:** ${stats.top10s}`,
                    `> 🤝 **Assists:** ${stats.assists}`,
                    `> 🔥 **Racha máx:** ${stats.maxKillStreaks}`,
                    `> 💀 **Suicidios:** ${stats.suicides}`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: false,
            },
            {
                name: '🏃 Supervivencia',
                value: [
                    `> ⏱️ **Tiempo total:** ${stats.timeSurvived} min`,
                    `> 🚶 **A pie:** ${stats.walkDistance} km`,
                    `> 🚗 **En vehículo:** ${stats.rideDistance} km`,
                    `> 🏊 **Nadando:** ${stats.swimDistance} km`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '🎒 Soporte',
                value: [
                    `> 💊 **Heals:** ${stats.heals}`,
                    `> ⚡ **Boosts:** ${stats.boosts}`,
                    `> 🔄 **Revives:** ${stats.revives}`,
                    `> 🔫 **Armas recogidas:** ${stats.weaponsAcquired}`,
                ].join('\n'),
                inline: true,
            },
        )
        .setFooter({ text: `PUBG Stats  ·  ${modeLabel}  ·  Prophet Bot` })
        .setTimestamp();

    return embed;
}

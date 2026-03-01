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

const PLATFORM_LABELS = {
    'steam': '🖥️ Steam',
    'psn': '🎮 PlayStation',
    'xbox': '🟢 Xbox',
    'kakao': '🇰🇷 Kakao',
    'stadia': '☁️ Stadia',
};

// Logo oficial de PUBG
const PUBG_LOGO = 'https://seeklogo.com/images/P/pubg-logo-4FC7D5F8C1-seeklogo.com.png';
const PUBG_BANNER = 'https://cdn.akamai.steamstatic.com/steam/apps/578080/header.jpg';

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
                const availableModes = Object.entries(stats)
                    .filter(([, s]) => s.roundsPlayed > 0)
                    .sort((a, b) => b[1].roundsPlayed - a[1].roundsPlayed);

                if (availableModes.length === 0) {
                    return interaction.editReply({
                        embeds: [new EmbedBuilder()
                            .setColor(config.COLORES.WARN)
                            .setAuthor({ name: 'PUBG Stats', iconURL: PUBG_LOGO })
                            .setDescription(
                                `> ⚠️ **${player.name}** no tiene partidas registradas en ningún modo.\n` +
                                `> Intentá con otro nombre o verificá la plataforma.`
                            )
                            .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' })
                            .setTimestamp()
                        ]
                    });
                }

                const [bestMode, bestStats] = availableModes[0];
                const note = `> ⚠️ *Sin datos en ${MODE_LABELS[mode] || mode}. Mostrando **${MODE_LABELS[bestMode] || bestMode}** (modo más jugado):*`;
                return interaction.editReply({
                    embeds: [buildStatsEmbed(player, bestStats, bestMode, platform, note)]
                });
            }

            await interaction.editReply({
                embeds: [buildStatsEmbed(player, modeStats, mode, platform)]
            });

        } catch (error) {
            const errorMessages = {
                'PLAYER_NOT_FOUND': `> ❌ No se encontró al jugador **${playerName}** en **${PLATFORM_LABELS[platform] || platform}**.\n> Verificá que el nombre sea exacto (mayúsculas/minúsculas importan).`,
                'API_KEY_INVALID': '> ❌ Error de autenticación con la API de PUBG.\n> Contactá al administrador del bot.',
                'RATE_LIMITED': '> ⏳ Demasiadas consultas a la API de PUBG.\n> Esperá **1 minuto** e intentá de nuevo.',
            };

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setAuthor({ name: 'PUBG Stats  ·  Error', iconURL: PUBG_LOGO })
                .setDescription(errorMessages[error.message] || `> ❌ Error inesperado: \`${error.message}\``)
                .setFooter({ text: 'Prophet Bot  ·  PUBG Stats' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};

function buildStatsEmbed(player, stats, mode, platform, note = '') {
    const modeLabel = MODE_LABELS[mode] || mode;
    const platLabel = PLATFORM_LABELS[platform] || platform;

    // Determinar "rating" visual según K/D
    const kd = parseFloat(stats.kdRatio);
    let kdBadge = '⬜';
    if (kd >= 3) kdBadge = '🔥';
    else if (kd >= 2) kdBadge = '⭐';
    else if (kd >= 1.5) kdBadge = '🟢';
    else if (kd >= 1) kdBadge = '🟡';
    else kdBadge = '🔴';

    // Win rate badge
    const wr = parseFloat(stats.winRate);
    let wrBadge = '⬜';
    if (wr >= 15) wrBadge = '👑';
    else if (wr >= 10) wrBadge = '⭐';
    else if (wr >= 5) wrBadge = '🟢';
    else if (wr >= 2) wrBadge = '🟡';
    else wrBadge = '🔴';

    const embed = new EmbedBuilder()
        .setColor(0xF2A900)
        .setAuthor({
            name: `${player.name}`,
            iconURL: PUBG_LOGO,
        })
        .setThumbnail(PUBG_LOGO)
        .setDescription(
            (note ? `${note}\n\n` : '') +
            `╔══════════════════════════════╗\n` +
            `║  ${platLabel}  ·  ${modeLabel}\n` +
            `╚══════════════════════════════╝\n\n` +
            `> 🎮 **${stats.roundsPlayed.toLocaleString()}** partidas  ·  📅 **${stats.daysActive}** días activo\n` +
            `> ${kdBadge} **K/D:** \`${stats.kdRatio}\`  ·  ${wrBadge} **Win Rate:** \`${stats.winRate}%\``
        )
        .addFields(
            {
                name: '```⚔️  C O M B A T E```',
                value: [
                    `╠ 🔪 **Kills:** \`${stats.kills.toLocaleString()}\``,
                    `╠ 🎯 **Headshots:** \`${stats.headshotKills.toLocaleString()}\` (${stats.headshotRate}%)`,
                    `╠ 💥 **Daño total:** \`${stats.damageDealt.toLocaleString()}\``,
                    `╠ 📈 **Daño/Partida:** \`${stats.avgDamage}\``,
                    `╠ 🏹 **Kill más lejano:** \`${stats.longestKill}m\``,
                    `╚ 🔥 **Racha máxima:** \`${stats.maxKillStreaks}\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '```🏆  R E N D I M I E N T O```',
                value: [
                    `╠ 🥇 **Wins:** \`${stats.wins}\``,
                    `╠ 🔟 **Top 10:** \`${stats.top10s}\``,
                    `╠ 🤝 **Assists:** \`${stats.assists}\``,
                    `╠ 💀 **Suicidios:** \`${stats.suicides}\``,
                    `╠ 🚗 **Vehículos destruidos:** \`${stats.vehicleDestroys}\``,
                    `╚ 🤕 **Team Kills:** \`${stats.teamKills}\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '\u200b',
                value: '> ─────────── **📊 Detalles** ───────────',
                inline: false,
            },
            {
                name: '```🏃  S U P E R V I V E N C I A```',
                value: [
                    `╠ ⏱️ **Tiempo total:** \`${stats.timeSurvived} min\``,
                    `╠ 🚶 **A pie:** \`${stats.walkDistance} km\``,
                    `╠ 🚗 **Vehículo:** \`${stats.rideDistance} km\``,
                    `╚ 🏊 **Nadando:** \`${stats.swimDistance} km\``,
                ].join('\n'),
                inline: true,
            },
            {
                name: '```🎒  S O P O R T E```',
                value: [
                    `╠ 💊 **Heals usados:** \`${stats.heals}\``,
                    `╠ ⚡ **Boosts usados:** \`${stats.boosts}\``,
                    `╠ 🔄 **Revives:** \`${stats.revives}\``,
                    `╚ 🔫 **Armas recogidas:** \`${stats.weaponsAcquired}\``,
                ].join('\n'),
                inline: true,
            },
        )
        .setImage(PUBG_BANNER)
        .setFooter({
            text: `Prophet Bot  ·  PUBG Stats  ·  ${modeLabel}`,
            iconURL: PUBG_LOGO,
        })
        .setTimestamp();

    return embed;
}

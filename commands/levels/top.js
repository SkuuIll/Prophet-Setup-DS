// ═══ COMANDO: /top (Leaderboard de Niveles mejorado) ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const MEDALLAS = ['🥇', '🥈', '🥉'];
const RANGOS = [
    { max: 5, label: '🌱 Novato', color: 0x8BC34A },
    { max: 10, label: '⚔️ Guerrero', color: 0x42A5F5 },
    { max: 20, label: '🔥 Veterano', color: 0xFF7043 },
    { max: 35, label: '💎 Élite', color: 0xAB47BC },
    { max: 50, label: '👑 Leyenda', color: 0xFFD700 },
    { max: 999, label: '🌟 Dios', color: 0xFFFFFF },
];

function getRangoLabel(level) {
    return RANGOS.find(r => level <= r.max)?.label || '🌟 Dios';
}

function miniBar(xp, xpSig) {
    const pct = Math.min(xp / xpSig, 1);
    const filled = Math.round(pct * 6);
    return '▰'.repeat(filled) + '▱'.repeat(6 - filled);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('🏆 Leaderboard de niveles del servidor')
        .addIntegerOption(o =>
            o.setName('cantidad')
                .setDescription('Cantidad a mostrar (5-25)')
                .setMinValue(5)
                .setMaxValue(25)),

    async execute(interaction) {
        await interaction.deferReply();

        const cantidad = interaction.options.getInteger('cantidad') || 10;
        const top = stmts.getTop(cantidad);

        if (top.length === 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.WARN || 0xFFB74D)
                    .setDescription('> 📭 Todavía nadie tiene XP. ¡Empezá a chatear!')
                ]
            });
        }

        // Buscar posición del que ejecuta
        const miPos = top.findIndex(u => u.id === interaction.user.id);

        // Calcular XP para el siguiente nivel de cada usuario
        function xpParaNivel(lvl) { return Math.floor(100 * Math.pow(1.15, lvl)); }

        const lines = top.map((u, i) => {
            const medal = MEDALLAS[i] || `\`${String(i + 1).padStart(2)}\``;
            const rango = getRangoLabel(u.level);
            const bar = miniBar(u.xp, xpParaNivel(u.level));
            const esYo = u.id === interaction.user.id ? ' ← **vos**' : '';
            return (
                `${medal} <@${u.id}>${esYo}\n` +
                `> ${rango}  ·  Nv.\`${u.level}\`  ${bar}  \`${u.xp.toLocaleString()} XP\``
            );
        });

        // Mi posición si estoy fuera del top
        let miPosStr = '';
        if (miPos === -1) {
            const miData = stmts.getUser(interaction.user.id);
            const miRank = stmts.getRank(interaction.user.id);
            if (miData) {
                const bar = miniBar(miData.xp, xpParaNivel(miData.level));
                miPosStr = `\n\n**Tu posición:**\n> \`#${miRank.rank + 1}\` ${interaction.user} · Nv.\`${miData.level}\`  ${bar}  \`${miData.xp.toLocaleString()} XP\``;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: '🏆  Leaderboard de Niveles · Prophet Gaming', iconURL: interaction.guild.iconURL() })
            .setDescription(lines.join('\n\n') + miPosStr)
            .addFields(
                { name: '👥 Usuarios rankeados', value: `\`${top.length}\``, inline: true },
                { name: '🥇 Líder', value: `<@${top[0].id}>`, inline: true },
                { name: '📊 Tu lugar', value: miPos >= 0 ? `\`#${miPos + 1}\`` : '`Fuera del top`', inline: true }
            )
            .setFooter({ text: `Prophet Gaming  ·  Chateá más para subir de nivel` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

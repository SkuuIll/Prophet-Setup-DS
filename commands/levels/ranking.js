// ═══ COMANDO: /ranking — Leaderboards unificados ═══

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');
const { paginate, chunk } = require('../../utils/PaginationBuilder');

const MEDALLAS = ['🥇', '🥈', '🥉'];

module.exports = {
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('🏆 Leaderboards del servidor')
        .addStringOption(o =>
            o.setName('tipo')
                .setDescription('Tipo de ranking')
                .setRequired(true)
                .addChoices(
                    { name: '📈 XP y Niveles', value: 'xp' },
                    { name: '🎙️ Horas en Voz', value: 'voz' },
                    { name: '💰 Economía', value: 'eco' },
                    { name: '💬 Mensajes', value: 'mensajes' },
                    { name: '⭐ Reputación', value: 'rep' },
                    { name: '🔥 Racha de Días', value: 'racha' },
                ))
        .addIntegerOption(o =>
            o.setName('limite')
                .setDescription('Cantidad a mostrar (10-50)')
                .setMinValue(10)
                .setMaxValue(50)),

    async execute(interaction) {
        await interaction.deferReply();

        const tipo = interaction.options.getString('tipo');
        const limite = interaction.options.getInteger('limite') || 20;

        let data, title, color, formatLine;

        switch (tipo) {
            case 'xp': {
                data = stmts.getTop(limite);
                title = '📈 Ranking de Niveles y XP';
                color = config.COLORES.NIVEL || 0x69F0AE;
                formatLine = (u, i) => {
                    const medal = MEDALLAS[i] || `\`${String(i + 1).padStart(2)}\``;
                    const rolNivel = Object.entries(config.NIVELES.ROLES_POR_NIVEL)
                        .reverse()
                        .find(([lvl]) => u.level >= parseInt(lvl));
                    const rolLabel = rolNivel ? rolNivel[1].split(' ')[0] : '🌱';
                    return `${medal} <@${u.id}> — ${rolLabel} **Nv.${u.level}** · \`${u.xp.toLocaleString()} XP\``;
                };
                break;
            }

            case 'voz': {
                const raw = stmts.getTopVoice?.(limite) || stmts.getTop(limite);
                data = raw.filter(u => (u.voice_minutes || 0) > 0)
                    .sort((a, b) => (b.voice_minutes || 0) - (a.voice_minutes || 0));
                title = '🎙️ Ranking de Horas en Voz';
                color = 0x42A5F5;
                formatLine = (u, i) => {
                    const medal = MEDALLAS[i] || `\`${String(i + 1).padStart(2)}\``;
                    const mins = u.voice_minutes || 0;
                    const hrs = Math.floor(mins / 60);
                    const m = mins % 60;
                    const timeStr = hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
                    return `${medal} <@${u.id}> — **${timeStr}** en canales de voz`;
                };
                break;
            }

            case 'eco': {
                const raw = stmts.getTop(limite);
                data = raw.map(u => {
                    const eco = stmts.getEconomy(u.id);
                    return { ...u, totalCoins: (eco?.balance || 0) + (eco?.bank || 0), balance: eco?.balance || 0, bank: eco?.bank || 0 };
                }).sort((a, b) => b.totalCoins - a.totalCoins);
                title = '💰 Ranking de Economía';
                color = 0xFFD700;
                formatLine = (u, i) => {
                    const medal = MEDALLAS[i] || `\`${String(i + 1).padStart(2)}\``;
                    return `${medal} <@${u.id}> — ${config.ECONOMIA.CURRENCY} **${u.totalCoins.toLocaleString()}** (💵 ${u.balance.toLocaleString()} + 🏦 ${u.bank.toLocaleString()})`;
                };
                break;
            }

            case 'mensajes': {
                data = stmts.getTop(limite);
                data.sort((a, b) => (b.messages || 0) - (a.messages || 0));
                title = '💬 Ranking de Mensajes';
                color = 0xBB86FC;
                formatLine = (u, i) => {
                    const medal = MEDALLAS[i] || `\`${String(i + 1).padStart(2)}\``;
                    return `${medal} <@${u.id}> — **${(u.messages || 0).toLocaleString()}** mensajes`;
                };
                break;
            }

            case 'rep': {
                const raw = stmts.getTop(limite);
                data = raw.filter(u => (u.reputation || 0) > 0)
                    .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
                title = '⭐ Ranking de Reputación';
                color = 0xFFB74D;
                formatLine = (u, i) => {
                    const medal = MEDALLAS[i] || `\`${String(i + 1).padStart(2)}\``;
                    return `${medal} <@${u.id}> — ⭐ **${u.reputation || 0}** rep`;
                };
                break;
            }

            case 'racha': {
                const raw = stmts.getTop(limite);
                data = raw.filter(u => (u.message_streak || 0) > 0)
                    .sort((a, b) => (b.message_streak || 0) - (a.message_streak || 0));
                title = '🔥 Ranking de Racha de Días';
                color = 0xFF7043;
                formatLine = (u, i) => {
                    const medal = MEDALLAS[i] || `\`${String(i + 1).padStart(2)}\``;
                    const fires = u.message_streak >= 30 ? '🔥🔥🔥' : u.message_streak >= 14 ? '🔥🔥' : '🔥';
                    return `${medal} <@${u.id}> — ${fires} **${u.message_streak}** días`;
                };
                break;
            }
        }

        if (!data || data.length === 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.WARN || 0xFFB74D)
                    .setDescription('> 📭 No hay datos suficientes para este ranking.')]
            });
        }

        // Buscar posición del usuario
        const myPos = data.findIndex(u => u.id === interaction.user.id);

        // Paginar en grupos de 10
        const chunks = chunk(data, 10);
        const pages = chunks.map((group, pageIdx) => {
            const lines = group.map((u, i) => formatLine(u, pageIdx * 10 + i));

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: `${title}  ·  Prophet Gaming`, iconURL: interaction.guild.iconURL() })
                .setDescription(lines.join('\n\n'))
                .setThumbnail(interaction.guild.iconURL({ size: 256 }));

            // Solo en la primera página
            if (pageIdx === 0) {
                embed.addFields(
                    { name: '👥 En ranking', value: `\`${data.length}\``, inline: true },
                    { name: '🥇 Líder', value: `<@${data[0].id}>`, inline: true },
                    { name: '📊 Tu lugar', value: myPos >= 0 ? `\`#${myPos + 1}\`` : '`Fuera del top`', inline: true }
                );
            }

            return embed;
        });

        await paginate(interaction, pages, {
            footerPrefix: 'Prophet Ranking',
            timeout: 120000
        });
    }
};

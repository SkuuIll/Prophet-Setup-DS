// ═══ COMANDO: /ping ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Ver la latencia y estado del bot'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: '> 🏓 Midiendo latencia...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiPing = Math.round(interaction.client.ws.ping);

        // Indicadores de calidad
        const getIndicator = (ms) => {
            if (ms < 100) return { emoji: '🟢', text: 'Excelente' };
            if (ms < 200) return { emoji: '🟡', text: 'Buena' };
            return { emoji: '🔴', text: 'Alta' };
        };

        const botState = getIndicator(latency);
        const apiState = getIndicator(apiPing);

        const uptime = process.uptime();
        const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
        const memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '🏓  Pong!' })
            .setDescription(
                `> ${botState.emoji} **Bot:** \`${latency}ms\` (${botState.text})\n` +
                `> ${apiState.emoji} **API:** \`${apiPing}ms\` (${apiState.text})\n\n` +
                `> ⏱️ **Uptime:** \`${uptimeStr}\`\n` +
                `> 💾 **Memoria:** \`${memoryMB} MB\``
            )
            .setFooter({ text: 'Prophet Bot  ·  Sistema' })
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    }
};

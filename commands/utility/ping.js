// ═══ COMANDO: /ping ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Ver la latencia y estado del bot'),

    async execute(interaction) {
        const before = Date.now();
        await interaction.deferReply();

        const latency = Date.now() - before;
        const apiPing = Math.round(interaction.client.ws.ping);

        const getIndicator = (ms) => {
            if (ms < 150) return { emoji: '🟢', text: 'Excelente', bar: '▰▰▰▰▰▰▰▰▰▰' };
            if (ms < 250) return { emoji: '🟢', text: 'Muy bueno', bar: '▰▰▰▰▰▰▰▰▱▱' };
            if (ms < 400) return { emoji: '🟡', text: 'Aceptable', bar: '▰▰▰▰▰▱▱▱▱▱' };
            return { emoji: '🔴', text: 'Alta', bar: '▰▰▱▱▱▱▱▱▱▱' };
        };

        const botState = getIndicator(latency);
        const apiState = getIndicator(apiPing);

        const uptime = process.uptime();
        const dias = Math.floor(uptime / 86400);
        const horas = Math.floor((uptime % 86400) / 3600);
        const minutos = Math.floor((uptime % 3600) / 60);
        const segundos = Math.floor(uptime % 60);
        const uptimeStr = dias > 0
            ? `${dias}d ${horas}h ${minutos}m`
            : `${horas}h ${minutos}m ${segundos}s`;

        const memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        const memTotal = Math.round(process.memoryUsage().heapTotal / 1024 / 1024);

        const overallColor = (latency < 250 && apiPing < 250)
            ? (config.COLORES.SUCCESS || 0x69F0AE)
            : (latency < 400 && apiPing < 400)
                ? 0xFFB74D
                : (config.COLORES.ERROR || 0xEF5350);

        const embed = new EmbedBuilder()
            .setColor(overallColor)
            .setAuthor({ name: '🏓  Pong! · Estado del Sistema', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(
                `**Latencia de conexión**\n` +
                `> ${botState.emoji} Bot: \`${latency}ms\` ${botState.bar} *(${botState.text})*\n` +
                `> ${apiState.emoji} API: \`${apiPing}ms\` ${apiState.bar} *(${apiState.text})*\n\n` +
                `**Sistema**\n` +
                `> ⏱️ Uptime: \`${uptimeStr}\`\n` +
                `> 💾 Memoria: \`${memoryMB} / ${memTotal} MB\``
            )
            .setFooter({ text: 'Prophet Bot  ·  Sistema en línea' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

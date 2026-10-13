const { SlashCommandBuilder } = require('discord.js');
const { makeEmbed } = require('../../utils/discordUI');

function latencyState(ms) {
    if (!Number.isFinite(ms) || ms < 0) return { label: 'No disponible', tone: 'warning' };
    if (ms < 150) return { label: 'Excelente', tone: 'success' };
    if (ms < 350) return { label: 'Estable', tone: 'primary' };
    return { label: 'Lenta', tone: 'warning' };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Consultá la latencia y el estado del bot'),
    async execute(interaction) {
        const started = Date.now();
        await interaction.deferReply();
        const responseMs = Math.max(0, Date.now() - started);
        const gatewayMs = Number(interaction.client.ws?.ping ?? -1);
        const state = latencyState(Math.max(responseMs, gatewayMs));
        const uptimeSeconds = Math.floor(process.uptime());
        const days = Math.floor(uptimeSeconds / 86400);
        const hours = Math.floor((uptimeSeconds % 86400) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const memory = Math.round(process.memoryUsage().rss / 1024 / 1024);

        const embed = makeEmbed({
            title: 'Estado de Prophet Bot',
            tone: state.tone,
            description: '**' + state.label + '** · Conexión con Discord\n'
                + 'Respuesta: **' + responseMs + ' ms**\n'
                + 'Gateway: **' + (gatewayMs < 0 ? 'No disponible' : gatewayMs + ' ms') + '**',
            fields: [
                { name: 'Tiempo activo', value: days + ' d · ' + hours + ' h · ' + minutes + ' min', inline: true },
                { name: 'Memoria del proceso', value: memory + ' MB (RSS)', inline: true },
            ],
            footer: 'Estado general del bot · No verifica los otros servicios PM2',
            iconURL: interaction.client.user?.displayAvatarURL?.(),
        });
        await interaction.editReply({ embeds: [embed] });
    },
    _test: { latencyState },
};

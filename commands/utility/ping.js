// ═══ COMANDO: /ping ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Ver la latencia del bot'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS)
            .setTitle('🏓 Pong!')
            .addFields(
                { name: 'Latencia Bot', value: `${latency}ms`, inline: true },
                { name: 'Latencia API', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
            );

        await interaction.editReply({ content: null, embeds: [embed] });
    }
};

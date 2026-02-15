// ═══ COMANDO: /suggest ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Enviar una sugerencia al servidor')
        .addStringOption(o => o.setName('propuesta').setDescription('Tu sugerencia').setRequired(true)),

    async execute(interaction) {
        const suggestion = interaction.options.getString('propuesta');
        const channelId = config.SUGERENCIAS.CHANNEL_ID;
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.reply({ content: '❌ El canal de sugerencias no está configurado o no existe.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.INFO)
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
            .setTitle('💡 Nueva Sugerencia')
            .setDescription(suggestion)
            .setFooter({ text: 'Prophet Gaming | Sugerencias' })
            .setTimestamp();

        const msg = await channel.send({ embeds: [embed] });
        await msg.react('✅');
        await msg.react('❌');

        await interaction.reply({ content: '✅ Sugerencia enviada correctamente.', ephemeral: true });
    }
};

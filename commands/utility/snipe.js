const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('👀 Recupera el último mensaje borrado en este canal'),

    async execute(interaction) {
        const snipes = interaction.client.snipes.get(interaction.channel.id);

        if (!snipes) {
            return interaction.reply({ content: '❌ No hay mensajes borrados recientemente en este canal.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setAuthor({ name: snipes.author.tag, iconURL: snipes.author.displayAvatarURL() })
            .setDescription(snipes.content || '*[Solo imagen/archivo]*')
            .setFooter({ text: `Borrado hace ${Math.floor((Date.now() - snipes.timestamp) / 1000)}s` })
            .setTimestamp(snipes.timestamp)
            .setColor(config.COLORES.ERROR || 0xFF0000);

        if (snipes.image) {
            embed.setImage(snipes.image);
        }

        await interaction.reply({ embeds: [embed] });
    }
};

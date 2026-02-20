// ═══ COMANDO: /snipe ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('👀 Recuperar el último mensaje borrado en este canal'),

    async execute(interaction) {
        const snipes = interaction.client.snipes.get(interaction.channel.id);

        if (!snipes) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setDescription('> 🕳️ No hay mensajes borrados recientemente en este canal.')
                .setFooter({ text: 'Prophet  ·  Snipe' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const tiempoSeg = Math.floor((Date.now() - snipes.timestamp) / 1000);
        let hace;
        if (tiempoSeg < 60) hace = `${tiempoSeg}s`;
        else if (tiempoSeg < 3600) hace = `${Math.floor(tiempoSeg / 60)}m ${tiempoSeg % 60}s`;
        else hace = `${Math.floor(tiempoSeg / 3600)}h ${Math.floor((tiempoSeg % 3600) / 60)}m`;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: `👀  Mensaje eliminado`, iconURL: snipes.author.displayAvatarURL() })
            .setDescription(
                `> **Autor:** ${snipes.author.tag}\n` +
                `> **Borrado hace:** \`${hace}\`\n\n` +
                `\`\`\`\n${(snipes.content || '[Solo imagen/archivo]').slice(0, 800)}\n\`\`\``
            )
            .setFooter({ text: 'Prophet  ·  Snipe' })
            .setTimestamp(snipes.timestamp);

        if (snipes.image) {
            embed.setImage(snipes.image);
        }

        await interaction.reply({ embeds: [embed] });
    }
};

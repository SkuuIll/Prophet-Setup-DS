// ═══ COMANDO: /slowmode ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Activar/desactivar el modo lento en el canal')
        .addIntegerOption(o => o.setName('segundos').setDescription('Segundos entre mensajes (0 = desactivar)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const segundos = interaction.options.getInteger('segundos');

        await interaction.channel.setRateLimitPerUser(segundos);

        const estado = segundos === 0
            ? '🟢 **Slowmode desactivado**'
            : `🐢 **Slowmode activado**: ${segundos < 60 ? `${segundos}s` : segundos < 3600 ? `${Math.floor(segundos / 60)}m` : `${Math.floor(segundos / 3600)}h`} entre mensajes`;

        const embed = new EmbedBuilder()
            .setColor(segundos === 0 ? 0x2ECC71 : config.COLORES.WARN)
            .setDescription(estado)
            .addFields(
                { name: '📍 Canal', value: `<#${interaction.channel.id}>`, inline: true },
                { name: '🛡️ Moderador', value: `<@${interaction.user.id}>`, inline: true },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};

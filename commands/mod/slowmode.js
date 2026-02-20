// ═══ COMANDO: /slowmode ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('🐢 Activar/desactivar el modo lento en el canal')
        .addIntegerOption(o => o.setName('segundos').setDescription('Segundos entre mensajes (0 = desactivar)').setRequired(true).setMinValue(0).setMaxValue(21600))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const segundos = interaction.options.getInteger('segundos');

        await interaction.channel.setRateLimitPerUser(segundos);

        // Formatear duración
        let duracion;
        if (segundos === 0) duracion = null;
        else if (segundos < 60) duracion = `${segundos}s`;
        else if (segundos < 3600) duracion = `${Math.floor(segundos / 60)}m ${segundos % 60 > 0 ? (segundos % 60) + 's' : ''}`.trim();
        else duracion = `${Math.floor(segundos / 3600)}h ${Math.floor((segundos % 3600) / 60) > 0 ? Math.floor((segundos % 3600) / 60) + 'm' : ''}`.trim();

        const embed = new EmbedBuilder()
            .setColor(segundos === 0 ? (config.COLORES.SUCCESS || 0x69F0AE) : (config.COLORES.WARN || 0xFFB74D))
            .setDescription(
                segundos === 0
                    ? `> 🟢 **Slowmode desactivado** en ${interaction.channel}`
                    : `> 🐢 **Slowmode activado** en ${interaction.channel}\n> Intervalo: \`${duracion}\` entre mensajes`
            )
            .addFields(
                { name: '🛡️ Moderador', value: `${interaction.user}`, inline: true }
            )
            .setFooter({ text: 'Prophet  ·  Moderación' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        stmts.addLog('SLOWMODE', {
            mod: interaction.user.tag,
            channel: interaction.channel.name,
            seconds: segundos
        });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};

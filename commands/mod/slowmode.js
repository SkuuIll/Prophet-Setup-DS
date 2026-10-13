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
        // Defender también en runtime: no confiar únicamente en el permiso del slash registrado.
        if (!interaction.inGuild?.() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: 'No tenés permisos para ejecutar esta acción de moderación.',
                flags: 64,
            });
        }

        const segundos = interaction.options.getInteger('segundos');

        try {
            await interaction.channel.setRateLimitPerUser(segundos);
        } catch (error) {
            return interaction.reply({ content: '> ❌ **Error** — No se pudo modificar el modo lento. Revisa que tenga permisos de Administrar Canales.', ephemeral: true });
        }

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

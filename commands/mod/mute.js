// ═══ COMANDO: /mute ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Silenciar a un usuario temporalmente')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
        .addIntegerOption(o => o.setName('minutos').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(10080))
        .addStringOption(o => o.setName('razon').setDescription('Razón'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario');
        const minutos = interaction.options.getInteger('minutos');
        const razon = interaction.options.getString('razon') || 'Sin razón';

        if (!target) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
        if (!target.moderatable) return interaction.reply({ content: '❌ No puedo silenciar a este usuario.', ephemeral: true });

        // DM al usuario antes de silenciar
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(config.COLORES.WARN)
                .setTitle('🔇 Has sido silenciado')
                .setDescription(`Has sido silenciado en **${interaction.guild.name}**`)
                .addFields(
                    { name: '⏳ Duración', value: `${minutos} minutos`, inline: true },
                    { name: '📝 Razón', value: razon, inline: true }
                )
                .setTimestamp();
            await target.user.send({ embeds: [dmEmbed] });
        } catch { /* DMs desactivados */ }

        await target.timeout(minutos * 60000, razon);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN)
            .setTitle('🔇 **USUARIO SILENCIADO**')
            .addFields(
                { name: '👤 **Usuario**', value: `\`${target.user.tag}\``, inline: true },
                { name: '⏳ **Duración**', value: `\`${minutos} minutos\``, inline: true },
                { name: '🛡️ **Moderador**', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📝 **Razón**', value: `*${razon}*`, inline: false }
            )
            .setFooter({ text: 'Prophet Gaming | Sistema de Moderación' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};

// ═══ COMANDO: /ban ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banear a un usuario del servidor')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón del ban'))
        .addIntegerOption(o => o.setName('dias').setDescription('Días de mensajes a borrar (0-7)').setMinValue(0).setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón';
        const dias = interaction.options.getInteger('dias') || 0;

        if (!target) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });

        try {
            await interaction.guild.members.ban(target, { reason: razon, deleteMessageSeconds: dias * 86400 });
        } catch (e) {
            return interaction.reply({ content: `❌ No pude banear: ${e.message}`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR)
            .setTitle('🔨 **USUARIO BANEADO**')
            .addFields(
                { name: '👤 **Usuario**', value: `\`${target.tag}\``, inline: true },
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

// ═══ COMANDO: /kick ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsar a un usuario del servidor')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón de la expulsión'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón';

        if (!target) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
        if (!target.kickable) return interaction.reply({ content: '❌ No puedo expulsar a este usuario.', ephemeral: true });

        // DM al usuario antes de expulsar
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setTitle('👢 Has sido expulsado')
                .setDescription(`Has sido expulsado de **${interaction.guild.name}**`)
                .addFields({ name: '📝 Razón', value: razon })
                .setTimestamp();
            await target.user.send({ embeds: [dmEmbed] });
        } catch { /* DMs desactivados */ }

        try {
            await target.kick(razon);
        } catch (e) {
            return interaction.reply({ content: `❌ No pude expulsar: ${e.message}`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR)
            .setTitle('👢 **USUARIO EXPULSADO**')
            .addFields(
                { name: '👤 **Usuario**', value: `\`${target.user.tag}\``, inline: true },
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

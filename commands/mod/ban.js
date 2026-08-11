// ═══ COMANDO: /ban ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🔨 Banear permanentemente a un usuario del servidor')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón del baneo'))
        .addIntegerOption(o => o.setName('dias').setDescription('Días de mensajes a borrar (0-7)').setMinValue(0).setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';
        const dias = interaction.options.getInteger('dias') || 0;

        if (!target) return interaction.reply({ content: '> ❌ **Error** — Usuario no encontrado en el servidor.', ephemeral: true });
        if (!target.bannable) return interaction.reply({ content: '> ❌ **Error** — No tengo permisos para banear a este usuario.', ephemeral: true });

        // DM antes del ban
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setAuthor({ name: '🔨  Has sido baneado' })
                .setDescription(
                    `Has sido baneado de **${interaction.guild.name}**.\n\n` +
                    `> **Motivo:** ${razon}\n` +
                    `> **Moderador:** ${interaction.user.tag}`
                )
                .setFooter({ text: 'Prophet  ·  Moderación' })
                .setTimestamp();
            await target.user.send({ embeds: [dmEmbed] });
        } catch { /* DMs desactivados */ }

        try {
            await target.ban({ deleteMessageDays: dias, reason: razon });
        } catch (e) {
            return interaction.reply({ content: `> ❌ **Error** — No pude banear: \`${e.message}\``, ephemeral: true });
        }

        stmts.addLog('BAN', {
            userId: target.id,
            userTag: target.user.tag,
            mod: interaction.user.tag,
            reason: razon
        });

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: '🔨  USUARIO BANEADO' })
            .setDescription(
                `> **Usuario:** \`${target.user.tag}\` (\`${target.id}\`)\n` +
                `> **Moderador:** ${interaction.user}\n` +
                `> **Motivo:** *${razon}*\n` +
                `> **Mensajes borrados:** \`${dias}\` día(s)`
            )
            .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet  ·  Moderación' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Log dual: canal general + canal de reportes/mod
        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        const modChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] }).catch(() => {});
        if (modChannel && modChannel.id !== logChannel?.id) modChannel.send({ embeds: [embed] }).catch(() => {});
    }
};

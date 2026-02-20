// ═══ COMANDO: /kick ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('👢 Expulsar a un usuario del servidor')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón de la expulsión'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';

        if (!target) return interaction.reply({ content: '> ❌ **Error** — Usuario no encontrado en el servidor.', ephemeral: true });
        if (!target.kickable) return interaction.reply({ content: '> ❌ **Error** — No tengo permisos para expulsar a este usuario.', ephemeral: true });

        // DM antes del kick
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setAuthor({ name: '👢  Has sido expulsado' })
                .setDescription(
                    `Has sido expulsado de **${interaction.guild.name}**.\n\n` +
                    `> **Motivo:** ${razon}\n` +
                    `> **Moderador:** ${interaction.user.tag}`
                )
                .setFooter({ text: 'Prophet  ·  Moderación' })
                .setTimestamp();
            await target.user.send({ embeds: [dmEmbed] });
        } catch { /* DMs desactivados */ }

        try {
            await target.kick(razon);
        } catch (e) {
            return interaction.reply({ content: `> ❌ **Error** — No pude expulsar: \`${e.message}\``, ephemeral: true });
        }

        stmts.addLog('KICK', {
            userId: target.id,
            userTag: target.user.tag,
            mod: interaction.user.tag,
            reason: razon
        });

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: '👢  USUARIO EXPULSADO' })
            .setDescription(
                `> **Usuario:** \`${target.user.tag}\` (\`${target.id}\`)\n` +
                `> **Moderador:** ${interaction.user}\n` +
                `> **Motivo:** *${razon}*`
            )
            .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet  ·  Moderación' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};

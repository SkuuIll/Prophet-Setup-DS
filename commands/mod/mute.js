// ═══ COMANDO: /mute ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('🔇 Silenciar a un usuario temporalmente')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a silenciar').setRequired(true))
        .addIntegerOption(o => o.setName('minutos').setDescription('Duración en minutos').setRequired(true).setMinValue(1).setMaxValue(10080))
        .addStringOption(o => o.setName('razon').setDescription('Razón del silencio'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario');
        const minutos = interaction.options.getInteger('minutos');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';

        if (!target) return interaction.reply({ content: '> ❌ **Error** — Usuario no encontrado.', ephemeral: true });
        if (!target.moderatable) return interaction.reply({ content: '> ❌ **Error** — No tengo permisos para silenciar a este usuario.', ephemeral: true });

        // Formatear duración legible
        let duracionTexto = `${minutos} minutos`;
        if (minutos >= 1440) duracionTexto = `${Math.floor(minutos / 1440)}d ${Math.floor((minutos % 1440) / 60)}h`;
        else if (minutos >= 60) duracionTexto = `${Math.floor(minutos / 60)}h ${minutos % 60}m`;

        // DM al usuario
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setAuthor({ name: '🔇  Has sido silenciado' })
                .setDescription(
                    `Has sido silenciado en **${interaction.guild.name}**.\n\n` +
                    `> **Duración:** ${duracionTexto}\n` +
                    `> **Motivo:** ${razon}`
                )
                .setFooter({ text: 'Prophet  ·  Moderación' })
                .setTimestamp();
            await target.user.send({ embeds: [dmEmbed] });
        } catch { /* DMs desactivados */ }

        await target.timeout(minutos * 60000, razon);

        stmts.addLog('MUTE', {
            userId: target.id,
            userTag: target.user.tag,
            mod: interaction.user.tag,
            duration: duracionTexto,
            reason: razon
        });

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN || 0xFFB74D)
            .setAuthor({ name: '🔇  USUARIO SILENCIADO' })
            .setDescription(
                `> **Usuario:** \`${target.user.tag}\` (\`${target.id}\`)\n` +
                `> **Moderador:** ${interaction.user}\n` +
                `> **Duración:** \`${duracionTexto}\`\n` +
                `> **Motivo:** *${razon}*\n\n` +
                `> ⏰ Se desilenciará <t:${Math.floor((Date.now() + minutos * 60000) / 1000)}:R>`
            )
            .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet  ·  Moderación' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};

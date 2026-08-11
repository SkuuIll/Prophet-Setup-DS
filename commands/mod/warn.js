// ═══ COMANDO: /warn ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Advertir a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón de la advertencia').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario');
        const razon = interaction.options.getString('razon');

        if (!target) return interaction.reply({ content: '> ❌ **Error** — Usuario no encontrado.', ephemeral: true });

        stmts.addWarn(target.id, interaction.user.id, razon);
        const warns = stmts.countWarns(target.id);

        // DM al usuario
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setAuthor({ name: '⚠️  Advertencia recibida' })
                .setDescription(
                    `Has recibido una advertencia en **${interaction.guild.name}**.\n\n` +
                    `> **Motivo:** ${razon}\n` +
                    `> **Warns totales:** \`${warns.total}\`\n\n` +
                    `💡 *Acumular ${config.MODERACION.WARNS_PARA_MUTE} warns = mute automático · ${config.MODERACION.WARNS_PARA_KICK} warns = kick automático.*`
                )
                .setFooter({ text: 'Prophet  ·  Moderación' })
                .setTimestamp();
            await target.user.send({ embeds: [dmEmbed] });
        } catch { /* DMs desactivados */ }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN || 0xFFB74D)
            .setAuthor({ name: '⚠️  ADVERTENCIA EMITIDA' })
            .setDescription(
                `> **Usuario:** \`${target.user.tag}\` (\`${target.id}\`)\n` +
                `> **Moderador:** ${interaction.user}\n` +
                `> **Motivo:** *${razon}*\n` +
                `> **Warns acumulados:** \`${warns.total}\``
            )
            .setThumbnail(target.user.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet  ·  Moderación' })
            .setTimestamp();

        // Acciones automáticas
        if (warns.total >= config.MODERACION.WARNS_PARA_KICK) {
            embed.addFields({
                name: '🚨 Acción automática',
                value: `> **KICK AUTOMÁTICO** — Acumuló ${warns.total} advertencias.`
            });
            try { await target.kick(`Auto-kick: ${warns.total} warns`); } catch (e) { }
        } else if (warns.total >= config.MODERACION.WARNS_PARA_MUTE) {
            const durMin = config.MODERACION.MUTE_DURACION / 60000;
            embed.addFields({
                name: '🔇 Acción automática',
                value: `> **MUTE AUTOMÁTICO** — ${durMin} min por ${warns.total} advertencias.`
            });
            try { await target.timeout(config.MODERACION.MUTE_DURACION, `Auto-mute: ${warns.total} warns`); } catch (e) { }
        }

        await interaction.reply({ embeds: [embed] });

        // Log dual: canal general + canal de mod
        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        const modChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] }).catch(() => {});
        if (modChannel && modChannel.id !== logChannel?.id) modChannel.send({ embeds: [embed] }).catch(() => {});
    }
};

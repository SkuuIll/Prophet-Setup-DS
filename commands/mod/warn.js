// ═══ COMANDO: /warn ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');
const { notice } = require('../../utils/discordUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Advertir a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a advertir').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón de la advertencia').setRequired(true).setMaxLength(400))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        // Defender también en runtime: no confiar únicamente en el permiso del slash registrado.
        if (!interaction.inGuild?.() || !interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
            return interaction.reply({
                content: 'No tenés permisos para ejecutar esta acción de moderación.',
                flags: 64,
            });
        }

        const target = interaction.options.getMember('usuario');
        const razon = interaction.options.getString('razon');

        if (!target || target.id === interaction.user.id) {
            return interaction.reply(notice({
                title: 'Miembro inválido',
                description: 'Elegí otro miembro del servidor para registrar una advertencia.',
                tone: 'error',
            }));
        }

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

        // Mostrar sanciones automáticas SOLO cuando Discord las confirma.
        if (warns.total >= config.MODERACION.WARNS_PARA_KICK) {
            try {
                if (!target.kickable) throw new Error('El bot no puede expulsar este rol');
                await target.kick('Auto-kick: ' + warns.total + ' warns');
                embed.addFields({ name: 'Acción automática', value: 'Expulsión aplicada por acumulación de advertencias.' });
            } catch (error) {
                console.error('[Warn] No se pudo expulsar automáticamente:', error);
                embed.addFields({ name: 'Acción pendiente', value: 'El Staff debe revisar una sanción automática que no pudo ejecutarse.' });
            }
        } else if (warns.total >= config.MODERACION.WARNS_PARA_MUTE) {
            try {
                if (!target.moderatable) throw new Error('El bot no puede silenciar este rol');
                await target.timeout(config.MODERACION.MUTE_DURACION, 'Auto-mute: ' + warns.total + ' warns');
                embed.addFields({ name: 'Acción automática', value: 'Silenciamiento temporal aplicado.' });
            } catch (error) {
                console.error('[Warn] No se pudo silenciar automáticamente:', error);
                embed.addFields({ name: 'Acción pendiente', value: 'El Staff debe revisar una sanción automática que no pudo ejecutarse.' });
            }
        }

        await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });

        // Log dual: canal general + canal de mod
        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        const modChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(err => console.warn('[Warn] No se pudo enviar log:', err.message));
        if (modChannel && modChannel.id !== logChannel?.id) modChannel.send({ embeds: [embed] }).catch(() => {});
    }
};

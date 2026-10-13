// ═══ COMANDO: /tempban ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

function parseDuration(str) {
    const regex = /(\d+)\s*(m|h|d)/gi;
    let total = 0;
    let match;
    while ((match = regex.exec(str)) !== null) {
        const val = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit === 'm') total += val * 60 * 1000;
        else if (unit === 'h') total += val * 60 * 60 * 1000;
        else if (unit === 'd') total += val * 24 * 60 * 60 * 1000;
    }
    return total;
}

function formatDuration(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    return parts.join(' ') || '0m';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('🔨⏳ Banear temporalmente a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .addStringOption(o => o.setName('duracion').setDescription('Duración (ej: 30m, 2h, 1d, 1d12h)').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón del ban'))
        .addIntegerOption(o => o.setName('dias').setDescription('Días de mensajes a borrar (0-7)').setMinValue(0).setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        // Defender también en runtime: no confiar únicamente en el permiso del slash registrado.
        if (!interaction.inGuild?.() || !interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply({
                content: 'No tenés permisos para ejecutar esta acción de moderación.',
                flags: 64,
            });
        }

        const target = interaction.options.getUser('usuario');
        const duracionStr = interaction.options.getString('duracion');
        const razon = interaction.options.getString('razon') || 'Sin razón especificada';
        const dias = interaction.options.getInteger('dias') || 0;

        if (!target) return interaction.reply({ content: '> ❌ **Error** — Usuario no encontrado.', ephemeral: true });

        const duracion = parseDuration(duracionStr);
        if (duracion <= 0) {
            return interaction.reply({ content: '> ❌ **Formato inválido** — Usá: `30m`, `2h`, `1d`, `1d12h`', ephemeral: true });
        }
        if (duracion > 30 * 24 * 60 * 60 * 1000) {
            return interaction.reply({ content: '> ❌ **Límite excedido** — La duración máxima es 30 días.', ephemeral: true });
        }

        const unbanAt = Date.now() + duracion;
        const duracionTexto = formatDuration(duracion);

        // DM al usuario
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setAuthor({ name: '🔨  Ban temporal' })
                .setDescription(
                    `Has sido baneado temporalmente de **${interaction.guild.name}**.\n\n` +
                    `> **Duración:** \`${duracionTexto}\`\n` +
                    `> **Motivo:** ${razon}\n` +
                    `> **Desbaneo:** <t:${Math.floor(unbanAt / 1000)}:R>\n\n` +
                    `*Serás desbaneado automáticamente cuando se cumpla el tiempo.*`
                )
                .setFooter({ text: 'Prophet  ·  Moderación' })
                .setTimestamp();
            await target.send({ embeds: [dmEmbed] });
        } catch { /* DMs desactivados */ }

        try {
            await interaction.guild.members.ban(target, {
                reason: `[TEMPBAN ${duracionTexto}] ${razon}`,
                deleteMessageSeconds: dias * 86400
            });
        } catch (e) {
            return interaction.reply({ content: `> ❌ **Error** — No pude banear: \`${e.message}\``, ephemeral: true });
        }

        stmts.addTempban(interaction.guild.id, target.id, interaction.user.id, razon, unbanAt);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR || 0xEF5350)
            .setAuthor({ name: '🔨⏳  BAN TEMPORAL' })
            .setDescription(
                `> **Usuario:** \`${target.tag}\` (\`${target.id}\`)\n` +
                `> **Moderador:** ${interaction.user}\n` +
                `> **Duración:** \`${duracionTexto}\`\n` +
                `> **Motivo:** *${razon}*\n` +
                `> **Mensajes borrados:** \`${dias}\` día(s)\n\n` +
                `> 🔓 **Desbaneo automático:** <t:${Math.floor(unbanAt / 1000)}:R>`
            )
            .setThumbnail(target.displayAvatarURL({ size: 64 }))
            .setFooter({ text: 'Prophet  ·  Moderación' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};

// ═══ COMANDO: /warn ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Advertir a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario');
        const razon = interaction.options.getString('razon');

        if (!target) return interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });

        stmts.addWarn(target.id, interaction.user.id, razon);
        const warns = stmts.countWarns(target.id);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN)
            .setTitle('⚠️ Advertencia')
            .addFields(
                { name: 'Usuario', value: `${target.user.tag}`, inline: true },
                { name: 'Warns totales', value: `${warns.total}`, inline: true },
                { name: 'Moderador', value: `${interaction.user.tag}`, inline: true },
                { name: 'Razón', value: razon }
            )
            .setTimestamp();

        if (warns.total >= config.MODERACION.WARNS_PARA_KICK) {
            embed.addFields({ name: '🚨 Acción', value: '**KICK AUTOMÁTICO** (5+ warns)' });
            try { await target.kick(`Auto-kick: ${warns.total} warns`); } catch (e) { }
        } else if (warns.total >= config.MODERACION.WARNS_PARA_MUTE) {
            embed.addFields({ name: '🔇 Acción', value: `**MUTE AUTOMÁTICO** 1 hora (${warns.total} warns)` });
            try { await target.timeout(config.MODERACION.MUTE_DURACION, `Auto-mute: ${warns.total} warns`); } catch (e) { }
        }

        await interaction.reply({ embeds: [embed] });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};

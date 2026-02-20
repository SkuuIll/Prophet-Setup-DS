// ═══ COMANDO: /warns ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('📋 Ver las advertencias de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const warns = stmts.getWarns(target.id);

        if (warns.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                .setDescription(`> ✅ **${target.tag}** no tiene advertencias. ¡Registro limpio! 🎉`)
                .setFooter({ text: 'Prophet  ·  Moderación' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const listaWarns = warns.map((w, i) =>
            `**#${w.id || i + 1}** — ${w.reason}\n` +
            `> └ Mod: <@${w.mod_id}>  ·  ${new Date(w.created_at).toLocaleDateString('es-AR')}`
        ).join('\n\n');

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN || 0xFFB74D)
            .setAuthor({ name: `⚠️  Historial de advertencias` })
            .setDescription(
                `**Usuario:** ${target.tag} (\`${target.id}\`)\n\n` +
                listaWarns
            )
            .setThumbnail(target.displayAvatarURL({ size: 64 }))
            .setFooter({ text: `Total: ${warns.length} warns  ·  Prophet Moderación` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

// ═══ COMANDO: /warns ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Ver advertencias de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario');
        const warns = stmts.getWarns(target.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `✅ **${target.tag}** no tiene advertencias.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.WARN)
            .setTitle(`⚠️ Advertencias de ${target.tag}`)
            .setDescription(
                warns.map(w =>
                    `**#${w.id}** — ${w.reason}\n` +
                    `└ Por: <@${w.mod_id}> • ${new Date(w.created_at).toLocaleDateString('es-AR')}`
                ).join('\n\n')
            )
            .setFooter({ text: `Total: ${warns.length} warns` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

// ═══════════════════════════════════════════════════════════════
// COMANDO CONTEXTUAL: Ver Perfil
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { getProfileCardData, formatProfileEmbed } = require('../../modules/profileSystem');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Ver Perfil')
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        const targetUser = interaction.targetUser;
        const profile = getProfileCardData(targetUser.id);

        if (!profile) {
            return interaction.reply({
                content: '❌ Este usuario no tiene perfil en el servidor.',
                ephemeral: true
            });
        }

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.reply({
                content: '❌ No pude obtener el miembro dentro del servidor.',
                ephemeral: true
            });
        }

        const embed = formatProfileEmbed(profile, member);
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

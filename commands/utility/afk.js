const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('💤 Ponte en modo AFK (Ausente) y notifica a quienes te mencionen')
        .addStringOption(option =>
            option.setName('motivo')
                .setDescription('Razón por la que estás AFK')),

    async execute(interaction) {
        const reason = interaction.options.getString('motivo') || 'Sin motivo especificado';

        // Guardar estado AFK en la colección del cliente (en memoria)
        interaction.client.afk.set(interaction.user.id, {
            reason: reason,
            timestamp: Date.now()
        });

        // Respuesta divertida
        await interaction.reply({
            content: `💤 **${interaction.user.username}** ahora está AFK: ${reason}`,
            ephemeral: false
        });

        // Opcional: Cambiar el apodo del usuario para indicar AFK (requiere permisos)
        if (interaction.guild.members.me.permissions.has('ManageNicknames')) {
            try {
                const member = interaction.member;
                if (!member.displayName.startsWith('[AFK]')) {
                    await member.setNickname(`[AFK] ${member.displayName}`.substring(0, 32));
                }
            } catch (e) {
                // Ignorar error si no se puede cambiar el apodo (ej. es el dueño o rol superior)
            }
        }
    }
};

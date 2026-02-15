// ═══ COMANDO: /clear ═══
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Borrar mensajes de un canal')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(o => o.setName('usuario').setDescription('Solo mensajes de este usuario'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const cantidad = interaction.options.getInteger('cantidad');
        const usuario = interaction.options.getUser('usuario');

        await interaction.deferReply({ ephemeral: true });

        let mensajes = await interaction.channel.messages.fetch({ limit: cantidad });

        if (usuario) {
            mensajes = mensajes.filter(m => m.author.id === usuario.id);
        }

        // Solo borrar mensajes de menos de 14 días
        const ahora = Date.now();
        mensajes = mensajes.filter(m => ahora - m.createdTimestamp < 1209600000);

        const borrados = await interaction.channel.bulkDelete(mensajes, true);

        await interaction.editReply({ content: `✅ Se borraron **${borrados.size}** mensajes.` });
    }
};

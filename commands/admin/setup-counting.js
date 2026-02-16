const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-counting')
        .setDescription('Configura el canal para el juego de contar (1, 2, 3...)')
        .addChannelOption(o =>
            o.setName('canal')
                .setDescription('Canal de texto para el juego')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const canal = interaction.options.getChannel('canal');

        // Guardar configuración
        stmts.setConfig('COUNTING_CHANNEL', canal.id);
        stmts.setConfig('COUNTING_CURRENT', 0); // Empezar en 0
        stmts.setConfig('COUNTING_LAST_USER', null);

        await canal.send('🔢 **¡El juego de contar ha comenzado!**\nEmpezamos desde el **1**. ¡No dejen caer la racha!\n\nReglas:\n- Un número por mensaje.\n- No puedes contar dos veces seguidas.\n- Si se equivocan, volvemos a 0.');

        await interaction.reply({ content: `✅ Canal de conteo configurado en ${canal}.`, ephemeral: true });
    }
};

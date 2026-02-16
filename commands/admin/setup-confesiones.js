const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-confesiones')
        .setDescription('Configura el canal donde se publicarán las confesiones anónimas')
        .addChannelOption(option =>
            option.setName('canal')
                .setDescription('El canal de texto para las confesiones')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const canal = interaction.options.getChannel('canal');

        // Guardar en la base de datos (usando la tabla config genérica)
        stmts.setConfig('CONFESIONES_CHANNEL', canal.id);

        await interaction.reply({
            content: `✅ Sistema configurado. Las confesiones anónimas se publicarán en ${canal}.`,
            ephemeral: true
        });
    }
};

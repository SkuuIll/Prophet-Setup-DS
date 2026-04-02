// ═══ COMANDO: /setup-roles ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-roles')
        .setDescription('🗂️ Configura un menú interactivo para que los usuarios elijan sus roles (Juegos, Región, etc.)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setTitle('🎮 Selecciona tu Juego')
            .setDescription('¡Nuestros roles gratuitos son PUBG y CS! ¿Cuál de los dos vas a jugar en nuestra comunidad?\n\nSelecciona una o ambas opciones en el menú de abajo.')
            .setImage(config.ASSETS.BANNER)
            .setFooter({ text: 'Prophet Gaming · Auto-Roles' });

        const options = [
            { label: 'PUBG Battlegrounds', description: 'Rol gratuito de PUBG', value: 'role_pubg', emoji: '🪂' },
            { label: 'Counter Strike 2', description: 'Rol gratuito de CS2', value: 'role_cs2', emoji: '🔫' },
        ];

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('auto_roles_juegos')
            .setPlaceholder('Haz click para elegir PUBG o CS...')
            .setMinValues(0)
            .setMaxValues(options.length)
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.channel.send({ embeds: [embed], components: [row] });

        await interaction.editReply({ content: '✅ Panel de auto-roles creado correctamente en este canal.' });
    }
};

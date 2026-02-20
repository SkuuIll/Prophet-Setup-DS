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
            .setTitle('🎮 Selecciona tus Juegos')
            .setDescription('¡Elige los juegos que juegas para recibir notificaciones y encontrar con quién jugar!\n\nSelecciona una o más opciones en el menú de abajo.')
            .setImage(config.ASSETS.BANNER)
            .setFooter({ text: 'Prophet Gaming · Auto-Roles' });

        // Nota: Asegúrate de que las IDs de estos roles coincidan con tu servidor
        // Para este ejemplo usamos nombres descriptivos en el value, luego en interactionCreate crearemos una lógica para mapearlo o asignarlo
        const options = [
            { label: 'Valorant', description: 'Acceso a canales de Valorant', value: 'role_valorant', emoji: '🔫' },
            { label: 'League of Legends', description: 'Acceso a canales de LoL', value: 'role_lol', emoji: '⚔️' },
            { label: 'Minecraft', description: 'Acceso a canales de Minecraft', value: 'role_minecraft', emoji: '🪨' },
            { label: 'CS2', description: 'Acceso a canales de Counter Strike 2', value: 'role_cs2', emoji: '💣' },
            { label: 'GTA V Roleplay', description: 'Acceso a canales de GTA RP', value: 'role_gta', emoji: '🚗' },
        ];

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('auto_roles_juegos')
            .setPlaceholder('Haz click para seleccionar tus juegos...')
            .setMinValues(0)
            .setMaxValues(options.length)
            .addOptions(options);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.channel.send({ embeds: [embed], components: [row] });

        await interaction.editReply({ content: '✅ Panel de auto-roles creado correctamente en este canal.' });
    }
};

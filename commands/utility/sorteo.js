// ═══ COMANDO: /sorteo ═══
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { crearSorteo } = require('../../modules/giveaways');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sorteo')
        .setDescription('Crear un sorteo')
        .addStringOption(o => o.setName('premio').setDescription('¿Qué se sortea?').setRequired(true))
        .addStringOption(o => o.setName('duracion').setDescription('Duración (ej: 1h, 30m, 1d)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const premio = interaction.options.getString('premio');
        const duracionStr = interaction.options.getString('duracion');

        // Parsear duración
        const match = duracionStr.match(/^(\d+)(m|h|d)$/i);
        if (!match) {
            return interaction.reply({ content: '❌ Formato inválido. Usá: `1h`, `30m`, `1d`', ephemeral: true });
        }

        const valor = parseInt(match[1]);
        const unidad = match[2].toLowerCase();
        const multiplicadores = { m: 60000, h: 3600000, d: 86400000 };
        const duracionMs = valor * multiplicadores[unidad];

        if (duracionMs > 604800000) {
            return interaction.reply({ content: '❌ Máximo 7 días.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });
        await crearSorteo(interaction.channel, premio, duracionMs, interaction.user.id);
        await interaction.editReply({ content: '✅ Sorteo creado!' });
    }
};

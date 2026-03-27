// ═══ COMANDO: /sorteo ═══
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { crearSorteo } = require('../../modules/giveaways');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sorteo')
        .setDescription('🎁 Crear un sorteo con requisitos opcionales')
        .addStringOption(o => o.setName('premio').setDescription('¿Qué se sortea?').setRequired(true))
        .addStringOption(o => o.setName('duracion').setDescription('Duración (ej: 1h, 30m, 1d)').setRequired(true))
        .addIntegerOption(o => o.setName('ganadores').setDescription('Cantidad de ganadores (default: 1)').setMinValue(1).setMaxValue(10))
        .addIntegerOption(o => o.setName('nivel_minimo').setDescription('Nivel mínimo para participar').setMinValue(1).setMaxValue(100))
        .addRoleOption(o => o.setName('rol_requerido').setDescription('Rol necesario para participar'))
        .addIntegerOption(o => o.setName('antiguedad_dias').setDescription('Días mínimos en el servidor').setMinValue(1).setMaxValue(365))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const premio = interaction.options.getString('premio');
        const duracionStr = interaction.options.getString('duracion');
        const winners = interaction.options.getInteger('ganadores') || 1;
        const nivelMinimo = interaction.options.getInteger('nivel_minimo') || null;
        const rolRequerido = interaction.options.getRole('rol_requerido') || null;
        const antiguedadDias = interaction.options.getInteger('antiguedad_dias') || null;

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

        // Construir requisitos
        const requirements = {};
        const reqTexts = [];

        if (nivelMinimo) {
            requirements.minLevel = nivelMinimo;
            reqTexts.push(`📈 Nivel **${nivelMinimo}**+`);
        }
        if (rolRequerido) {
            requirements.requiredRoleId = rolRequerido.id;
            requirements.requiredRoleName = rolRequerido.name;
            reqTexts.push(`🏷️ Rol **${rolRequerido.name}**`);
        }
        if (antiguedadDias) {
            requirements.minDays = antiguedadDias;
            reqTexts.push(`📅 **${antiguedadDias}** días en el server`);
        }

        await interaction.deferReply({ ephemeral: true });
        await crearSorteo(interaction.channel, premio, duracionMs, interaction.user.id, winners, requirements);

        let reply = `✅ Sorteo creado!`;
        if (winners > 1) reply += ` (${winners} ganadores)`;
        if (reqTexts.length > 0) reply += `\n> 📋 Requisitos: ${reqTexts.join(' · ')}`;

        await interaction.editReply({ content: reply });
    }
};

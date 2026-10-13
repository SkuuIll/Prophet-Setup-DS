// ═══ COMANDO: /sorteo ═══
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { crearSorteo } = require('../../modules/giveaways');
const { makeEmbed, notice } = require('../../utils/discordUI');

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
        if (!interaction.inGuild?.() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply(notice({
                title: 'Sin permisos',
                description: 'Necesitás administrar el servidor para crear sorteos.',
                tone: 'error',
            }));
        }
        const premio = interaction.options.getString('premio');
        const duracionStr = interaction.options.getString('duracion');
        const winners = interaction.options.getInteger('ganadores') || 1;
        const nivelMinimo = interaction.options.getInteger('nivel_minimo') || null;
        const rolRequerido = interaction.options.getRole('rol_requerido') || null;
        const antiguedadDias = interaction.options.getInteger('antiguedad_dias') || null;

        // Parsear duración
        const match = duracionStr.match(/^(\d+)(m|h|d)$/i);
        if (!match) {
            return interaction.reply(notice({ title: 'Duración inválida', description: 'Usá 1h, 30m o 1d (entre 1 minuto y 7 días).', tone: 'error' }));
        }

        const valor = parseInt(match[1]);
        const unidad = match[2].toLowerCase();
        const multiplicadores = { m: 60000, h: 3600000, d: 86400000 };
        const duracionMs = valor * multiplicadores[unidad];

        if (!Number.isSafeInteger(duracionMs) || duracionMs < 60000 || duracionMs > 604800000) {
            return interaction.reply(notice({ title: 'Duración inválida', description: 'Elegí entre 1 minuto y 7 días.', tone: 'error' }));
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

        await interaction.deferReply({ flags: 64 });
        try {
            await crearSorteo(interaction.channel, premio, duracionMs, interaction.user.id, winners, requirements);
        } catch (error) {
            console.error('[Sorteo] Error al crearlo:', error);
            return interaction.editReply({
                embeds: [makeEmbed({
                    title: 'No se pudo crear el sorteo',
                    description: 'Comprobá los permisos del bot en este canal e intentá nuevamente.',
                    tone: 'error',
                })],
            });
        }
        return interaction.editReply({
            embeds: [makeEmbed({
                title: 'Sorteo creado',
                description: '**Premio:** ' + premio.slice(0, 200)
                    + '\n**Ganadores:** ' + winners
                    + '\n**Requisitos:** ' + (reqTexts.length ? reqTexts.join(' · ') : 'Sin requisitos adicionales'),
                tone: 'success',
                footer: 'Sorteos · Publicado en este canal',
            })],
            allowedMentions: { parse: [] },
        });
    }
};

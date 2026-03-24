// ═══════════════════════════════════════════════════
//  COMANDO: /evento
//  Gestión de eventos y calendario
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const calendar = require('../../modules/calendarIntegration');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('evento')
        .setDescription('Gestión de eventos del servidor')
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('Crea un nuevo evento')
                .addStringOption(opt => opt.setName('titulo').setDescription('Título del evento').setRequired(true))
                .addStringOption(opt => opt.setName('fecha').setDescription('Fecha y hora (ej: 25/12/2024 18:00)').setRequired(true))
                .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción del evento').setRequired(false))
                .addStringOption(opt => opt.setName('tipo').setDescription('Tipo de evento').setRequired(false)
                    .addChoices(
                        { name: '🎮 Gaming', value: 'gaming' },
                        { name: '🏆 Torneo', value: 'tournament' },
                        { name: '📺 Stream', value: 'stream' },
                        { name: '👥 Comunidad', value: 'community' },
                        { name: '💼 Reunión', value: 'meeting' },
                        { name: '📅 General', value: 'general' }
                    ))
                .addStringOption(opt => opt.setName('ubicacion').setDescription('Ubicación o link').setRequired(false))
                .addStringOption(opt => opt.setName('duracion').setDescription('Duración (ej: 2h, 1d)').setRequired(false))
                .addStringOption(opt => opt.setName('repetir').setDescription('Repetir evento').setRequired(false)
                    .addChoices(
                        { name: 'No repetir', value: 'none' },
                        { name: 'Diario', value: 'daily' },
                        { name: 'Semanal', value: 'weekly' },
                        { name: 'Quincenal', value: 'biweekly' },
                        { name: 'Mensual', value: 'monthly' }
                    ))
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal para anuncios').setRequired(false))
                .addStringOption(opt => opt.setName('imagen').setDescription('URL de imagen').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver detalles de un evento')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del evento').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('Lista eventos próximos')
                .addStringOption(opt => opt.setName('tipo').setDescription('Filtrar por tipo').setRequired(false))
                .addIntegerOption(opt => opt.setName('limite').setDescription('Cantidad a mostrar').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('unirse')
                .setDescription('Únete a un evento')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del evento').setRequired(true))
                .addStringOption(opt => opt.setName('estado').setDescription('Tu estado').setRequired(false)
                    .addChoices(
                        { name: '✅ Voy a ir', value: 'going' },
                        { name: '⭐ Me interesa', value: 'interested' }
                    )))
        .addSubcommand(sub =>
            sub.setName('salirse')
                .setDescription('Sal de un evento')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del evento').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('editar')
                .setDescription('Edita un evento existente')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del evento').setRequired(true))
                .addStringOption(opt => opt.setName('titulo').setDescription('Nuevo título').setRequired(false))
                .addStringOption(opt => opt.setName('descripcion').setDescription('Nueva descripción').setRequired(false))
                .addStringOption(opt => opt.setName('fecha').setDescription('Nueva fecha y hora').setRequired(false))
                .addStringOption(opt => opt.setName('ubicacion').setDescription('Nueva ubicación').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('eliminar')
                .setDescription('Elimina un evento')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del evento').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('sincronizar')
                .setDescription('Sincroniza con Discord Scheduled Events')
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal para anuncios').setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'crear':
                return await handleCrear(interaction);
            case 'ver':
                return await handleVer(interaction);
            case 'lista':
                return await handleLista(interaction);
            case 'unirse':
                return await handleUnirse(interaction);
            case 'salirse':
                return await handleSalirse(interaction);
            case 'editar':
                return await handleEditar(interaction);
            case 'eliminar':
                return await handleEliminar(interaction);
            case 'sincronizar':
                return await handleSincronizar(interaction);
        }
    }
};

// Parsear fecha en formato DD/MM/YYYY HH:MM
function parseDate(dateStr) {
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(\d{1,2})?:?(\d{2})?/);
    
    if (!match) return null;

    const [, day, month, year, hour = 0, minute = 0] = match;
    
    // Crear fecha en timezone Argentina
    const date = new Date();
    date.setFullYear(parseInt(year));
    date.setMonth(parseInt(month) - 1);
    date.setDate(parseInt(day));
    date.setHours(parseInt(hour), parseInt(minute), 0, 0);

    return date.getTime();
}

// Parsear duración (ej: 2h, 1d, 30m)
function parseDuration(durationStr) {
    const match = durationStr?.match(/(\d+)([hdm])/);
    if (!match) return null;

    const [, amount, unit] = match;
    const multipliers = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };

    return parseInt(amount) * multipliers[unit];
}

async function handleCrear(interaction) {
    const titulo = interaction.options.getString('titulo');
    const fechaStr = interaction.options.getString('fecha');
    const descripcion = interaction.options.getString('descripcion');
    const tipo = interaction.options.getString('tipo') || 'general';
    const ubicacion = interaction.options.getString('ubicacion');
    const duracionStr = interaction.options.getString('duracion');
    const repetir = interaction.options.getString('repetir');
    const canal = interaction.options.getChannel('canal');
    const imagen = interaction.options.getString('imagen');

    const startTime = parseDate(fechaStr);

    if (!startTime) {
        return interaction.reply({ 
            content: '❌ Formato de fecha inválido. Usa: DD/MM/YYYY HH:MM (ej: 25/12/2024 18:00)', 
            ephemeral: true 
        });
    }

    let endTime = null;
    if (duracionStr) {
        const duration = parseDuration(duracionStr);
        if (duration) {
            endTime = startTime + duration;
        }
    }

    const event = calendar.createEvent(interaction.guildId, {
        title: titulo,
        description: descripcion,
        eventType: tipo,
        startTime,
        endTime,
        location: ubicacion,
        imageUrl: imagen,
        recurring: repetir && repetir !== 'none' ? repetir : null,
        discordChannelId: canal?.id
    }, interaction.user.id);

    const embed = calendar.generateEventEmbed(event);

    // Botones de participación
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`event_join_${event.id}_going`)
                .setLabel('Voy a ir')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`event_join_${event.id}_interested`)
                .setLabel('Me interesa')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⭐')
        );

    // Crear Discord Scheduled Event si hay permisos
    if (interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageEvents)) {
        await calendar.createDiscordEvent(interaction.guild, event);
    }

    return interaction.reply({ 
        content: '📅 **Evento creado correctamente!**',
        embeds: [embed], 
        components: [row] 
    });
}

async function handleVer(interaction) {
    const id = interaction.options.getInteger('id');
    const event = calendar.getEvent(id);

    if (!event || event.guild_id !== interaction.guildId) {
        return interaction.reply({ content: '❌ Evento no encontrado.', ephemeral: true });
    }

    const embed = calendar.generateEventEmbed(event);

    // Botones
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`event_join_${id}_going`)
                .setLabel('Voy a ir')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`event_join_${id}_interested`)
                .setLabel('Me interesa')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⭐')
        );

    return interaction.reply({ embeds: [embed], components: [row] });
}

async function handleLista(interaction) {
    const tipo = interaction.options.getString('tipo');
    const limite = interaction.options.getInteger('limite') || 10;

    const events = calendar.listEvents(interaction.guildId, { 
        upcoming: true, 
        type: tipo, 
        limit: limite 
    });

    const embed = calendar.generateEventListEmbed(events);

    return interaction.reply({ embeds: [embed] });
}

async function handleUnirse(interaction) {
    const id = interaction.options.getInteger('id');
    const estado = interaction.options.getString('estado') || 'going';

    const event = calendar.getEvent(id);

    if (!event || event.guild_id !== interaction.guildId) {
        return interaction.reply({ content: '❌ Evento no encontrado.', ephemeral: true });
    }

    calendar.addParticipant(id, interaction.user.id, estado);

    return interaction.reply({ 
        content: `✅ Te uniste al evento **${event.title}** como ${estado === 'going' ? '✅ asistente' : '⭐ interesado'}.`,
        ephemeral: true 
    });
}

async function handleSalirse(interaction) {
    const id = interaction.options.getInteger('id');

    const event = calendar.getEvent(id);

    if (!event || event.guild_id !== interaction.guildId) {
        return interaction.reply({ content: '❌ Evento no encontrado.', ephemeral: true });
    }

    calendar.removeParticipant(id, interaction.user.id);

    return interaction.reply({ 
        content: `✅ Saliste del evento **${event.title}**.`,
        ephemeral: true 
    });
}

async function handleEditar(interaction) {
    const id = interaction.options.getInteger('id');
    const titulo = interaction.options.getString('titulo');
    const descripcion = interaction.options.getString('descripcion');
    const fechaStr = interaction.options.getString('fecha');
    const ubicacion = interaction.options.getString('ubicacion');

    const updates = {};
    if (titulo) updates.title = titulo;
    if (descripcion) updates.description = descripcion;
    if (fechaStr) {
        const startTime = parseDate(fechaStr);
        if (!startTime) {
            return interaction.reply({ 
                content: '❌ Formato de fecha inválido.', 
                ephemeral: true 
            });
        }
        updates.startTime = startTime;
    }
    if (ubicacion) updates.location = ubicacion;

    const event = calendar.updateEvent(id, updates, interaction.guildId);

    if (!event) {
        return interaction.reply({ content: '❌ Evento no encontrado.', ephemeral: true });
    }

    const embed = calendar.generateEventEmbed(event);

    return interaction.reply({ 
        content: '✅ Evento actualizado.',
        embeds: [embed] 
    });
}

async function handleEliminar(interaction) {
    const id = interaction.options.getInteger('id');

    const deleted = calendar.deleteEvent(id, interaction.guildId);

    if (deleted) {
        return interaction.reply({ content: '✅ Evento eliminado correctamente.' });
    } else {
        return interaction.reply({ content: '❌ Evento no encontrado.', ephemeral: true });
    }
}

async function handleSincronizar(interaction) {
    const canal = interaction.options.getChannel('canal');

    await interaction.deferReply();

    const result = await calendar.syncWithDiscordEvents(
        interaction.guild, 
        canal?.id
    );

    if (result.success) {
        return interaction.editReply({ 
            content: `✅ Sincronización completada. ${result.synced} eventos importados.` 
        });
    } else {
        return interaction.editReply({ 
            content: `❌ Error: ${result.error}` 
        });
    }
}

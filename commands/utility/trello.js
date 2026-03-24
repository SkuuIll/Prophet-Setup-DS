// ═══════════════════════════════════════════════════
//  COMANDO: /trello
//  Integración con Trello para gestión de tareas
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const staffTools = require('../../modules/staffToolsIntegration');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trello')
        .setDescription('Integración con Trello')
        .addSubcommand(sub =>
            sub.setName('configurar')
                .setDescription('Configura Trello (Admin)')
                .addStringOption(opt => opt.setName('api_key').setDescription('API Key de Trello').setRequired(true))
                .addStringOption(opt => opt.setName('api_token').setDescription('API Token de Trello').setRequired(true))
                .addStringOption(opt => opt.setName('board_id').setDescription('ID del tablero').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('desconectar')
                .setDescription('Desconecta Trello (Admin)'))
        .addSubcommand(sub =>
            sub.setName('listas')
                .setDescription('Ver listas del tablero'))
        .addSubcommand(sub =>
            sub.setName('tarjetas')
                .setDescription('Ver tarjetas del tablero')
                .addStringOption(opt => opt.setName('lista').setDescription('Filtrar por lista').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('Crear una tarjeta')
                .addStringOption(opt => opt.setName('lista').setDescription('ID o nombre de la lista').setRequired(true))
                .addStringOption(opt => opt.setName('titulo').setDescription('Título de la tarjeta').setRequired(true))
                .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('mover')
                .setDescription('Mover una tarjeta')
                .addStringOption(opt => opt.setName('tarjeta').setDescription('ID de la tarjeta').setRequired(true))
                .addStringOption(opt => opt.setName('lista').setDescription('ID de la lista destino').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('vincular')
                .setDescription('Vincular listas a tipos de items (Admin)')
                .addStringOption(opt => opt.setName('tipo').setDescription('Tipo de item').setRequired(true)
                    .addChoices(
                        { name: '🎫 Tickets', value: 'tickets' },
                        { name: '📢 Reportes', value: 'reports' },
                        { name: '💡 Sugerencias', value: 'suggestions' }
                    ))
                .addStringOption(opt => opt.setName('lista_id').setDescription('ID de la lista').setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const config = staffTools.getTrelloConfig(interaction.guildId);

        // Subcomandos que no requieren configuración
        if (subcommand === 'configurar') {
            return await handleConfigurar(interaction);
        }

        if (subcommand === 'desconectar') {
            return await handleDesconectar(interaction);
        }

        // Verificar configuración
        if (!config && subcommand !== 'configurar') {
            return interaction.reply({ 
                content: '❌ Trello no está configurado. Usa `/trello configurar` primero.', 
                ephemeral: true 
            });
        }

        switch (subcommand) {
            case 'listas':
                return await handleListas(interaction, config);
            case 'tarjetas':
                return await handleTarjetas(interaction, config);
            case 'crear':
                return await handleCrear(interaction, config);
            case 'mover':
                return await handleMover(interaction, config);
            case 'vincular':
                return await handleVincular(interaction, config);
        }
    }
};

async function handleConfigurar(interaction) {
    const apiKey = interaction.options.getString('api_key');
    const apiToken = interaction.options.getString('api_token');
    const boardId = interaction.options.getString('board_id');

    await interaction.deferReply({ ephemeral: true });

    // Verificar conexión
    try {
        const res = await fetch(
            `https://api.trello.com/1/boards/${boardId}?key=${apiKey}&token=${apiToken}`
        );

        if (!res.ok) {
            return interaction.editReply({ content: '❌ No se pudo conectar al tablero. Verifica las credenciales.' });
        }

        const board = await res.json();

        staffTools.configureTrello(interaction.guildId, apiKey, apiToken, boardId, board.name);

        return interaction.editReply({ 
            content: `✅ Trello configurado correctamente.\n📋 Tablero: **${board.name}**` 
        });
    } catch (e) {
        return interaction.editReply({ content: `❌ Error: ${e.message}` });
    }
}

async function handleDesconectar(interaction) {
    const deleted = staffTools.disableTrello(interaction.guildId);

    if (deleted) {
        return interaction.reply({ content: '✅ Trello desconectado.', ephemeral: true });
    } else {
        return interaction.reply({ content: '❌ Trello no estaba configurado.', ephemeral: true });
    }
}

async function handleListas(interaction, config) {
    await interaction.deferReply();

    const lists = await staffTools.getTrelloLists(config.board_id, config.api_key, config.api_token);

    if (lists.error) {
        return interaction.editReply({ content: `❌ ${lists.error}` });
    }

    const embed = new EmbedBuilder()
        .setColor(0x0079BF)
        .setTitle(`📋 Listas de ${config.board_name}`)
        .setDescription(
            lists.map(l => 
                `**${l.name}**\nID: \`${l.id}\``
            ).join('\n\n')
        );

    return interaction.editReply({ embeds: [embed] });
}

async function handleTarjetas(interaction, config) {
    const listaFiltro = interaction.options.getString('lista');

    await interaction.deferReply();

    const cards = await staffTools.getTrelloCards(config);

    if (cards.error) {
        return interaction.editReply({ content: `❌ ${cards.error}` });
    }

    // Filtrar por lista si se especifica
    const filteredCards = listaFiltro 
        ? cards.filter(c => c.listId === listaFiltro || c.name.toLowerCase().includes(listaFiltro.toLowerCase()))
        : cards;

    if (filteredCards.length === 0) {
        return interaction.editReply({ content: 'No hay tarjetas.' });
    }

    const embed = new EmbedBuilder()
        .setColor(0x0079BF)
        .setTitle(`📋 Tarjetas (${filteredCards.length})`)
        .setDescription(
            filteredCards.slice(0, 15).map(c => 
                `**${c.name}**\n` +
                `🏷️ ${c.labels?.join(', ') || 'Sin etiquetas'}\n` +
                `[Ver](${c.url})`
            ).join('\n\n')
        )
        .setFooter({ text: `${config.board_name}` });

    return interaction.editReply({ embeds: [embed] });
}

async function handleCrear(interaction, config) {
    const listaInput = interaction.options.getString('lista');
    const titulo = interaction.options.getString('titulo');
    const descripcion = interaction.options.getString('descripcion') || '';

    await interaction.deferReply();

    // Obtener ID de lista si es un nombre
    let listId = listaInput;
    if (!listaInput.match(/^[a-f0-9]{24}$/)) {
        const lists = await staffTools.getTrelloLists(config.board_id, config.api_key, config.api_token);
        const list = lists.find(l => l.name.toLowerCase() === listaInput.toLowerCase());
        if (!list) {
            return interaction.editReply({ content: '❌ Lista no encontrada. Usa el nombre exacto o el ID.' });
        }
        listId = list.id;
    }

    const result = await staffTools.createTrelloCard(config, listId, titulo, descripcion);

    if (result.error) {
        return interaction.editReply({ content: `❌ ${result.error}` });
    }

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Tarjeta creada')
        .setDescription(`**${titulo}**\n${descripcion || 'Sin descripción'}`)
        .addFields({ name: 'URL', value: result.shortUrl || result.url })
        .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}

async function handleMover(interaction, config) {
    const tarjetaId = interaction.options.getString('tarjeta');
    const listaId = interaction.options.getString('lista');

    await interaction.deferReply();

    const result = await staffTools.moveTrelloCard(config, tarjetaId, listaId);

    if (result.error) {
        return interaction.editReply({ content: `❌ ${result.error}` });
    }

    return interaction.editReply({ content: '✅ Tarjeta movida correctamente.' });
}

async function handleVincular(interaction, config) {
    const tipo = interaction.options.getString('tipo');
    const listaId = interaction.options.getString('lista_id');

    // Actualizar listIds en la configuración
    const listIds = config.listIds || {};
    listIds[tipo] = listaId;

    staffTools.configureTrello(
        interaction.guildId, 
        config.api_key, 
        config.api_token, 
        config.board_id, 
        config.board_name, 
        listIds
    );

    return interaction.reply({ 
        content: `✅ Lista vinculada: **${tipo}** → \`${listaId}\``,
        ephemeral: true 
    });
}

// ═══════════════════════════════════════════════════
//  COMANDO: /conocimiento
//  Gestión de la base de conocimiento
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const semanticSearch = require('../../modules/semanticSearch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('conocimiento')
        .setDescription('Gestiona la base de conocimiento del servidor')
        .addSubcommand(sub =>
            sub.setName('agregar')
                .setDescription('Agrega un documento a la base de conocimiento')
                .addStringOption(opt => opt.setName('titulo').setDescription('Título del documento').setRequired(true))
                .addStringOption(opt => opt.setName('contenido').setDescription('Contenido del documento').setRequired(true))
                .addStringOption(opt => opt.setName('categoria').setDescription('Categoría').setRequired(false)
                    .addChoices(
                        { name: '📜 Reglas', value: 'rules' },
                        { name: '❓ FAQs', value: 'faq' },
                        { name: '📚 General', value: 'general' },
                        { name: '🎮 Gaming', value: 'gaming' },
                        { name: '🛠️ Guías', value: 'guides' }
                    ))
                .addStringOption(opt => opt.setName('keywords').setDescription('Palabras clave (separadas por coma)').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver un documento específico')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del documento').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('Lista documentos de la base de conocimiento')
                .addStringOption(opt => opt.setName('categoria').setDescription('Filtrar por categoría').setRequired(false)
                    .addChoices(
                        { name: '📜 Reglas', value: 'rules' },
                        { name: '❓ FAQs', value: 'faq' },
                        { name: '📚 General', value: 'general' },
                        { name: '🎮 Gaming', value: 'gaming' },
                        { name: '📝 Archivo', value: 'channel_archive' }
                    ))
                .addIntegerOption(opt => opt.setName('limite').setDescription('Cantidad a mostrar (max 20)').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('eliminar')
                .setDescription('Elimina un documento de la base de conocimiento')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del documento').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('estadisticas')
                .setDescription('Muestra estadísticas de la base de conocimiento'))
        .addSubcommand(sub =>
            sub.setName('indexar')
                .setDescription('Indexa mensajes de un canal (staff only)')
                .addChannelOption(opt => opt.setName('canal').setDescription('Canal a indexar').setRequired(true))
                .addIntegerOption(opt => opt.setName('limite').setDescription('Cantidad de mensajes (max 100)').setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'agregar':
                return await handleAgregar(interaction);
            case 'ver':
                return await handleVer(interaction);
            case 'lista':
                return await handleLista(interaction);
            case 'eliminar':
                return await handleEliminar(interaction);
            case 'estadisticas':
                return await handleEstadisticas(interaction);
            case 'indexar':
                return await handleIndexar(interaction);
        }
    }
};

async function handleAgregar(interaction) {
    const titulo = interaction.options.getString('titulo');
    const contenido = interaction.options.getString('contenido');
    const categoria = interaction.options.getString('categoria') || 'general';
    const keywordsStr = interaction.options.getString('keywords') || '';
    const keywords = keywordsStr.split(',').map(k => k.trim()).filter(k => k);

    const result = semanticSearch.addDocument(
        interaction.guildId,
        titulo,
        contenido,
        categoria,
        keywords,
        'manual',
        interaction.user.id
    );

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📄 Documento agregado')
        .addFields(
            { name: 'ID', value: `#${result.id}`, inline: true },
            { name: 'Título', value: titulo, inline: true },
            { name: 'Categoría', value: categoria, inline: true }
        )
        .setDescription(contenido.substring(0, 200) + (contenido.length > 200 ? '...' : ''))
        .setFooter({ text: `Agregado por ${interaction.user.username}` })
        .setTimestamp();

    return interaction.reply({ embeds: [embed] });
}

async function handleVer(interaction) {
    const id = interaction.options.getInteger('id');
    const doc = semanticSearch.getDocument(id);

    if (!doc || doc.guild_id !== interaction.guildId) {
        return interaction.reply({ content: '❌ Documento no encontrado.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📄 ${doc.title}`)
        .setDescription(doc.content)
        .addFields(
            { name: 'ID', value: `#${doc.id}`, inline: true },
            { name: 'Categoría', value: doc.category, inline: true },
            { name: 'Creado', value: new Date(doc.created_at).toLocaleDateString('es-AR'), inline: true }
        );

    if (doc.keywords && doc.keywords.length > 0) {
        embed.addFields({ name: 'Etiquetas', value: doc.keywords.join(', '), inline: false });
    }

    embed.setFooter({ text: `Fuente: ${doc.source || 'manual'}` });

    return interaction.reply({ embeds: [embed] });
}

async function handleLista(interaction) {
    const categoria = interaction.options.getString('categoria');
    const limite = Math.min(interaction.options.getInteger('limite') || 10, 20);

    const docs = semanticSearch.listDocuments(interaction.guildId, categoria, limite);

    if (docs.length === 0) {
        return interaction.reply({ content: '📭 No hay documentos en la base de conocimiento.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📚 Base de Conocimiento${categoria ? ` - ${categoria}` : ''}`)
        .setDescription(
            docs.map(d => 
                `**#${d.id}** - ${d.title} [${d.category}]`
            ).join('\n')
        )
        .setFooter({ text: `${docs.length} documentos • Usa /conocimiento ver <id> para ver detalles` })
        .setTimestamp();

    return interaction.reply({ embeds: [embed] });
}

async function handleEliminar(interaction) {
    const id = interaction.options.getInteger('id');
    const deleted = semanticSearch.deleteDocument(id, interaction.guildId);

    if (deleted) {
        return interaction.reply({ content: `✅ Documento #${id} eliminado correctamente.`, ephemeral: true });
    } else {
        return interaction.reply({ content: '❌ Documento no encontrado.', ephemeral: true });
    }
}

async function handleEstadisticas(interaction) {
    const stats = semanticSearch.getStats(interaction.guildId);

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Estadísticas de Base de Conocimiento')
        .addFields(
            { name: '📚 Total documentos', value: `${stats.total}`, inline: true },
            { name: '🧠 Con embeddings', value: `${stats.withEmbeddings}`, inline: true }
        );

    if (stats.byCategory.length > 0) {
        embed.addFields({
            name: '📂 Por categoría',
            value: stats.byCategory.map(c => `${c.category}: ${c.count}`).join('\n'),
            inline: false
        });
    }

    return interaction.reply({ embeds: [embed] });
}

async function handleIndexar(interaction) {
    const canal = interaction.options.getChannel('canal');
    const limite = Math.min(interaction.options.getInteger('limite') || 50, 100);

    await interaction.deferReply({ ephemeral: true });

    const result = await semanticSearch.indexChannel(
        interaction.guildId,
        canal.id,
        interaction.client,
        limite
    );

    if (result.error) {
        return interaction.editReply({ content: `❌ Error: ${result.error}` });
    }

    return interaction.editReply({ 
        content: `✅ Indexación completada.\n📄 ${result.indexed} mensajes nuevos indexados de ${result.total} analizados.`
    });
}

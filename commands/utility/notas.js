// ════════════════════════════════════════════════════════════════
// 📝 NOTAS - Comando Utility
// Sistema de notas personales privadas
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { _db: db } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('notas')
        .setDescription('📝 Sistema de notas personales privadas')
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('✏️ Crear una nueva nota')
                .addStringOption(opt =>
                    opt.setName('titulo')
                        .setDescription('Título de la nota')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('contenido')
                        .setDescription('Contenido de la nota')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Categoría de la nota')
                        .setRequired(false)
                        .addChoices(
                            { name: '📌 General', value: 'general' },
                            { name: '📋 Tareas', value: 'tareas' },
                            { name: '💡 Ideas', value: 'ideas' },
                            { name: '📚 Estudio', value: 'estudio' },
                            { name: '🎮 Gaming', value: 'gaming' },
                            { name: '💰 Finanzas', value: 'finanzas' }
                        )))
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('📖 Ver tus notas')
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Filtrar por categoría')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('editar')
                .setDescription('✏️ Editar una nota existente')
                .addIntegerOption(opt =>
                    opt.setName('id')
                        .setDescription('ID de la nota')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('titulo')
                        .setDescription('Nuevo título')
                        .setRequired(false))
                .addStringOption(opt =>
                    opt.setName('contenido')
                        .setDescription('Nuevo contenido')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('eliminar')
                .setDescription('🗑️ Eliminar una nota')
                .addIntegerOption(opt =>
                    opt.setName('id')
                        .setDescription('ID de la nota')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('buscar')
                .setDescription('🔍 Buscar en tus notas')
                .addStringOption(opt =>
                    opt.setName('termino')
                        .setDescription('Término de búsqueda')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        switch (subcommand) {
            case 'crear':
                return this.crearNota(interaction, userId);
            case 'ver':
                return this.verNotas(interaction, userId);
            case 'editar':
                return this.editarNota(interaction, userId);
            case 'eliminar':
                return this.eliminarNota(interaction, userId);
            case 'buscar':
                return this.buscarNotas(interaction, userId);
        }
    },

    async crearNota(interaction, userId) {
        const titulo = interaction.options.getString('titulo');
        const contenido = interaction.options.getString('contenido');
        const categoria = interaction.options.getString('categoria') || 'general';

        const stmt = db.prepare(`
            INSERT INTO user_notes (user_id, title, content, category, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(userId, titulo, contenido, categoria, Date.now());

        const noteId = stmt.lastInsertRowid;

        const embed = new EmbedBuilder()
            .setTitle('📝 Nota Creada')
            .setDescription(`**${titulo}**`)
            .addFields(
                { name: '📄 Contenido', value: contenido.substring(0, 1024), inline: false },
                { name: '🏷️ Categoría', value: categoria, inline: true },
                { name: '🆔 ID', value: `#${noteId}`, inline: true }
            )
            .setColor(0x4CAF50)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async verNotas(interaction, userId) {
        const categoria = interaction.options.getString('categoria');

        let query = 'SELECT * FROM user_notes WHERE user_id = ?';
        const params = [userId];

        if (categoria) {
            query += ' AND category = ?';
            params.push(categoria);
        }

        query += ' ORDER BY created_at DESC LIMIT 25';

        const stmt = db.prepare(query);
        const notas = stmt.all(...params);

        if (notas.length === 0) {
            return interaction.reply({ 
                content: '📋 No tenés notas guardadas.' + (categoria ? ` en la categoría "${categoria}"` : ''), 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📝 Mis Notas')
            .setDescription(`Total: **${notas.length}** notas`)
            .setColor(0x2196F3)
            .setTimestamp();

        notas.forEach(nota => {
            const preview = nota.content.length > 100 
                ? nota.content.substring(0, 100) + '...' 
                : nota.content;
            embed.addFields({
                name: `#${nota.id} · ${nota.title}`,
                value: `${preview}\n🏷️ ${nota.category} · <t:${Math.floor(nota.created_at/1000)}:R>`,
                inline: false
            });
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async editarNota(interaction, userId) {
        const notaId = interaction.options.getInteger('id');
        const nuevoTitulo = interaction.options.getString('titulo');
        const nuevoContenido = interaction.options.getString('contenido');

        // Verificar que la nota existe y es del usuario
        const stmt = db.prepare('SELECT * FROM user_notes WHERE id = ? AND user_id = ?');
        const nota = stmt.get(notaId, userId);

        if (!nota) {
            return interaction.reply({ 
                content: '❌ No encontré esa nota o no te pertenece.', 
                ephemeral: true 
            });
        }

        const titulo = nuevoTitulo || nota.title;
        const contenido = nuevoContenido || nota.content;

        db.prepare(`
            UPDATE user_notes 
            SET title = ?, content = ?, updated_at = ?
            WHERE id = ?
        `).run(titulo, contenido, Date.now(), notaId);

        const embed = new EmbedBuilder()
            .setTitle('✏️ Nota Actualizada')
            .setDescription(`**${titulo}**`)
            .addFields({ name: '📄 Contenido', value: contenido.substring(0, 1024), inline: false })
            .setColor(0xFF9800)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async eliminarNota(interaction, userId) {
        const notaId = interaction.options.getInteger('id');

        const stmt = db.prepare('SELECT * FROM user_notes WHERE id = ? AND user_id = ?');
        const nota = stmt.get(notaId, userId);

        if (!nota) {
            return interaction.reply({ 
                content: '❌ No encontré esa nota o no te pertenece.', 
                ephemeral: true 
            });
        }

        db.prepare('DELETE FROM user_notes WHERE id = ?').run(notaId);

        return interaction.reply({ 
            content: `🗑️ Nota **"${nota.title}"** eliminada correctamente.`, 
            ephemeral: true 
        });
    },

    async buscarNotas(interaction, userId) {
        const termino = interaction.options.getString('termino').toLowerCase();

        const stmt = db.prepare(`
            SELECT * FROM user_notes 
            WHERE user_id = ? AND (LOWER(title) LIKE ? OR LOWER(content) LIKE ?)
            ORDER BY created_at DESC
        `);
        const notas = stmt.all(userId, `%${termino}%`, `%${termino}%`);

        if (notas.length === 0) {
            return interaction.reply({ 
                content: `🔍 No encontré notas con "${termino}".`, 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Resultados: "${termino}"`)
            .setDescription(`Encontradas: **${notas.length}** notas`)
            .setColor(0x9C27B0)
            .setTimestamp();

        notas.slice(0, 10).forEach(nota => {
            embed.addFields({
                name: `#${nota.id} · ${nota.title}`,
                value: nota.content.substring(0, 100) + (nota.content.length > 100 ? '...' : ''),
                inline: false
            });
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

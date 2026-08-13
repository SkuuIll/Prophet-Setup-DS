// ════════════════════════════════════════════════════════════════
// 📋 LISTA - Comando Utility
// Listas de tareas (to-do) con checkboxes
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { _db: db } = require('../../database');

const CATEGORY_EMOJIS = {
    'general': '📋',
    'trabajo': '💼',
    'estudio': '📚',
    'gaming': '🎮',
    'hogar': '🏠',
    'salud': '💪'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lista')
        .setDescription('📋 Sistema de listas de tareas')
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('➕ Crear una nueva lista')
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nombre de la lista')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Categoría')
                        .setRequired(false)
                        .addChoices(
                            { name: '📋 General', value: 'general' },
                            { name: '💼 Trabajo', value: 'trabajo' },
                            { name: '📚 Estudio', value: 'estudio' },
                            { name: '🎮 Gaming', value: 'gaming' },
                            { name: '🏠 Hogar', value: 'hogar' },
                            { name: '💪 Salud', value: 'salud' }
                        )))
        .addSubcommand(sub =>
            sub.setName('agregar')
                .setDescription('➕ Agregar tarea a una lista')
                .addIntegerOption(opt =>
                    opt.setName('lista')
                        .setDescription('ID de la lista')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('tarea')
                        .setDescription('Descripción de la tarea')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('prioridad')
                        .setDescription('Prioridad')
                        .setRequired(false)
                        .addChoices(
                            { name: '🔴 Alta', value: 'alta' },
                            { name: '🟡 Media', value: 'media' },
                            { name: '🟢 Baja', value: 'baja' }
                        )))
        .addSubcommand(sub =>
            sub.setName('completar')
                .setDescription('✅ Marcar tarea como completada')
                .addIntegerOption(opt =>
                    opt.setName('tarea')
                        .setDescription('ID de la tarea')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('📖 Ver mis listas')
                .addIntegerOption(opt =>
                    opt.setName('lista')
                        .setDescription('ID de lista específica')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('eliminar')
                .setDescription('🗑️ Eliminar lista o tarea')
                .addStringOption(opt =>
                    opt.setName('tipo')
                        .setDescription('Qué eliminar')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Lista completa', value: 'lista' },
                            { name: 'Tarea específica', value: 'tarea' }
                        ))
                .addIntegerOption(opt =>
                    opt.setName('id')
                        .setDescription('ID a eliminar')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        switch (subcommand) {
            case 'crear':
                return this.crearLista(interaction, userId);
            case 'agregar':
                return this.agregarTarea(interaction, userId);
            case 'completar':
                return this.completarTarea(interaction, userId);
            case 'ver':
                return this.verListas(interaction, userId);
            case 'eliminar':
                return this.eliminar(interaction, userId);
        }
    },

    async crearLista(interaction, userId) {
        const nombre = interaction.options.getString('nombre');
        const categoria = interaction.options.getString('categoria') || 'general';

        const stmt = db.prepare(`
            INSERT INTO todo_lists (user_id, name, category, created_at)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(userId, nombre, categoria, Date.now());

        const embed = new EmbedBuilder()
            .setTitle(`${CATEGORY_EMOJIS[categoria]} Lista Creada`)
            .setDescription(`**${nombre}**`)
            .addFields(
                { name: '🏷️ Categoría', value: categoria, inline: true },
                { name: '🆔 ID', value: `#${stmt.lastInsertRowid}`, inline: true }
            )
            .setColor(0x4CAF50)
            .setFooter({ text: 'Usa /lista agregar para añadir tareas' })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async agregarTarea(interaction, userId) {
        const listaId = interaction.options.getInteger('lista');
        const tarea = interaction.options.getString('tarea');
        const prioridad = interaction.options.getString('prioridad') || 'media';

        // Verificar que la lista existe y es del usuario
        const lista = db.prepare('SELECT * FROM todo_lists WHERE id = ? AND user_id = ?').get(listaId, userId);
        if (!lista) {
            return interaction.reply({ 
                content: '❌ No encontré esa lista o no te pertenece.', 
                ephemeral: true 
            });
        }

        const stmt = db.prepare(`
            INSERT INTO todo_items (list_id, task, priority, created_at)
            VALUES (?, ?, ?, ?)
        `);
        stmt.run(listaId, tarea, prioridad, Date.now());

        const prioridadEmoji = { alta: '🔴', media: '🟡', baja: '🟢' };
        const embed = new EmbedBuilder()
            .setTitle('➕ Tarea Agregada')
            .setDescription(`**${tarea}**`)
            .addFields(
                { name: '📋 Lista', value: lista.name, inline: true },
                { name: '🎯 Prioridad', value: `${prioridadEmoji[prioridad]} ${prioridad}`, inline: true },
                { name: '🆔 Tarea ID', value: `#${stmt.lastInsertRowid}`, inline: true }
            )
            .setColor(0x2196F3)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async completarTarea(interaction, userId) {
        const tareaId = interaction.options.getInteger('tarea');

        // Verificar tarea
        const tarea = db.prepare(`
            SELECT ti.*, tl.user_id 
            FROM todo_items ti 
            JOIN todo_lists tl ON ti.list_id = tl.id 
            WHERE ti.id = ?
        `).get(tareaId);

        if (!tarea || tarea.user_id !== userId) {
            return interaction.reply({ 
                content: '❌ No encontré esa tarea o no te pertenece.', 
                ephemeral: true 
            });
        }

        if (tarea.completed) {
            return interaction.reply({ 
                content: '✅ Esta tarea ya está completada.', 
                ephemeral: true 
            });
        }

        db.prepare(`
            UPDATE todo_items SET completed = 1, completed_at = ? WHERE id = ?
        `).run(Date.now(), tareaId);

        const embed = new EmbedBuilder()
            .setTitle('✅ Tarea Completada')
            .setDescription(`~~${tarea.task}~~`)
            .addFields({ name: '🎯 Prioridad', value: tarea.priority, inline: true })
            .setColor(0x4CAF50)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async verListas(interaction, userId) {
        const listaId = interaction.options.getInteger('lista');

        if (listaId) {
            return this.verListaEspecifica(interaction, userId, listaId);
        }

        // Ver todas las listas
        const listas = db.prepare(`
            SELECT l.*, 
                   COUNT(i.id) as total_tasks,
                   SUM(i.completed) as completed_tasks
            FROM todo_lists l
            LEFT JOIN todo_items i ON l.id = i.list_id
            WHERE l.user_id = ?
            GROUP BY l.id
            ORDER BY l.created_at DESC
        `).all(userId);

        if (listas.length === 0) {
            return interaction.reply({ 
                content: '📋 No tenés listas creadas. Usa `/lista crear` para empezar.', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Mis Listas de Tareas')
            .setColor(0x2196F3)
            .setTimestamp();

        listas.forEach(lista => {
            const emoji = CATEGORY_EMOJIS[lista.category] || '📋';
            const progress = lista.total_tasks > 0 
                ? Math.round((lista.completed_tasks / lista.total_tasks) * 100) 
                : 0;
            const progressBar = this.createProgressBar(progress);

            embed.addFields({
                name: `${emoji} #${lista.id} · ${lista.name}`,
                value: `${progressBar} ${lista.completed_tasks}/${lista.total_tasks} (${progress}%)`,
                inline: false
            });
        });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async verListaEspecifica(interaction, userId, listaId) {
        const lista = db.prepare('SELECT * FROM todo_lists WHERE id = ? AND user_id = ?').get(listaId, userId);

        if (!lista) {
            return interaction.reply({ 
                content: '❌ No encontré esa lista o no te pertenece.', 
                ephemeral: true 
            });
        }

        const tareas = db.prepare('SELECT * FROM todo_items WHERE list_id = ? ORDER BY completed, priority DESC').all(listaId);

        const embed = new EmbedBuilder()
            .setTitle(`${CATEGORY_EMOJIS[lista.category] || '📋'} ${lista.name}`)
            .setColor(0x2196F3)
            .setTimestamp();

        if (tareas.length === 0) {
            embed.setDescription('*Lista vacía. Usa `/lista agregar` para añadir tareas.*');
        } else {
            const prioridadEmoji = { alta: '🔴', media: '🟡', baja: '🟢' };
            
            tareas.forEach(t => {
                const status = t.completed ? '✅' : '⬜';
                const taskText = t.completed ? `~~${t.task}~~` : t.task;
                embed.addFields({
                    name: `${status} #${t.id}`,
                    value: `${taskText}\n${prioridadEmoji[t.priority]} ${t.priority}`,
                    inline: false
                });
            });
        }

        const completadas = tareas.filter(t => t.completed).length;
        embed.setFooter({ text: `${completadas}/${tareas.length} completadas` });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async eliminar(interaction, userId) {
        const tipo = interaction.options.getString('tipo');
        const id = interaction.options.getInteger('id');

        if (tipo === 'lista') {
            const lista = db.prepare('SELECT * FROM todo_lists WHERE id = ? AND user_id = ?').get(id, userId);
            if (!lista) {
                return interaction.reply({ content: '❌ Lista no encontrada.', ephemeral: true });
            }
            
            db.prepare('DELETE FROM todo_items WHERE list_id = ?').run(id);
            db.prepare('DELETE FROM todo_lists WHERE id = ?').run(id);
            
            return interaction.reply({ content: `🗑️ Lista **"${lista.name}"** eliminada.`, ephemeral: true });
        } else {
            const tarea = db.prepare(`
                SELECT ti.*, tl.user_id 
                FROM todo_items ti 
                JOIN todo_lists tl ON ti.list_id = tl.id 
                WHERE ti.id = ?
            `).get(id);
            
            if (!tarea || tarea.user_id !== userId) {
                return interaction.reply({ content: '❌ Tarea no encontrada.', ephemeral: true });
            }
            
            db.prepare('DELETE FROM todo_items WHERE id = ?').run(id);
            return interaction.reply({ content: `🗑️ Tarea eliminada.`, ephemeral: true });
        }
    },

    createProgressBar(percent, length = 10) {
        const filled = Math.round((percent / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { findFAQAnswer, listFAQs, addCustomFAQ, deleteFAQ } = require('../../modules/advancedMod');
const { makeEmbed, notice, safeText } = require('../../utils/discordUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Preguntas frecuentes y respuestas del servidor')
        .addSubcommand(s => s.setName('preguntar').setDescription('Buscar una respuesta')
            .addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta').setRequired(true).setMaxLength(200)))
        .addSubcommand(s => s.setName('lista').setDescription('Explorar preguntas frecuentes')
            .addStringOption(o => o.setName('categoria').setDescription('Categoría opcional').addChoices(
                { name: 'General', value: 'general' },
                { name: 'Economía', value: 'economia' },
                { name: 'Música', value: 'musica' },
                { name: 'Perfil', value: 'perfil' },
                { name: 'Moderación', value: 'moderacion' },
                { name: 'Utilidades', value: 'utilidades' },
                { name: 'Eventos', value: 'eventos' },
                { name: 'Personalizadas', value: 'custom' },
            )))
        .addSubcommand(s => s.setName('agregar').setDescription('Agregar una pregunta (Staff)')
            .addStringOption(o => o.setName('pregunta').setDescription('Pregunta').setRequired(true).setMaxLength(200))
            .addStringOption(o => o.setName('respuesta').setDescription('Respuesta').setRequired(true).setMaxLength(1000))
            .addStringOption(o => o.setName('keywords').setDescription('Palabras clave separadas por coma').setMaxLength(100))
            .addStringOption(o => o.setName('categoria').setDescription('Categoría').addChoices(
                { name: 'General', value: 'general' }, { name: 'Economía', value: 'economia' },
                { name: 'Música', value: 'musica' }, { name: 'Perfil', value: 'perfil' },
                { name: 'Utilidades', value: 'utilidades' },
            )))
        .addSubcommand(s => s.setName('eliminar').setDescription('Eliminar una pregunta (Staff)')
            .addIntegerOption(o => o.setName('id').setDescription('ID de la pregunta').setRequired(true))),
    async execute(interaction) {
        const action = interaction.options.getSubcommand();
        const staffAction = action === 'agregar' || action === 'eliminar';
        if (staffAction && (!interaction.inGuild?.() ||
            !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))) {
            return interaction.reply(notice({ title: 'Acceso restringido', description: 'Solo quienes administran el servidor pueden modificar las preguntas frecuentes.', tone: 'error' }));
        }
        if (action === 'preguntar') {
            await interaction.deferReply();
            const found = findFAQAnswer(interaction.options.getString('pregunta'));
            if (!found) return interaction.editReply({
                embeds: [makeEmbed({
                    title: 'Todavía no encontré una respuesta',
                    description: 'Probá con otras palabras, consultá /faq lista o abrí /ayuda. Para hablar con el Staff, usá el panel de tickets.',
                    tone: 'warning',
                    footer: 'Preguntas frecuentes',
                })],
            });
            return interaction.editReply({
                embeds: [makeEmbed({
                    title: safeText(found.question, 190),
                    description: safeText(found.answer, 3900),
                    tone: 'success',
                    fields: [{ name: 'Categoría', value: String(found.category || 'general'), inline: true }],
                    footer: 'Preguntas frecuentes · /faq lista',
                })],
                allowedMentions: { parse: [] },
            });
        }
        if (action === 'lista') {
            const faqs = listFAQs(interaction.options.getString('categoria'));
            if (!faqs.length) return interaction.reply(notice({
                title: 'Sin preguntas', description: 'Todavía no hay respuestas en esta categoría.', tone: 'warning'
            }));
            const groups = new Map();
            for (const faq of faqs) {
                const category = String(faq.category || 'general');
                if (!groups.has(category)) groups.set(category, []);
                groups.get(category).push(faq);
            }
            const fields = [...groups.entries()].slice(0, 20).map(([category, questions]) => ({
                name: category + ' · ' + questions.length,
                value: questions.slice(0, 5).map(f => '• ' + safeText(f.question, 130)).join('\n')
                    + (questions.length > 5 ? '\n… y ' + (questions.length - 5) + ' más.' : ''),
            }));
            return interaction.reply({
                embeds: [makeEmbed({ title: 'Preguntas frecuentes', description: 'Explorá por tema o usá /faq preguntar para buscar una respuesta.', fields, footer: 'FAQ · ' + faqs.length + ' preguntas' })],
                allowedMentions: { parse: [] },
            });
        }
        if (action === 'agregar') {
            const question = interaction.options.getString('pregunta');
            const answer = interaction.options.getString('respuesta');
            const keywords = interaction.options.getString('keywords') || question.split(/\s+/).filter(w => w.length > 3).join(',').slice(0, 100);
            const category = interaction.options.getString('categoria') || 'custom';
            addCustomFAQ(question, answer, keywords, category);
            return interaction.reply(notice({
                title: 'Pregunta agregada',
                description: '**Pregunta:** ' + safeText(question, 200) + '\n**Categoría:** ' + category,
                tone: 'success',
            }));
        }
        if (action === 'eliminar') {
            const id = interaction.options.getInteger('id');
            const removed = deleteFAQ(id);
            return interaction.reply(notice({
                title: removed.changes ? 'Pregunta eliminada' : 'No se encontró esa pregunta',
                description: removed.changes ? 'Se eliminó la pregunta #' + id + '.' : 'Verificá el ID y probá nuevamente.',
                tone: removed.changes ? 'success' : 'warning',
            }));
        }
    },
};

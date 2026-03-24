// ═══════════════════════════════════════════════════════════════
// COMANDO: /faq - Sistema de preguntas frecuentes
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { findFAQAnswer, listFAQs, addCustomFAQ, deleteFAQ, initializeFAQ } = require('../../modules/advancedMod');

// Inicializar FAQ al cargar
initializeFAQ();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('faq')
        .setDescription('Sistema de preguntas frecuentes')
        .addSubcommand(sub =>
            sub.setName('preguntar')
                .setDescription('Hacé una pregunta al sistema de FAQ')
                .addStringOption(opt =>
                    opt.setName('pregunta')
                        .setDescription('Tu pregunta')
                        .setRequired(true)
                        .setMaxLength(200)))
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('Ver todas las preguntas frecuentes')
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Filtrar por categoría')
                        .setRequired(false)
                        .addChoices(
                            { name: '📖 General', value: 'general' },
                            { name: '💰 Economía', value: 'economia' },
                            { name: '🎵 Música', value: 'musica' },
                            { name: '👤 Perfil', value: 'perfil' },
                            { name: '🛡️ Moderación', value: 'moderacion' },
                            { name: '🔧 Utilidades', value: 'utilidades' },
                            { name: '🎉 Eventos', value: 'eventos' },
                            { name: '📝 Custom', value: 'custom' }
                        )))
        .addSubcommand(sub =>
            sub.setName('agregar')
                .setDescription('Agregar una FAQ personalizada (Staff)')
                .addStringOption(opt =>
                    opt.setName('pregunta')
                        .setDescription('La pregunta')
                        .setRequired(true)
                        .setMaxLength(200))
                .addStringOption(opt =>
                    opt.setName('respuesta')
                        .setDescription('La respuesta')
                        .setRequired(true)
                        .setMaxLength(1000))
                .addStringOption(opt =>
                    opt.setName('keywords')
                        .setDescription('Palabras clave separadas por coma (ej: nivel,xp,subir)')
                        .setRequired(false)
                        .setMaxLength(100))
                .addStringOption(opt =>
                    opt.setName('categoria')
                        .setDescription('Categoría')
                        .setRequired(false)
                        .addChoices(
                            { name: '📖 General', value: 'general' },
                            { name: '💰 Economía', value: 'economia' },
                            { name: '🎵 Música', value: 'musica' },
                            { name: '👤 Perfil', value: 'perfil' },
                            { name: '🔧 Utilidades', value: 'utilidades' }
                        )))
        .addSubcommand(sub =>
            sub.setName('eliminar')
                .setDescription('Eliminar una FAQ (Staff)')
                .addIntegerOption(opt =>
                    opt.setName('id')
                        .setDescription('ID de la FAQ a eliminar')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Verificar permisos para comandos de staff
        if (['agregar', 'eliminar'].includes(subcommand)) {
            if (!interaction.member.permissions.has('ManageGuild')) {
                return interaction.reply({
                    content: '❌ No tenés permisos para gestionar FAQs.',
                    ephemeral: true
                });
            }
        }

        switch (subcommand) {
            case 'preguntar':
                return await askFAQ(interaction);
            case 'lista':
                return await listFAQCommand(interaction);
            case 'agregar':
                return await addFAQCommand(interaction);
            case 'eliminar':
                return await deleteFAQCommand(interaction);
        }
    }
};

async function askFAQ(interaction) {
    const pregunta = interaction.options.getString('pregunta');
    
    await interaction.deferReply();

    const answer = findFAQAnswer(pregunta);

    if (!answer) {
        const embed = new EmbedBuilder()
            .setTitle('❓ No encontré una respuesta')
            .setColor(0xFFB74D)
            .setDescription(`No tengo una respuesta específica para esa pregunta.`)
            .addFields(
                { name: '💡 Sugerencias', value: '• Reescribí la pregunta con otras palabras\n• Usá `/faq lista` para ver FAQs disponibles\n• Usá `/ayuda` para ver todos los comandos\n• Contactá al staff con `/reporte`' }
            )
            .setFooter({ text: 'Si creés que debería haber una respuesta, avisale al staff' });

        return interaction.editReply({ embeds: [embed] });
    }

    const embed = new EmbedBuilder()
        .setTitle(`❓ ${answer.question}`)
        .setColor(0x69F0AE)
        .setDescription(answer.answer)
        .addFields(
            { name: '📁 Categoría', value: answer.category, inline: true },
            { name: '📊 Consultas', value: `${answer.use_count + 1}`, inline: true }
        )
        .setFooter({ text: 'FAQ de Prophet Bot • ¿Fue útil? Reacciona con ✅' })
        .setTimestamp();

    const message = await interaction.editReply({ embeds: [embed] });
    await message.react('✅').catch(() => {});
    await message.react('❌').catch(() => {});
}

async function listFAQCommand(interaction) {
    const categoria = interaction.options.getString('categoria');
    const faqs = listFAQs(categoria);

    if (faqs.length === 0) {
        return interaction.reply({
            content: '📭 No hay FAQs en esta categoría.',
            ephemeral: true
        });
    }

    // Agrupar por categoría
    const grouped = {};
    for (const faq of faqs) {
        if (!grouped[faq.category]) grouped[faq.category] = [];
        grouped[faq.category].push(faq);
    }

    const embed = new EmbedBuilder()
        .setTitle('📖 Preguntas Frecuentes')
        .setColor(0xBB86FC)
        .setDescription('Lista de preguntas frecuentes organizadas por categoría:')
        .setTimestamp();

    for (const [cat, items] of Object.entries(grouped)) {
        const emoji = getCategoryEmoji(cat);
        const questions = items
            .slice(0, 5)
            .map(f => `• ${f.question}`)
            .join('\n');
        
        embed.addFields({
            name: `${emoji} ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${items.length})`,
            value: questions + (items.length > 5 ? `\n*...y ${items.length - 5} más*` : ''),
            inline: false
        });
    }

    embed.setFooter({ text: 'Usá /faq preguntar [tu pregunta] para buscar respuestas' });

    return interaction.reply({ embeds: [embed] });
}

async function addFAQCommand(interaction) {
    const pregunta = interaction.options.getString('pregunta');
    const respuesta = interaction.options.getString('respuesta');
    const keywords = interaction.options.getString('keywords') || pregunta.split(' ').filter(w => w.length > 3).join(',');
    const categoria = interaction.options.getString('categoria') || 'custom';

    addCustomFAQ(pregunta, respuesta, keywords, categoria);

    const embed = new EmbedBuilder()
        .setTitle('✅ FAQ Agregada')
        .setColor(0x69F0AE)
        .addFields(
            { name: 'Pregunta', value: pregunta },
            { name: 'Respuesta', value: respuesta.substring(0, 200) + (respuesta.length > 200 ? '...' : '') },
            { name: 'Keywords', value: keywords, inline: true },
            { name: 'Categoría', value: categoria, inline: true }
        )
        .setFooter({ text: `Agregada por ${interaction.user.tag}` })
        .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function deleteFAQCommand(interaction) {
    const id = interaction.options.getInteger('id');

    const result = deleteFAQ(id);

    if (result.changes === 0) {
        return interaction.reply({
            content: '❌ No encontré una FAQ con ese ID.',
            ephemeral: true
        });
    }

    return interaction.reply({
        content: `🗑️ FAQ #${id} eliminada correctamente.`,
        ephemeral: true
    });
}

function getCategoryEmoji(category) {
    const emojis = {
        'general': '📖',
        'economia': '💰',
        'musica': '🎵',
        'perfil': '👤',
        'moderacion': '🛡️',
        'utilidades': '🔧',
        'eventos': '🎉',
        'custom': '⭐',
        'sistema': '⚙️'
    };
    return emojis[category] || '📄';
}

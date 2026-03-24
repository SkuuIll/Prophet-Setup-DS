// ═══════════════════════════════════════════════════
//  COMANDO: /asistente
//  Asistente contextual de comunidad
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { askCommunityAssistant, getSuggestedResponses, detectIntent } = require('../../modules/communityAssistant');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('asistente')
        .setDescription('Preguntale al asistente sobre el servidor')
        .addStringOption(opt =>
            opt.setName('pregunta')
                .setDescription('Tu pregunta sobre el servidor')
                .setRequired(true)
        ),

    async execute(interaction) {
        const question = interaction.options.getString('pregunta');

        await interaction.deferReply();

        const result = await askCommunityAssistant(
            interaction.user.id,
            interaction.channelId,
            question,
            interaction.guild
        );

        if (!result.success) {
            return interaction.editReply({
                content: `❌ Error: ${result.error || 'No pude procesar tu pregunta.'}`
            });
        }

        const intent = result.intent;
        const suggestions = getSuggestedResponses(intent);

        const embed = new EmbedBuilder()
            .setColor(0x2196F3)
            .setAuthor({
                name: '🤖 Asistente de Prophet',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setDescription(result.response)
            .setFooter({ text: 'Usa /help para más información · Asistente IA' });

        // Botones de sugerencias rápidas
        const components = [];
        if (suggestions.length > 0) {
            const row = new ActionRowBuilder();
            suggestions.slice(0, 3).forEach(suggestion => {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`assistant:${suggestion}`)
                        .setLabel(suggestion)
                        .setStyle(ButtonStyle.Secondary)
                );
            });
            components.push(row);
        }

        await interaction.editReply({
            embeds: [embed],
            components
        });
    }
};

// Handler para botones de sugerencias
async function handleAssistantButton(interaction) {
    const suggestion = interaction.customId.replace('assistant:', '');

    // Mapear sugerencias a respuestas predefinidas
    const quickResponses = {
        'Ver reglas completas': 'Las reglas están en el canal #reglas. Las principales son: respetar a todos, no spam, usar canales apropiados, y no contenido NSFW.',
        'Cómo reportar una violación': 'Usa /reporte [usuario] [razón] para reportar a alguien, o abre un ticket en #tickets para casos más graves.',
        'Lista de comandos': 'Usa /help para ver todos los comandos. Los más usados son: /play (música), /daily (monedas), /nivel (tu progreso), y /perfil.',
        'Cómo usar música': 'Únete a un canal de voz y usa /play [canción o URL]. Puedes buscar por nombre o pegar links de YouTube/Spotify.',
        'Comandos de economía': '/daily (recompensa diaria), /work (trabajar), /balance (ver monedas), /gamble (apostar con riesgo), /shop (tienda).',
        'Cómo subir de nivel': 'Envía mensajes, usa comandos y permanece en canales de voz. Cada mensaje da XP aleatorio. Usa /nivel para ver tu progreso.',
        'Cómo ganar monedas': 'Usa /daily cada día, /work cada hora, participa en eventos, o prueba suerte con /gamble (¡cuidado!).',
        'Cómo obtener roles': 'Ve al canal #roles y reacciona al mensaje de roles, o usa el menú de selección para elegir tus juegos.',
        'Próximos eventos': 'Mira el canal #anuncios para eventos próximos. También puedes usar /misiones diarias para objetivos personales.',
        'Cómo reportar': 'Usa /reporte [usuario] [razón] o abre un ticket en #tickets. El staff revisará tu reporte.',
        'Abrir ticket': 'Ve al canal #tickets y haz clic en el botón "Abrir Ticket". Un canal privado se creará para ti.',
    };

    const response = quickResponses[suggestion] || `Para "${suggestion}", usa /help o /asistente con tu pregunta específica.`;

    const embed = new EmbedBuilder()
        .setColor(0x2196F3)
        .setAuthor({
            name: '🤖 Asistente de Prophet',
            iconURL: interaction.client.user.displayAvatarURL()
        })
        .setDescription(response)
        .setFooter({ text: 'Asistente IA' });

    await interaction.update({ embeds: [embed], components: [] });
}

module.exports.handleAssistantButton = handleAssistantButton;

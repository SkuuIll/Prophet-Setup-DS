// ═══════════════════════════════════════════════════
//  COMANDO: /buscar
//  Búsqueda semántica en la base de conocimiento
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const semanticSearch = require('../../modules/semanticSearch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buscar')
        .setDescription('Busca información en la base de conocimiento del servidor')
        .addStringOption(option =>
            option.setName('consulta')
                .setDescription('Qué quieres buscar')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('categoria')
                .setDescription('Filtrar por categoría')
                .setRequired(false)
                .addChoices(
                    { name: '📜 Reglas', value: 'rules' },
                    { name: '❓ FAQs', value: 'faq' },
                    { name: '📚 General', value: 'general' },
                    { name: '📝 Archivo de canal', value: 'channel_archive' },
                    { name: '🎮 Gaming', value: 'gaming' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        const query = interaction.options.getString('consulta');
        const category = interaction.options.getString('categoria');

        await interaction.deferReply();

        try {
            // Realizar búsqueda inteligente
            const result = await semanticSearch.intelligentSearch(
                interaction.guildId,
                query,
                { category }
            );

            if (!result.success) {
                return interaction.editReply({
                    content: `🔍 ${result.message}`,
                    ephemeral: true
                });
            }

            // Si hay respuesta de IA
            if (result.response) {
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('🔍 Resultado de búsqueda')
                    .setDescription(result.response)
                    .setFooter({ text: `${result.results.length} documentos encontrados` })
                    .setTimestamp();

                // Añadir fuentes
                if (result.results.length > 0) {
                    embed.addFields({
                        name: '📄 Fuentes',
                        value: result.results.slice(0, 5).map((r, i) => 
                            `[${i + 1}] ${r.title}`
                        ).join('\n'),
                        inline: false
                    });
                }

                return interaction.editReply({ embeds: [embed] });
            }

            // Sin respuesta de IA, mostrar resultados directamente
            if (result.results.length === 0) {
                return interaction.editReply({
                    content: '🔍 No se encontraron resultados relevantes.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔍 Resultados de búsqueda')
                .setDescription(
                    result.results.slice(0, 3).map((r, i) => 
                        `**${i + 1}. ${r.title}**\n${r.content?.substring(0, 200) || 'Sin contenido'}...`
                    ).join('\n\n')
                )
                .setFooter({ text: `Usa /conocimiento para gestionar la base de conocimiento` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[Buscar] Error:', error);
            return interaction.editReply({
                content: '❌ Error al realizar la búsqueda.',
                ephemeral: true
            });
        }
    }
};

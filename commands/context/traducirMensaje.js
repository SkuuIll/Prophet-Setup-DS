// ═══════════════════════════════════════════════════════════════
// COMANDO CONTEXTUAL: Traducir Mensaje
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Traducir Mensaje')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const message = interaction.targetMessage;
        const content = message.content;

        if (!content || content.length === 0) {
            return interaction.reply({
                content: '❌ No puedo traducir mensajes vacíos o que solo contienen archivos.',
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const fetch = require('node-fetch');
            
            // Detectar idioma y traducir a español
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(content.substring(0, 500))}&langpair=auto|es`;
            
            const response = await fetch(url);
            const data = await response.json();

            if (data.responseStatus !== 200) {
                throw new Error('API error');
            }

            const translated = data.responseData.translatedText;
            const detectedLang = data.responseData.detectedLanguage || 'auto';

            const embed = new EmbedBuilder()
                .setTitle('🌐 Traducción')
                .setColor(0xBB86FC)
                .addFields(
                    { 
                        name: `📝 Original (${detectedLanguage})`, 
                        value: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
                        inline: false 
                    },
                    { 
                        name: '🇦🇷 Traducción (ES)', 
                        value: translated,
                        inline: false 
                    }
                )
                .setFooter({ text: `Traducido por MyMemory • Autor: ${message.author.tag}` })
                .setTimestamp();

            // Indicador de calidad
            if (data.responseData.match < 0.8) {
                embed.addFields({ 
                    name: '⚠️ Nota', 
                    value: 'La traducción puede no ser perfecta.',
                    inline: false 
                });
            }

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error en traducción:', error);
            return interaction.editReply({
                content: '❌ No pude traducir el mensaje. Intentá de nuevo más tarde.'
            });
        }
    }
};

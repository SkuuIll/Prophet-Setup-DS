// ════════════════════════════════════════════════════════════════
// 🐦 TWITTER - Comando Utility
// Buscar tweets y seguir cuentas
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

// Cache simple para evitar rate limits
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

module.exports = {
    data: new SlashCommandBuilder()
        .setName('twitter')
        .setDescription('🐦 Buscar tweets y perfiles de Twitter/X')
        .addSubcommand(sub =>
            sub.setName('usuario')
                .setDescription('👤 Ver perfil de un usuario')
                .addStringOption(opt =>
                    opt.setName('username')
                        .setDescription('Nombre de usuario (sin @)')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('tweet')
                .setDescription('📝 Ver información de un tweet')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del tweet')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('buscar')
                .setDescription('🔍 Buscar tweets')
                .addStringOption(opt =>
                    opt.setName('query')
                        .setDescription('Término de búsqueda')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        // Nota: Sin API oficial de Twitter, usamos scraping básico o APIs alternativas
        // Esto es una implementación simulada que funciona con URLs públicas

        switch (subcommand) {
            case 'usuario':
                return this.verUsuario(interaction);
            case 'tweet':
                return this.verTweet(interaction);
            case 'buscar':
                return this.buscar(interaction);
        }
    },

    async verUsuario(interaction) {
        const username = interaction.options.getString('username').replace('@', '');

        try {
            // Usar nitter (frontend alternativo de Twitter) para obtener datos
            const response = await axios.get(`https://nitter.net/${username}`, {
                timeout: 10000,
                validateStatus: () => true
            });

            if (response.status === 404) {
                return interaction.editReply({ 
                    content: `❌ No encontré el usuario **@${username}**.`, 
                    ephemeral: true 
                });
            }

            // Parsear datos del HTML (simplificado)
            const embed = new EmbedBuilder()
                .setTitle(`🐦 @${username}`)
                .setURL(`https://twitter.com/${username}`)
                .setDescription(`Perfil de Twitter/X`)
                .setColor(0x1DA1F2)
                .addFields(
                    { name: '🔗 Perfil', value: `[Ver en Twitter](https://twitter.com/${username})`, inline: true },
                    { name: '📱 Nitter', value: `[Ver en Nitter](https://nitter.net/${username})`, inline: true }
                )
                .setFooter({ text: 'Datos de fuente pública' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Ver en Twitter')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://twitter.com/${username}`)
                        .setEmoji('🐦'),
                    new ButtonBuilder()
                        .setLabel('Ver en Nitter')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://nitter.net/${username}`)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error buscando usuario Twitter:', error.message);
            
            // Fallback: mostrar enlace directo
            const embed = new EmbedBuilder()
                .setTitle(`🐦 @${username}`)
                .setURL(`https://twitter.com/${username}`)
                .setDescription(`No pude obtener datos del perfil, pero puedes verlo directamente.`)
                .setColor(0x1DA1F2);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Ver Perfil')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://twitter.com/${username}`)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });
        }
    },

    async verTweet(interaction) {
        const url = interaction.options.getString('url');

        // Extraer ID del tweet
        const tweetMatch = url.match(/status\/(\d+)/);
        if (!tweetMatch) {
            return interaction.editReply({ 
                content: '❌ URL de tweet inválida. Usa una URL como: https://twitter.com/user/status/123456789', 
                ephemeral: true 
            });
        }

        const tweetId = tweetMatch[1];

        try {
            // Usar vxtwitter o fxtwitter para embed
            const embed = new EmbedBuilder()
                .setTitle('🐦 Tweet')
                .setURL(url)
                .setDescription(`[Ver tweet original](${url})`)
                .setColor(0x1DA1F2)
                .addFields(
                    { name: '🆔 Tweet ID', value: tweetId, inline: true },
                    { name: '📸 Embeds alternativos', value: `[VXTwitter](https://vxtwitter.com/status/${tweetId}) · [FxTwitter](https://fxtwitter.com/status/${tweetId})`, inline: false }
                )
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Original')
                        .setStyle(ButtonStyle.Link)
                        .setURL(url),
                    new ButtonBuilder()
                        .setLabel('VXTwitter')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://vxtwitter.com/status/${tweetId}`),
                    new ButtonBuilder()
                        .setLabel('FxTwitter')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://fxtwitter.com/status/${tweetId}`)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error procesando tweet:', error);
            return interaction.editReply({ 
                content: `❌ Error al procesar el tweet.`, 
                ephemeral: true 
            });
        }
    },

    async buscar(interaction) {
        const query = interaction.options.getString('query');

        const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}`;

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Búsqueda: "${query}"`)
            .setDescription(`[Ver resultados en Twitter](${searchUrl})`)
            .setColor(0x1DA1F2)
            .addFields(
                { name: '📝 Término', value: query, inline: true },
                { name: '📱 Nitter', value: `[Ver en Nitter](https://nitter.net/search?f=tweets&q=${encodeURIComponent(query)})`, inline: true }
            )
            .setFooter({ text: 'Búsqueda pública de Twitter' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Buscar en Twitter')
                    .setStyle(ButtonStyle.Link)
                    .setURL(searchUrl),
                new ButtonBuilder()
                    .setLabel('Buscar en Nitter')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://nitter.net/search?f=tweets&q=${encodeURIComponent(query)}`)
            );

        return interaction.editReply({ embeds: [embed], components: [row] });
    }
};

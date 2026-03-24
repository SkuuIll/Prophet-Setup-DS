// ════════════════════════════════════════════════════════════════
// 🎵 TIKTOK - Comando Utility
// Descargar video de TikTok sin marca de agua
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tiktok')
        .setDescription('🎵 Descargar videos de TikTok sin marca de agua')
        .addSubcommand(sub =>
            sub.setName('video')
                .setDescription('📥 Descargar video')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del video de TikTok')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('audio')
                .setDescription('🎵 Descargar solo el audio')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del video de TikTok')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('ℹ️ Ver información del video')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del video de TikTok')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('perfil')
                .setDescription('👤 Ver perfil de usuario')
                .addStringOption(opt =>
                    opt.setName('username')
                        .setDescription('Nombre de usuario (sin @)')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'video':
                return this.descargarVideo(interaction);
            case 'audio':
                return this.descargarAudio(interaction);
            case 'info':
                return this.verInfo(interaction);
            case 'perfil':
                return this.verPerfil(interaction);
        }
    },

    async descargarVideo(interaction) {
        const url = interaction.options.getString('url');

        // Validar URL
        if (!this.isValidTikTokUrl(url)) {
            return interaction.editReply({ 
                content: '❌ URL de TikTok inválida. Usa una URL como: https://www.tiktok.com/@user/video/123456', 
                ephemeral: true 
            });
        }

        try {
            // Usar API de tikwm para obtener info
            const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            if (response.data.code !== 0 || !response.data.data) {
                throw new Error('No pude procesar el video');
            }

            const data = response.data.data;
            const videoUrl = data.play;
            const noWmUrl = data.wmplay ? data.play : data.wmplay; // Sin marca si disponible

            const embed = new EmbedBuilder()
                .setTitle('🎵 Video de TikTok')
                .setDescription(`**${data.title || 'Sin título'}**`)
                .addFields(
                    { name: '👤 Autor', value: `@${data.author?.nickname || 'desconocido'}`, inline: true },
                    { name: '❤️ Likes', value: this.formatNumber(data.digg_count), inline: true },
                    { name: '💬 Comentarios', value: this.formatNumber(data.comment_count), inline: true },
                    { name: '🔄 Shares', value: this.formatNumber(data.share_count), inline: true },
                    { name: '▶️ Vistas', value: this.formatNumber(data.play_count), inline: true },
                    { name: '⏱️ Duración', value: `${data.duration || '?'}s`, inline: true }
                )
                .setColor(0x000000)
                .setFooter({ text: 'Video sin marca de agua' })
                .setTimestamp();

            if (data.cover) {
                embed.setThumbnail(data.cover);
            }

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('📥 Descargar Sin WM')
                        .setStyle(ButtonStyle.Link)
                        .setURL(videoUrl),
                    new ButtonBuilder()
                        .setLabel('🎵 Audio')
                        .setStyle(ButtonStyle.Link)
                        .setURL(data.music || videoUrl),
                    new ButtonBuilder()
                        .setLabel('🔗 Original')
                        .setStyle(ButtonStyle.Link)
                        .setURL(url)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error descargando TikTok:', error.message);
            
            // Fallback con servicios alternativos
            const embed = new EmbedBuilder()
                .setTitle('🎵 TikTok')
                .setDescription('No pude procesar el video directamente. Usa estos servicios:')
                .addFields(
                    { name: '📥 Servicios de descarga', value: 
                        `• [SnapTik](https://snaptik.app/${url})\n` +
                        `• [SSSTik](https://ssstik.io/${url})\n` +
                        `• [TikMate](https://tikmate.online/${url})`, inline: false }
                )
                .setColor(0x000000)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    },

    async descargarAudio(interaction) {
        const url = interaction.options.getString('url');

        if (!this.isValidTikTokUrl(url)) {
            return interaction.editReply({ content: '❌ URL inválida.', ephemeral: true });
        }

        try {
            const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            if (response.data.code !== 0) {
                throw new Error('Error procesando');
            }

            const data = response.data.data;

            const embed = new EmbedBuilder()
                .setTitle('🎵 Audio de TikTok')
                .setDescription(`**${data.music_info?.title || 'Audio original'}**`)
                .addFields(
                    { name: '👤 Autor', value: data.music_info?.author || '@' + data.author?.nickname, inline: true },
                    { name: '⏱️ Duración', value: `${data.music_info?.duration || data.duration}s`, inline: true }
                )
                .setColor(0x000000)
                .setTimestamp();

            const audioUrl = data.music || data.play;

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('📥 Descargar Audio')
                        .setStyle(ButtonStyle.Link)
                        .setURL(audioUrl)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error obteniendo audio:', error);
            return interaction.editReply({ 
                content: '❌ No pude obtener el audio. Intenta con /tiktok video para ver opciones alternativas.', 
                ephemeral: true 
            });
        }
    },

    async verInfo(interaction) {
        const url = interaction.options.getString('url');

        if (!this.isValidTikTokUrl(url)) {
            return interaction.editReply({ content: '❌ URL inválida.', ephemeral: true });
        }

        try {
            const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`;
            const response = await axios.get(apiUrl, { timeout: 15000 });

            if (response.data.code !== 0) {
                throw new Error('Error obteniendo info');
            }

            const data = response.data.data;

            const embed = new EmbedBuilder()
                .setTitle('📋 Info del Video')
                .setDescription(`**${data.title || 'Sin descripción'}**`)
                .addFields(
                    { name: '👤 Autor', value: `@${data.author?.nickname || 'desconocido'}`, inline: true },
                    { name: '🆔 ID', value: data.id, inline: true },
                    { name: '📅 Creado', value: `<t:${data.create_time}:R>`, inline: true },
                    { name: '❤️ Likes', value: this.formatNumber(data.digg_count), inline: true },
                    { name: '💬 Comentarios', value: this.formatNumber(data.comment_count), inline: true },
                    { name: '🔄 Shares', value: this.formatNumber(data.share_count), inline: true },
                    { name: '▶️ Vistas', value: this.formatNumber(data.play_count), inline: true },
                    { name: '⏱️ Duración', value: `${data.duration}s`, inline: true },
                    { name: '🎵 Sonido', value: data.music_info?.title || 'Original', inline: false }
                )
                .setColor(0x000000)
                .setTimestamp();

            if (data.cover) {
                embed.setThumbnail(data.cover);
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error obteniendo info:', error);
            return interaction.editReply({ 
                content: '❌ No pude obtener la información del video.', 
                ephemeral: true 
            });
        }
    },

    async verPerfil(interaction) {
        const username = interaction.options.getString('username').replace('@', '');

        const profileUrl = `https://www.tiktok.com/@${username}`;

        const embed = new EmbedBuilder()
            .setTitle(`🎵 @${username}`)
            .setURL(profileUrl)
            .setDescription(`Perfil de TikTok`)
            .setColor(0x000000)
            .setThumbnail(`https://ui-avatars.com/api/?name=${username}&background=000000&color=fff&size=200`)
            .addFields({ name: '🔗 Ver Perfil', value: `[Abrir en TikTok](${profileUrl})`, inline: true })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ver en TikTok')
                    .setStyle(ButtonStyle.Link)
                    .setURL(profileUrl)
            );

        return interaction.editReply({ embeds: [embed], components: [row] });
    },

    isValidTikTokUrl(url) {
        return url.match(/tiktok\.com\/@[\w.-]+\/video\/\d+/) || 
               url.match(/vm\.tiktok\.com\/[\w]+/) ||
               url.match(/vt\.tiktok\.com\/[\w]+/);
    },

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
};

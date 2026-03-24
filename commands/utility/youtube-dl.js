// ════════════════════════════════════════════════════════════════
// 📺 YOUTUBE - Comando Utility
// Descargar audio/video de YouTube
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('youtube-dl')
        .setDescription('📺 Descargar audio/video de YouTube')
        .addSubcommand(sub =>
            sub.setName('audio')
                .setDescription('🎵 Descargar audio (MP3)')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del video de YouTube')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('video')
                .setDescription('🎬 Descargar video (MP4)')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del video de YouTube')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('calidad')
                        .setDescription('Calidad del video')
                        .setRequired(false)
                        .addChoices(
                            { name: '🔴 1080p (Full HD)', value: '1080' },
                            { name: '🟠 720p (HD)', value: '720' },
                            { name: '🟡 480p', value: '480' },
                            { name: '🟢 360p', value: '360' }
                        )))
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('ℹ️ Ver información del video')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del video de YouTube')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('thumbnail')
                .setDescription('🖼️ Descargar miniatura')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del video de YouTube')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'audio':
                return this.descargarAudio(interaction);
            case 'video':
                return this.descargarVideo(interaction);
            case 'info':
                return this.verInfo(interaction);
            case 'thumbnail':
                return this.descargarThumbnail(interaction);
        }
    },

    async descargarAudio(interaction) {
        const url = interaction.options.getString('url');

        // Extraer ID del video
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            return interaction.editReply({ 
                content: '❌ URL de YouTube inválida. Usa una URL válida de YouTube.', 
                ephemeral: true 
            });
        }

        try {
            // Obtener info del video
            const info = await this.getVideoInfo(videoId);

            const embed = new EmbedBuilder()
                .setTitle('🎵 Audio de YouTube')
                .setDescription(`**${info.title}**`)
                .addFields(
                    { name: '👤 Canal', value: info.author, inline: true },
                    { name: '⏱️ Duración', value: info.duration, inline: true },
                    { name: '👁️ Vistas', value: this.formatNumber(info.views), inline: true }
                )
                .setThumbnail(info.thumbnail)
                .setColor(0xFF0000)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('📥 Descargar MP3')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://www.y2mate.com/youtube/${videoId}`),
                    new ButtonBuilder()
                        .setLabel('🎵 YTMP3')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://www.ytmp3.cc/download/?video=https://www.youtube.com/watch?v=${videoId}`),
                    new ButtonBuilder()
                        .setLabel('🔗 OnlyMP3')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://www.onlymp3.to/download/?video=https://www.youtube.com/watch?v=${videoId}`)
                );

            return interaction.editReply({ 
                content: '⚠️ **Nota:** Por restricciones de YouTube, uso servicios de terceros para la descarga. Haz clic en los botones:',
                embeds: [embed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Error obteniendo info YouTube:', error);
            return interaction.editReply({ 
                content: '❌ No pude obtener información del video. Verifica la URL.', 
                ephemeral: true 
            });
        }
    },

    async descargarVideo(interaction) {
        const url = interaction.options.getString('url');
        const calidad = interaction.options.getString('calidad') || '720';

        const videoId = this.extractVideoId(url);
        if (!videoId) {
            return interaction.editReply({ content: '❌ URL inválida.', ephemeral: true });
        }

        try {
            const info = await this.getVideoInfo(videoId);

            const embed = new EmbedBuilder()
                .setTitle('🎬 Video de YouTube')
                .setDescription(`**${info.title}**`)
                .addFields(
                    { name: '👤 Canal', value: info.author, inline: true },
                    { name: '📺 Calidad', value: `${calidad}p`, inline: true },
                    { name: '⏱️ Duración', value: info.duration, inline: true }
                )
                .setThumbnail(info.thumbnail)
                .setColor(0xFF0000)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('📥 Y2Mate')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://www.y2mate.com/youtube/${videoId}`),
                    new ButtonBuilder()
                        .setLabel('🎬 SaveFrom')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://en.savefrom.net/1-youtube-video-downloader-1/#url=https://www.youtube.com/watch?v=${videoId}`),
                    new ButtonBuilder()
                        .setLabel('🔗 YT1s')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://yt1s.com/youtube-to-mp4?q=https://www.youtube.com/watch?v=${videoId}`)
                );

            return interaction.editReply({ 
                content: '⚠️ **Nota:** Selecciona la calidad deseada en el sitio de descarga:',
                embeds: [embed], 
                components: [row] 
            });

        } catch (error) {
            console.error('Error:', error);
            return interaction.editReply({ content: '❌ Error al procesar el video.', ephemeral: true });
        }
    },

    async verInfo(interaction) {
        const url = interaction.options.getString('url');

        const videoId = this.extractVideoId(url);
        if (!videoId) {
            return interaction.editReply({ content: '❌ URL inválida.', ephemeral: true });
        }

        try {
            const info = await this.getVideoInfo(videoId);

            const embed = new EmbedBuilder()
                .setTitle('📋 Info del Video')
                .setURL(`https://www.youtube.com/watch?v=${videoId}`)
                .setDescription(`**${info.title}**`)
                .addFields(
                    { name: '👤 Canal', value: info.author, inline: true },
                    { name: '🆔 Video ID', value: videoId, inline: true },
                    { name: '📅 Publicado', value: info.uploadDate || 'Desconocido', inline: true },
                    { name: '👁️ Vistas', value: this.formatNumber(info.views), inline: true },
                    { name: '👍 Likes', value: this.formatNumber(info.likes), inline: true },
                    { name: '💬 Comentarios', value: this.formatNumber(info.comments), inline: true },
                    { name: '⏱️ Duración', value: info.duration, inline: true },
                    { name: '📝 Tags', value: info.keywords?.slice(0, 5).join(', ') || 'N/A', inline: false }
                )
                .setImage(info.thumbnail)
                .setColor(0xFF0000)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('▶️ Ver en YouTube')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://www.youtube.com/watch?v=${videoId}`)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error obteniendo info:', error);
            return interaction.editReply({ content: '❌ No pude obtener la información.', ephemeral: true });
        }
    },

    async descargarThumbnail(interaction) {
        const url = interaction.options.getString('url');

        const videoId = this.extractVideoId(url);
        if (!videoId) {
            return interaction.editReply({ content: '❌ URL inválida.', ephemeral: true });
        }

        const qualities = ['maxresdefault', 'hqdefault', 'mqdefault', 'default'];

        const embed = new EmbedBuilder()
            .setTitle('🖼️ Miniaturas de YouTube')
            .setDescription(`Miniaturas disponibles para el video \`${videoId}\``)
            .setColor(0xFF0000)
            .setImage(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🖼️ Máxima (HD)')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`),
                new ButtonBuilder()
                    .setLabel('📸 Alta')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`),
                new ButtonBuilder()
                    .setLabel('📷 Media')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`)
            );

        return interaction.editReply({ embeds: [embed], components: [row] });
    },

    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
            /^([a-zA-Z0-9_-]{11})$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    },

    async getVideoInfo(videoId) {
        // Usar noembed para info básica (no requiere API key)
        try {
            const response = await axios.get(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = response.data;

            return {
                title: data.title || 'Sin título',
                author: data.author_name || 'Desconocido',
                thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                duration: 'N/A',
                views: 0,
                likes: 0,
                comments: 0,
                uploadDate: null,
                keywords: []
            };
        } catch (error) {
            // Fallback básico
            return {
                title: 'Video de YouTube',
                author: 'Desconocido',
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                duration: 'N/A',
                views: 0,
                likes: 0,
                comments: 0,
                uploadDate: null,
                keywords: []
            };
        }
    },

    formatNumber(num) {
        if (!num) return 'N/A';
        if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
};

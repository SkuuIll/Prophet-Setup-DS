// ═══ COMANDO: /clip ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

// Detectores de plataformas soportadas
const PLATFORMS = [
    {
        name: 'YouTube',
        emoji: '▶️',
        color: 0xFF0000,
        regex: /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_\-]{11})/,
        thumbnail: (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        getTitle: (url) => 'Video de YouTube',
        embedUrl: (id) => `https://youtu.be/${id}`,
    },
    {
        name: 'Twitch',
        emoji: '📡',
        color: 0x9146FF,
        regex: /twitch\.tv\/([A-Za-z0-9_]+)\/clip\/([A-Za-z0-9_\-]+)/,
        thumbnail: () => null,
        getTitle: () => 'Clip de Twitch',
        embedUrl: (id) => id,
    },
    {
        name: 'Medal.tv',
        emoji: '🏅',
        color: 0xFFD700,
        regex: /medal\.tv\/games\/[^/]+\/clips\/([A-Za-z0-9_\-]+)/,
        thumbnail: () => null,
        getTitle: () => 'Clip de Medal.tv',
        embedUrl: (id) => id,
    },
    {
        name: 'Streamable',
        emoji: '🎬',
        color: 0x1ABC9C,
        regex: /streamable\.com\/([A-Za-z0-9]+)/,
        thumbnail: () => null,
        getTitle: () => 'Clip de Streamable',
        embedUrl: (id) => id,
    },
    {
        name: 'Imgur',
        emoji: '🖼️',
        color: 0x85BF25,
        regex: /imgur\.com\/(?:a\/|gallery\/)?([A-Za-z0-9]+)/,
        thumbnail: (id) => `https://i.imgur.com/${id}.jpg`,
        getTitle: () => 'Imagen/GIF de Imgur',
        embedUrl: (id) => id,
    },
];

function detectPlatform(url) {
    for (const p of PLATFORMS) {
        const m = url.match(p.regex);
        if (m) return { platform: p, id: m[m.length - 1], match: m };
    }
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clip')
        .setDescription('🎬 Compartir un clip o video con embed enriquecido')
        .addStringOption(o =>
            o.setName('url')
                .setDescription('URL del clip (YouTube, Twitch, Medal.tv, Streamable, Imgur)')
                .setRequired(true))
        .addStringOption(o =>
            o.setName('título')
                .setDescription('Título o descripción del clip (opcional)')
                .setRequired(false)
                .setMaxLength(150))
        .addStringOption(o =>
            o.setName('juego')
                .setDescription('¿De qué juego es el clip? (opcional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const url = interaction.options.getString('url').trim();
        const titulo = interaction.options.getString('título');
        const juego = interaction.options.getString('juego');

        // Validar que sea una URL
        if (!/^https?:\/\//i.test(url)) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription('> ❌ **URL inválida.** Debe comenzar con `https://`.')
                ]
            });
        }

        const detected = detectPlatform(url);

        const platformName = detected?.platform.name || 'Clip';
        const platformEmoji = detected?.platform.emoji || '🎬';
        const platformColor = detected?.platform.color || (config.COLORES.PRINCIPAL || 0xBB86FC);
        const thumbUrl = detected ? detected.platform.thumbnail(detected.id) : null;

        const embedTitle = titulo
            || (detected ? `${platformEmoji} ${detected.platform.getTitle(url)}` : '🎬 Clip compartido');

        const embed = new EmbedBuilder()
            .setColor(platformColor)
            .setAuthor({
                name: `${platformEmoji}  ${platformName} · ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTitle(embedTitle)
            .setURL(url)
            .setDescription(
                `> 🔗 [Abrir en ${platformName}](${url})\n` +
                (juego ? `> 🎮 Juego: **${juego}**\n` : '') +
                `> 👤 Compartido por: ${interaction.user}`
            )
            .setFooter({ text: `Prophet Gaming  ·  ${platformName}` })
            .setTimestamp();

        if (thumbUrl) {
            embed.setImage(thumbUrl);
        }

        // Para YouTube: embed especial con thumbnail de alta resolución
        if (detected?.platform.name === 'YouTube') {
            const videoId = detected.id;
            embed.setImage(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
            embed.addFields(
                { name: '▶️ Ver en YouTube', value: `[youtube.com/watch?v=${videoId}](https://youtu.be/${videoId})`, inline: false }
            );
        }

        await interaction.editReply({ embeds: [embed] });
    }
};

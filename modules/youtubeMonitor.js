// ═══ MÓDULO: youtubeMonitor.js — Notificaciones de videos de YouTube ═══

const { EmbedBuilder, WebhookClient } = require('discord.js');
const { stmts } = require('../database');

async function sendNotification(client, channelId, embed, content) {
    const storedWebhook = stmts.getDiscordWebhook(channelId);
    if (storedWebhook) {
        try {
            const wh = new WebhookClient({ url: storedWebhook });
            await wh.send({ content, embeds: [embed] });
            return;
        } catch (e) {
            stmts.removeDiscordWebhook(channelId);
        }
    }
    const channel = client.channels.cache.get(channelId);
    if (channel) channel.send({ content: content || '', embeds: [embed] }).catch(() => { });
}

/**
 * Verifica si hay videos nuevos para todos los canales suscritos
 */
async function verificarYoutube(client) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return;

    const subs = stmts.getAllYoutubeSubs();
    if (!subs.length) return;

    for (const sub of subs) {
        try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${sub.yt_channel_id}&type=video&order=date&maxResults=1&key=${apiKey}`;
            const res = await fetch(url);
            const data = await res.json();

            if (!data.items || data.items.length === 0) continue;

            const video = data.items[0];
            const videoId = video.id?.videoId;
            if (!videoId || videoId === sub.last_video_id) continue;

            // Nuevo video detectado
            const snippet = video.snippet;
            const ping = sub.role_ping ? `<@&${sub.role_ping}> ` : '';

            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Rojo YouTube
                .setAuthor({ name: '📺  Nuevo video de YouTube', iconURL: 'https://www.youtube.com/favicon.ico' })
                .setTitle(snippet.title)
                .setURL(`https://www.youtube.com/watch?v=${videoId}`)
                .setDescription(
                    `> 📢 **Canal:** ${snippet.channelTitle}\n` +
                    `> 📅 Publicado: <t:${Math.floor(new Date(snippet.publishedAt).getTime() / 1000)}:R>\n\n` +
                    (snippet.description ? `*${snippet.description.slice(0, 200)}...*` : '')
                )
                .setImage(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)
                .setFooter({ text: 'YouTube  ·  Prophet Streams' })
                .setTimestamp();

            await sendNotification(client, sub.discord_channel, embed, `${ping}📺 **${snippet.channelTitle}** subió un nuevo video!`);
            stmts.updateYoutubeSub(sub.id, videoId);

        } catch (e) {
            console.error(`[YouTube] Error verificando ${sub.yt_channel_name}:`, e.message);
        }
    }
}

module.exports = { verificarYoutube };

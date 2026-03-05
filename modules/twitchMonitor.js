// ═══ MÓDULO: twitchMonitor.js — Notificaciones de streams de Twitch ═══

const { EmbedBuilder, WebhookClient } = require('discord.js');
const { stmts } = require('../database');

let twitchToken = null;
let tokenExpiry = 0;

/**
 * Obtiene/renueva el App Access Token de Twitch (client credentials)
 */
async function obtenerToken() {
    if (twitchToken && Date.now() < tokenExpiry) return twitchToken;

    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;

    try {
        const res = await fetch(`https://id.twitch.tv/oauth2/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials'
            })
        });
        const data = await res.json();
        if (data.access_token) {
            twitchToken = data.access_token;
            tokenExpiry = Date.now() + (data.expires_in - 300) * 1000; // renovar 5min antes
            return twitchToken;
        }
    } catch (e) {
        console.error('[Twitch] Error obteniendo token:', e.message);
    }
    return null;
}

/**
 * Envía un mensaje al canal usando webhook (si existe) o channel.send
 */
async function sendNotification(client, channelId, embed, content) {
    const storedWebhook = stmts.getDiscordWebhook(channelId);
    if (storedWebhook) {
        try {
            const wh = new WebhookClient({ url: storedWebhook });
            await wh.send({ content, embeds: [embed] });
            return;
        } catch (e) {
            // Si el webhook falló, intentar con channel.send
            stmts.removeDiscordWebhook(channelId);
        }
    }
    const channel = client.channels.cache.get(channelId);
    if (channel) channel.send({ content: content || '', embeds: [embed] }).catch(() => { });
}

/**
 * Verifica el estado de todos los streamers registrados
 */
async function verificarTwitch(client) {
    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) return;

    const token = await obtenerToken();
    if (!token) return;

    const subs = stmts.getAllTwitchSubs();
    if (!subs.length) return;

    // Agrupar streamers en batch (max 100 por request)
    const streamers = subs.map(s => s.streamer);
    const query = streamers.map(s => `user_login=${encodeURIComponent(s)}`).join('&');

    let streams = [];
    try {
        const res = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
            headers: {
                'Client-ID': clientId,
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        streams = data.data || [];
    } catch (e) {
        console.error('[Twitch] Error consultando streams:', e.message);
        return;
    }

    // Mapa rápido: streamer → datos del stream
    const liveMap = {};
    for (const s of streams) liveMap[s.user_login.toLowerCase()] = s;

    for (const sub of subs) {
        const streamData = liveMap[sub.streamer];
        const estaLive = !!streamData;
        const nuevoStream = estaLive && streamData.id !== sub.last_stream_id;

        // Acaba de empezar a transmitir (o es un stream diferente al último)
        if (nuevoStream && !sub.last_live) {
            const ping = sub.role_ping ? `<@&${sub.role_ping}> ` : '';
            const embed = new EmbedBuilder()
                .setColor(0x9146FF) // Morado Twitch
                .setAuthor({ name: '🔴  ¡Stream en vivo!', iconURL: 'https://static.twitchcdn.net/assets/favicon-32-e29e246c157142c1a5a8.png' })
                .setTitle(streamData.title || `${streamData.user_name} está en vivo`)
                .setURL(`https://twitch.tv/${sub.streamer}`)
                .setDescription(
                    `> 🎮 **Jugando:** ${streamData.game_name || 'Sin categoría'}\n` +
                    `> 👥 **Viewers:** \`${streamData.viewer_count.toLocaleString()}\`\n` +
                    `> 📅 Empezó: <t:${Math.floor(new Date(streamData.started_at).getTime() / 1000)}:R>`
                )
                .setImage(streamData.thumbnail_url?.replace('{width}', '400').replace('{height}', '225') || null)
                .setFooter({ text: `twitch.tv/${sub.streamer}  ·  Prophet Streams` })
                .setTimestamp();

            await sendNotification(client, sub.channel_id, embed, `${ping}🔴 **${streamData.user_name}** está en vivo en Twitch!`);
            stmts.updateTwitchSub(sub.id, 1, streamData.id);

        } else if (!estaLive && sub.last_live) {
            // Dejó de transmitir
            stmts.updateTwitchSub(sub.id, 0, sub.last_stream_id);

        } else if (estaLive && sub.last_live && nuevoStream) {
            // Nuevo stream del mismo streamer (restreaming o reinicio)
            stmts.updateTwitchSub(sub.id, 1, streamData.id);
        }
    }
}

module.exports = { verificarTwitch };

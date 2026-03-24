// ═══ MÓDULO: gameServerMonitor.js — Monitor de servidores de juegos ═══

const net = require('net');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const { stmts } = require('../database');

const GAME_ICONS = {
    minecraft: '⛏️',
    cs2: '🔫',
    csgo: '🔫',
    valorant: '💥',
    rust: '🌿',
    ark: '🦕',
    gmod: '🔧',
    tf2: '🎩',
    default: '🎮'
};

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
 * Verifica si un servidor TCP está accesible
 */
function checkTCP(ip, port, timeoutMs = 5000) {
    return new Promise(resolve => {
        const start = Date.now();
        const socket = net.createConnection({ host: ip, port, timeout: timeoutMs });
        socket.on('connect', () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve({ online: true, latency });
        });
        socket.on('error', () => resolve({ online: false, latency: null }));
        socket.on('timeout', () => { socket.destroy(); resolve({ online: false, latency: null }); });
    });
}

/**
 * Verifica el estado de todos los servidores registrados
 */
async function verificarServidores(client) {
    const servers = stmts.getAllGameServers();
    if (!servers.length) return;

    for (const server of servers) {
        try {
            const { online, latency } = await checkTCP(server.ip, server.port);
            const estadoAnterior = server.last_status === 1;

            // Solo notificar si cambió el estado
            if (online !== estadoAnterior) {
                const ping = server.role_ping ? `<@&${server.role_ping}> ` : '';
                const gameIcon = GAME_ICONS[server.game?.toLowerCase()] || GAME_ICONS.default;
                const label = server.label || `${server.ip}:${server.port}`;

                const embed = new EmbedBuilder()
                    .setColor(online ? (0x69F0AE) : (0xEF5350))
                    .setAuthor({ name: `${gameIcon}  Servidor ${online ? 'en línea' : 'caído'}: ${label}` })
                    .setDescription(
                        online
                            ? `> ✅ **${label}** volvió a estar en línea.\n` +
                            `> 🏓 **Latencia TCP:** \`${latency}ms\`\n` +
                            `> 🎮 **Juego:** ${server.game || 'N/A'}\n` +
                            `> 🌐 **IP:** \`${server.ip}:${server.port}\``
                            : `> 🔴 **${label}** no responde.\n` +
                            `> 🎮 **Juego:** ${server.game || 'N/A'}\n` +
                            `> 🌐 **IP:** \`${server.ip}:${server.port}\`\n` +
                            `> ⏰ Detectado: <t:${Math.floor(Date.now() / 1000)}:R>`
                    )
                    .setFooter({ text: 'Prophet  ·  Monitor de Servidores' })
                    .setTimestamp();

                const statusText = online ? '✅ volvió a estar en línea' : '🔴 no responde';
                await sendNotification(client, server.discord_channel, embed, `${ping}${gameIcon} **${label}** ${statusText}!`);
                stmts.incrementAnalyticsMetric('monitor_alerts', 'game_servers', 1);
                stmts.updateGameServerStatus(server.id, online);
            }
        } catch (e) {
            console.error(`[GameMonitor] Error verificando ${server.ip}:${server.port}:`, e.message);
        }
    }
}

/**
 * Chequeo inmediato de un servidor específico (para /monitor-servidor estado)
 */
async function checkServerNow(ip, port) {
    return checkTCP(ip, port);
}

module.exports = { verificarServidores, checkServerNow };

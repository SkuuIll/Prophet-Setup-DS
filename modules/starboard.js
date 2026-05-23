// ═══ MÓDULO: Starboard ═══
// Repostea mensajes con ⭐ reacciones a un canal de starboard.

const { EmbedBuilder } = require('discord.js');
const { stmts } = require('../database');
const config = require('../config');

const STAR_EMOJI = '⭐';
const STAR_THRESHOLD = 3;
const STAR_CHANNEL_KEY = 'STARBOARD';

let starChannelId = null;

function getStarChannel(guild) {
    if (starChannelId) return guild.channels.cache.get(starChannelId);
    starChannelId = config.CHANNELS[STAR_CHANNEL_KEY];
    return starChannelId ? guild.channels.cache.get(starChannelId) : null;
}

async function handleReactionAdd(reaction, user) {
    if (reaction.emoji.name !== STAR_EMOJI) return;
    if (user.bot) return;

    const message = reaction.message;
    if (!message.author || message.author.bot) return;

    const starChannel = getStarChannel(message.guild);
    if (!starChannel) return;

    const starCount = reaction.count || 0;
    const existing = stmts.getStarboard(message.id);

    if (starCount >= STAR_THRESHOLD && !existing?.star_message_id) {
        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content || '*[Sin texto]*')
            .addFields({ name: '📌 Mensaje original', value: `[Ir al mensaje](${message.url})` })
            .setFooter({ text: `⭐ ${starCount}  ·  #${message.channel.name}` })
            .setTimestamp(message.createdAt);

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType?.startsWith('image/')) {
                embed.setImage(attachment.url);
            }
        }

        try {
            const starMessage = await starChannel.send({ embeds: [embed] });
            stmts.setStarboard(message.id, starMessage.id, message.channel.id, starCount);
        } catch (e) {
            console.error('[Starboard] Error publicando:', e.message);
        }
    } else if (existing?.star_message_id) {
        try {
            const starMessage = await starChannel.messages.fetch(existing.star_message_id).catch(() => null);
            if (starMessage) {
                const embed = EmbedBuilder.from(starMessage.embeds[0]);
                embed.setFooter({ text: `⭐ ${starCount}  ·  #${message.channel.name}` });
                await starMessage.edit({ embeds: [embed] });
                stmts.updateStarboardStars(message.id, starCount);
            }
        } catch (e) {
            console.debug('[Starboard] Error actualizando:', e.message);
        }
    }
}

async function handleReactionRemove(reaction, user) {
    if (reaction.emoji.name !== STAR_EMOJI) return;
    if (user.bot) return;

    const message = reaction.message;
    const starChannel = getStarChannel(message.guild);
    if (!starChannel) return;

    const starCount = reaction.count || 0;
    const existing = stmts.getStarboard(message.id);

    if (existing?.star_message_id) {
        try {
            const starMessage = await starChannel.messages.fetch(existing.star_message_id).catch(() => null);
            if (starMessage) {
                if (starCount < STAR_THRESHOLD) {
                    await starMessage.delete().catch(() => { });
                    stmts.removeStarboard(message.id);
                } else {
                    const embed = EmbedBuilder.from(starMessage.embeds[0]);
                    embed.setFooter({ text: `⭐ ${starCount}  ·  #${message.channel.name}` });
                    await starMessage.edit({ embeds: [embed] });
                    stmts.updateStarboardStars(message.id, starCount);
                }
            }
        } catch (e) {
            console.debug('[Starboard] Error en remove:', e.message);
        }
    }
}

module.exports = { handleReactionAdd, handleReactionRemove };

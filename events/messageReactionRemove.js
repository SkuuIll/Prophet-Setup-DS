// ═══ EVENTO: messageReactionRemove (Starboard) ═══

const { stmts } = require('../database');
const config = require('../config');

const STAR_EMOJI = '⭐';
const STAR_UMBRAL = 3;

module.exports = {
    name: 'messageReactionRemove',
    once: false,
    async execute(reaction, user) {
        if (reaction.emoji.name !== STAR_EMOJI) return;
        if (user.bot) return;

        if (reaction.message.partial) await reaction.message.fetch();
        if (reaction.partial) await reaction.fetch();

        const message = reaction.message;
        if (!message.guild || message.author?.bot) return;

        const starboardChannel = message.guild.channels.cache.find(c => c.name === '⭐・destacados');
        if (!starboardChannel) return;

        const starsCount = reaction.count;
        let starData = stmts.getStarboard(message.id);

        if (starData && starData.star_message_id) {
            try {
                const starMessage = await starboardChannel.messages.fetch(starData.star_message_id);
                if (starMessage) {
                    if (starsCount < STAR_UMBRAL) {
                        // Borrar si baja del umbral
                        await starMessage.delete();
                        stmts.removeStarboard(message.id);
                    } else {
                        // Actualizar conteo
                        const messageContent = `**${starsCount}** ${STAR_EMOJI} | <#${message.channel.id}>`;
                        await starMessage.edit({ content: messageContent });
                        stmts.updateStarboard(message.id, starMessage.id, message.channel.id, starsCount);
                    }
                }
            } catch (e) {
                // Posiblemente ya borrado manualmente
                stmts.removeStarboard(message.id);
            }
        }
    }
};

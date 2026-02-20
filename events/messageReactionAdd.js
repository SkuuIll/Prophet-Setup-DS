// ═══ EVENTO: messageReactionAdd (Starboard) ═══

const { EmbedBuilder } = require('discord.js');
const { stmts } = require('../database');
const config = require('../config');

// Configuración del starboard
const STAR_EMOJI = '⭐';
const STAR_UMBRAL = 3; // Cantidad de estrellas necesarias para aparecer

module.exports = {
    name: 'messageReactionAdd',
    once: false,
    async execute(reaction, user) {
        if (reaction.emoji.name !== STAR_EMOJI) return;
        if (user.bot) return;

        // Si el mensaje / reacción son parciales, hacer fetch
        if (reaction.message.partial) await reaction.message.fetch();
        if (reaction.partial) await reaction.fetch();

        const message = reaction.message;
        if (!message.guild || message.author?.bot) return;

        // Validar canal de destacados
        // Podés usar un config.CHANNELS.STARBOARD si querés
        const starboardChannel = message.guild.channels.cache.find(c => c.name === '⭐・destacados');
        if (!starboardChannel) return;

        // No destacar cosas del propio starboard
        if (message.channel.id === starboardChannel.id) return;

        const starsCount = reaction.count;
        if (starsCount < STAR_UMBRAL) return;

        // Verificar si ya está en la bd
        let starData = stmts.getStarboard(message.id);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xF1C40F)
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setDescription(message.content || '*Sin texto*')
            .addFields({ name: 'Fuente', value: `[Ir al Mensaje](${message.url})` })
            .setFooter({ text: `ID: ${message.id}` })
            .setTimestamp(message.createdAt);

        if (message.attachments.size > 0) {
            embed.setImage(message.attachments.first().url);
        }

        const messageContent = `**${starsCount}** ${STAR_EMOJI} | <#${message.channel.id}>`;

        if (starData && starData.star_message_id) {
            // Ya está publicado, actualizar conteo
            try {
                const starMessage = await starboardChannel.messages.fetch(starData.star_message_id);
                if (starMessage) {
                    await starMessage.edit({ content: messageContent, embeds: [embed] });
                    stmts.updateStarboard(message.id, starMessage.id, message.channel.id, starsCount);
                }
            } catch (e) { } // Mensaje borrado del starboard
        } else {
            // Publicar por primera vez
            try {
                const newStarMsg = await starboardChannel.send({ content: messageContent, embeds: [embed] });
                stmts.updateStarboard(message.id, newStarMsg.id, message.channel.id, starsCount);
            } catch (e) {
                console.error('Error publicando en starboard:', e);
            }
        }
    }
};

// ═══ Utilidad compartida: Acciones de Moderación ═══
// Patrón común extraído de ban, warn, mute, tempban — envía DM, embed y log dual.

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

/**
 * Intenta enviar un DM al usuario y devuelve true/false según éxito.
 */
async function tryNotifyUser(target, embedBuilderFn) {
    if (!target || target.bot) return false;
    try {
        const embed = new EmbedBuilder(embedBuilderFn());
        await target.send({ embeds: [embed] });
        return true;
    } catch {
        return false;
    }
}

/**
 * Construye y envía la respuesta de moderación al staff + logs duales.
 * @param {Object} opts
 * @param {Interaction} opts.interaction
 * @param {GuildMember|User} opts.target
 * @param {string} opts.action - 'baneado', 'kick', 'mute', 'warn', etc.
 * @param {string} opts.reason
 * @param {string} opts.emoji
 * @param {number} [opts.color]
 * @param {string} [opts.extraDescription]
 * @param {number} [opts.durationMs]
 * @param {boolean} [opts.isEphemeral=true]
 */
async function sendModResponse({ interaction, target, action, reason, emoji, color, extraDescription, durationMs, isEphemeral }) {
    const userId = target.user ? target.user.id : target.id;
    const userTag = target.user ? target.user.tag : target.tag;
    const targetDisplay = target.user ? `<@${userId}>` : `<@${userId}>`;

    let desc = `> ${emoji} **${targetDisplay}** fue **${action}**\n> 📝 Razón: \`${reason || 'No especificada'}\``;
    if (durationMs) {
        const min = Math.round(durationMs / 60000);
        desc += `\n> ⏱️ Duración: **${min}** minuto(s)`;
    }
    if (extraDescription) desc += `\n${extraDescription}`;

    const embed = new EmbedBuilder()
        .setColor(color || config.COLORES.ERROR || 0xEF5350)
        .setAuthor({ name: `🛡️  Usuario ${action}` })
        .setDescription(desc)
        .setFooter({ text: `ID: ${userId}` })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: isEphemeral !== false ? 64 : 0 });

    const logsChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
    const reportsChannel = interaction.guild.channels.cache.get(config.CHANNELS.REPORTES);

    if (logsChannel) await logsChannel.send({ embeds: [embed] }).catch(() => { });
    if (reportsChannel && reportsChannel.id !== logsChannel?.id) {
        await reportsChannel.send({ embeds: [embed] }).catch(() => { });
    }
}

module.exports = { tryNotifyUser, sendModResponse };

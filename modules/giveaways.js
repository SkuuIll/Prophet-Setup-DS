// ═══════════════════════════════════════════════════
//  MÓDULO: Sorteos
// ═══════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { stmts } = require('../database');
const config = require('../config');

/**
 * Crear un sorteo
 */
async function crearSorteo(channel, prize, duracionMs, hostId) {
    const endTime = Date.now() + duracionMs;

    const embed = new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL)
        .setTitle('🎁 ¡SORTEO ACTIVO!')
        .setDescription(
            `🏆 **Premio:** \`${prize}\`\n\n` +
            `⏳ **Finaliza:** <t:${Math.floor(endTime / 1000)}:R>\n` +
            `👑 **Organizado por:** <@${hostId}>\n\n` +
            `👥 **Participantes:** \`0\`\n\n` +
            `*¡Hacé click en el botón de abajo para participar! Mucha suerte 🍀*`
        )
        .setFooter({ text: 'Prophet Gaming | Sistema de Sorteos' })
        .setTimestamp(new Date(endTime));

    const boton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sorteo_participar').setLabel('🎉 Participar').setStyle(ButtonStyle.Success)
    );

    const msg = await channel.send({ embeds: [embed], components: [boton] });
    stmts.addGiveaway(msg.id, channel.id, prize, endTime, hostId);
    return msg;
}

/**
 * Participar en un sorteo
 */
async function participarSorteo(interaction) {
    const messageId = interaction.message.id;
    const giveaway = stmts.getGiveaway(messageId);

    if (!giveaway || giveaway.ended) {
        return interaction.reply({ content: '❌ Este sorteo ya terminó.', ephemeral: true });
    }

    stmts.addGiveawayEntry(messageId, interaction.user.id);
    const count = stmts.countGiveawayEntries(messageId);

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const desc = embed.data.description.replace(/Participantes:\*\* `\d+`/, `Participantes:** \`${count.total}\``);
    embed.setDescription(desc);

    await interaction.message.edit({ embeds: [embed] });
    await interaction.reply({ content: `✅ ¡Estás participando! (${count.total} participantes)`, ephemeral: true });
}

/**
 * Finalizar un sorteo
 */
async function finalizarSorteo(client, giveaway) {
    try {
        const channel = await client.channels.fetch(giveaway.channel_id);
        if (!channel) return;

        const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
        const entries = stmts.getGiveawayEntries(giveaway.message_id);

        stmts.endGiveaway(giveaway.message_id);

        if (entries.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setTitle('🎉 Sorteo Finalizado')
                .setDescription(`**Premio:** ${giveaway.prize}\n\n❌ Nadie participó.`)
                .setTimestamp();
            if (message) await message.edit({ embeds: [embed], components: [] });
            return;
        }

        const ganadorEntry = entries[Math.floor(Math.random() * entries.length)];

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle('🎉 ¡SORTEO FINALIZADO!')
            .setDescription(
                `🎁 **Premio:** \`${giveaway.prize}\`\n\n` +
                `🏆 **¡GANADOR/A!** <@${ganadorEntry.user_id}> 🥳\n` +
                `👥 **Total de participantes:** \`${entries.length}\`\n\n` +
                `*¡Felicitaciones! Contactá al organizador para reclamar tu premio.*`
            )
            .setFooter({ text: 'Prophet Gaming | Sistema de Sorteos' })
            .setTimestamp();

        if (message) await message.edit({ embeds: [embed], components: [] });
        await channel.send(`🎉 ¡Felicitaciones <@${ganadorEntry.user_id}>! Ganaste **${giveaway.prize}**!`);
    } catch (err) {
        console.error('Error finalizando sorteo:', err.message);
    }
}

/**
 * Verificar sorteos activos (llamar periódicamente)
 */
function verificarSorteos(client) {
    const activos = stmts.getActiveGiveaways();
    const ahora = Date.now();

    for (const sorteo of activos) {
        if (ahora >= sorteo.end_time) {
            finalizarSorteo(client, sorteo);
        }
    }
}

module.exports = { crearSorteo, participarSorteo, finalizarSorteo, verificarSorteos };

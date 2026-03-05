// ═══════════════════════════════════════════════════
//  MÓDULO: Sorteos
// ═══════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { stmts } = require('../database');
const config = require('../config');

/**
 * Crear un sorteo
 */
async function crearSorteo(channel, prize, duracionMs, hostId, winners = 1) {
    const endTime = Date.now() + duracionMs;

    const embed = new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL)
        .setTitle('🎁 ¡SORTEO ACTIVO!')
        .setDescription(
            `🏆 **Premio:** \`${prize}\`\n\n` +
            `⏳ **Finaliza:** <t:${Math.floor(endTime / 1000)}:R>\n` +
            `👑 **Organizado por:** <@${hostId}>\n` +
            `🥇 **Ganadores:** \`${winners}\`\n\n` +
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

        // Extraer cantidad de ganadores del embed (fallback: 1)
        let winnersCount = 1;
        if (message && message.embeds[0]) {
            const match = message.embeds[0].description?.match(/Ganadores:\*\* `(\d+)`/);
            if (match) winnersCount = parseInt(match[1]);
        }

        if (entries.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setTitle('🎉 Sorteo Finalizado')
                .setDescription(`**Premio:** ${giveaway.prize}\n\n❌ Nadie participó.`)
                .setTimestamp();
            if (message) await message.edit({ embeds: [embed], components: [] });
            stmts.endGiveaway(giveaway.message_id); // Marcar terminado DESPUÉS de editar
            return;
        }

        // Seleccionar ganadores sin repetir (shuffle + slice)
        const shuffled = [...entries].sort(() => Math.random() - 0.5);
        const ganadores = shuffled.slice(0, Math.min(winnersCount, entries.length));
        const ganadoresMenciones = ganadores.map(g => `<@${g.user_id}>`).join(', ');

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle('🎉 ¡SORTEO FINALIZADO!')
            .setDescription(
                `🎁 **Premio:** \`${giveaway.prize}\`\n\n` +
                `🏆 **¡GANADOR/ES!** ${ganadoresMenciones} 🥳\n` +
                `👥 **Total de participantes:** \`${entries.length}\`\n\n` +
                `*¡Felicitaciones! Contactá al organizador para reclamar el premio.*`
            )
            .setFooter({ text: 'Prophet Gaming | Sistema de Sorteos' })
            .setTimestamp();

        if (message) await message.edit({ embeds: [embed], components: [] });
        stmts.endGiveaway(giveaway.message_id); // ✅ Marcar terminado DESPUÉS de editar exitosamente
        await channel.send(`🎉 ¡Felicitaciones ${ganadoresMenciones}! Ganaron **${giveaway.prize}**!`);
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

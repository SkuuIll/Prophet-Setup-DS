// ═══════════════════════════════════════════════════
//  MÓDULO: Sorteos con requisitos
// ═══════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { stmts } = require('../database');
const config = require('../config');

// Lock en memoria para prevenir finalización concurrente del mismo sorteo
const finalizingLocks = new Set();

/**
 * Crear un sorteo
 */
async function crearSorteo(channel, prize, duracionMs, hostId, winners = 1, requirements = {}) {
    const endTime = Date.now() + duracionMs;

    // Construir texto de requisitos
    const reqTexts = [];
    if (requirements.minLevel) reqTexts.push(`📈 Nivel **${requirements.minLevel}**+`);
    if (requirements.requiredRoleId) reqTexts.push(`🏷️ Rol <@&${requirements.requiredRoleId}>`);
    if (requirements.minDays) reqTexts.push(`📅 **${requirements.minDays}** días en el server`);

    const reqSection = reqTexts.length > 0
        ? `\n\n📋 **Requisitos para participar:**\n> ${reqTexts.join('\n> ')}`
        : '';

    const embed = new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL)
        .setTitle('🎁 ¡SORTEO ACTIVO!')
        .setDescription(
            `🏆 **Premio:** \`${prize}\`\n\n` +
            `⏳ **Finaliza:** <t:${Math.floor(endTime / 1000)}:R>\n` +
            `👑 **Organizado por:** <@${hostId}>\n` +
            `🥇 **Ganadores:** \`${winners}\`\n\n` +
            `👥 **Participantes:** \`0\`` +
            reqSection + `\n\n` +
            `*¡Hacé click en el botón de abajo para participar! Mucha suerte 🍀*`
        )
        .setFooter({ text: 'Prophet Gaming | Sistema de Sorteos' })
        .setTimestamp(new Date(endTime));

    const boton = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sorteo_participar').setLabel('🎉 Participar').setStyle(ButtonStyle.Success)
    );

    const msg = await channel.send({ embeds: [embed], components: [boton] });
    stmts.addGiveaway(msg.id, channel.id, prize, endTime, hostId, winners, requirements);

    return msg;
}

/**
 * Verificar si un usuario cumple los requisitos
 */
async function verificarRequisitos(interaction, requirements) {
    const member = interaction.member;
    const errors = [];

    // Nivel mínimo
    if (requirements.minLevel) {
        const userData = stmts.getUser(interaction.user.id);
        const userLevel = userData?.level || 0;
        if (userLevel < requirements.minLevel) {
            errors.push(`📈 Necesitás ser nivel **${requirements.minLevel}** (vos sos nivel **${userLevel}**)`);
        }
    }

    // Rol requerido
    if (requirements.requiredRoleId) {
        if (!member.roles.cache.has(requirements.requiredRoleId)) {
            const roleName = requirements.requiredRoleName || requirements.requiredRoleId;
            errors.push(`🏷️ Necesitás el rol **${roleName}**`);
        }
    }

    // Antigüedad en el servidor
    if (requirements.minDays) {
        const joinedMs = member.joinedTimestamp;
        const diasEnServer = Math.floor((Date.now() - joinedMs) / 86400000);
        if (diasEnServer < requirements.minDays) {
            errors.push(`📅 Necesitás **${requirements.minDays}** días en el server (llevás **${diasEnServer}**)`);
        }
    }

    return errors;
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

    // Verificar requisitos si existen
    const requirements = giveaway.requirements || {};
    if (Object.keys(requirements).length > 0) {
        const errors = await verificarRequisitos(interaction, requirements);
        if (errors.length > 0) {
            return interaction.reply({
                content: `❌ **No cumplís los requisitos para participar:**\n> ${errors.join('\n> ')}`,
                ephemeral: true
            });
        }
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
    // Protección anti-doble-finalización
    if (finalizingLocks.has(giveaway.message_id)) return { ended: false, winners: [] };
    finalizingLocks.add(giveaway.message_id);

    try {
        const channel = await client.channels.fetch(giveaway.channel_id);
        if (!channel) throw new Error(`Canal ${giveaway.channel_id} no disponible`);

        const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
        const entries = stmts.getGiveawayEntries(giveaway.message_id);

        const winnersCount = Math.max(1, Number.parseInt(giveaway.winners, 10) || 1);

        if (entries.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setTitle('🎉 Sorteo Finalizado')
                .setDescription(`**Premio:** ${giveaway.prize}\n\n❌ Nadie participó.`)
                .setTimestamp();
            if (message) await message.edit({ embeds: [embed], components: [] });
            stmts.endGiveaway(giveaway.message_id);
            return { ended: true, winners: [] };
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
        stmts.endGiveaway(giveaway.message_id);
        await channel.send(`🎉 ¡Felicitaciones ${ganadoresMenciones}! Ganaron **${giveaway.prize}**!`);
        return { ended: true, winners: ganadores.map(item => item.user_id) };
    } catch (err) {
        console.error('Error finalizando sorteo:', err.message);
        return { ended: false, winners: [], error: err.message };
    } finally {
        finalizingLocks.delete(giveaway.message_id);
    }
}

/**
 * Verificar sorteos activos (llamar periódicamente)
 */
async function verificarSorteos(client) {
    const activos = stmts.getActiveGiveaways();
    const ahora = Date.now();
    const vencidos = activos.filter(sorteo => ahora >= sorteo.end_time);
    await Promise.all(vencidos.map(sorteo => finalizarSorteo(client, sorteo)));
}

module.exports = { crearSorteo, participarSorteo, finalizarSorteo, verificarSorteos };

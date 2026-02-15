// ═══════════════════════════════════════════════════
//  MÓDULO: Sistema de Tickets
// ═══════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const { stmts } = require('../database');
const config = require('../config');

/**
 * Crear el embed + botón para abrir tickets
 */
async function crearPanelTickets(channel) {
    const embed = new EmbedBuilder()
        .setColor(config.COLORES.INFO)
        .setTitle('🛡️ **CENTRO DE SOPORTE — PROPHET GAMING**')
        .setDescription(
            'Bienvenido al sistema de soporte oficial. Si necesitás asistencia, nuestro equipo está listo para ayudarte.\n\n' +
            '**📋 ¿En qué podemos ayudarte?**\n' +
            '> 👤 **Reportes de Usuarios** (Comportamiento, Spam, etc.)\n' +
            '> 🔧 **Problemas Técnicos** del Servidor o Discord\n' +
            '> 💬 **Consultas Privadas** para la Administración\n' +
            '> 🤝 **Apelaciones** y Reclamos\n\n' +
            '**Instrucciones:**\n' +
            'Hacé click en el botón **"📩 Abrir Ticket"** para crear un canal privado con el Staff.'
        )
        .setFooter({ text: 'Prophet Gaming | Sistema de Soporte' })
        .setTimestamp();

    const boton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_abrir')
            .setLabel('📩 Abrir Ticket')
            .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [boton] });
}

/**
 * Abrir un ticket
 */
async function abrirTicket(interaction) {
    const guild = interaction.guild;
    const user = interaction.user;

    const tickets = guild.channels.cache.filter(c => c.name === `ticket-${user.username.toLowerCase()}`);
    if (tickets.size > 0) {
        return interaction.reply({ content: `❌ Ya tenés un ticket abierto: ${tickets.first()}`, ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const staffCat = guild.channels.cache.find(c => c.name === '🛡 STAFF' && c.type === ChannelType.GuildCategory);

    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`,
        type: ChannelType.GuildText,
        parent: staffCat?.id,
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ...(config.ROLES.STAFF ? [{ id: config.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
            ...(config.ROLES.MODERADOR ? [{ id: config.ROLES.MODERADOR, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
            ...(config.ROLES.PROPHET ? [{ id: config.ROLES.PROPHET, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
        ],
    });

    stmts.addTicket(ticketChannel.id, user.id);

    const embed = new EmbedBuilder()
        .setColor(config.COLORES.INFO)
        .setTitle(`🎫 **TICKET DE SOPORTE** | ${user.displayName}`)
        .setDescription(
            `¡Hola ${user}! Un miembro del Staff te atenderá a la brevedad.\n\n` +
            '**📝 Para agilizar el proceso, por favor indicá:**\n' +
            '> 🔹 El motivo detallado de tu consulta.\n' +
            '> 🔹 Evidencia (capturas de pantalla, IDs) si es un reporte.\n' +
            '> 🔹 Cualquier otro detalle relevante.\n\n' +
            '*Por favor, sé paciente y respetuoso mientras esperás.*'
        )
        .setFooter({ text: 'Prophet Gaming | Gestión de Tickets' })
        .setTimestamp();

    const cerrarBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_cerrar').setLabel('🔒 Cerrar Ticket').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [cerrarBtn] });
    await ticketChannel.send(`${user} — Tu ticket fue creado. Staff notificado.`);
    await interaction.editReply({ content: `✅ Ticket creado: ${ticketChannel}` });

    const logChannel = guild.channels.cache.get(config.CHANNELS.LOGS);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setColor(config.COLORES.INFO)
            .setDescription(`🎫 **Ticket abierto** por ${user.tag} → ${ticketChannel}`)
            .setTimestamp();
        logChannel.send({ embeds: [logEmbed] });
    }
}

/**
 * Cerrar un ticket
 */
async function cerrarTicket(interaction) {
    const channel = interaction.channel;
    const ticket = stmts.getTicket(channel.id);

    if (!ticket) {
        return interaction.reply({ content: '❌ Este canal no es un ticket.', ephemeral: true });
    }

    await interaction.reply({ content: '🔒 Cerrando ticket en 5 segundos...' });

    try {
        const user = await interaction.client.users.fetch(ticket.user_id);
        const embed = new EmbedBuilder()
            .setColor(config.COLORES.INFO)
            .setTitle('🎫 Tu ticket fue cerrado')
            .setDescription(`Cerrado por ${interaction.user.tag}`)
            .setFooter({ text: 'Prophet Gaming | Soporte' })
            .setTimestamp();
        await user.send({ embeds: [embed] });
    } catch (e) { }

    const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
    if (logChannel) {
        const logEmbed = new EmbedBuilder()
            .setColor(config.COLORES.ERROR)
            .setDescription(`🎫 **Ticket cerrado** por ${interaction.user.tag} (usuario: <@${ticket.user_id}>)`)
            .setTimestamp();
        logChannel.send({ embeds: [logEmbed] });
    }

    stmts.deleteTicket(channel.id);
    setTimeout(() => channel.delete('Ticket cerrado').catch(() => { }), 5000);
}

module.exports = { crearPanelTickets, abrirTicket, cerrarTicket };

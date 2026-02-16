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
        .setColor(config.COLORES.INFO || 0x3498DB)
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
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/4712/4712038.png')
        .setFooter({ text: 'Prophet Gaming | Sistema de Soporte Automático' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_abrir')
            .setLabel('📩 Abrir Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎫')
    );

    await channel.send({ embeds: [embed], components: [row] });
}

/**
 * Abrir un ticket
 */
async function abrirTicket(interaction) {
    // Si ya respondieron a la interacción (ej. doble click rápido), salir
    if (interaction.replied || interaction.deferred) return;

    const guild = interaction.guild;
    const user = interaction.user;

    // Verificar si ya tiene ticket abierto por nombre de canal (simple check)
    // OJO: Esto puede fallar si el usuario cambia de nombre, pero para MVP está bien.
    // Una mejora sería buscar en la DB si el usuario tiene un ticket activo.
    const existingChannel = guild.channels.cache.find(c => c.topic === `Ticket de ${user.id}` || c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);

    if (existingChannel) {
        return interaction.reply({ content: `❌ Ya tenés un ticket abierto: ${existingChannel}`, ephemeral: true });
    }

    // Intentar deferir la respuesta para evitar timeout
    try {
        await interaction.deferReply({ ephemeral: true });
    } catch (e) {
        return; // Si falla el defer, abortamos
    }

    // Buscar o crear categoría de Tickets
    let category = guild.channels.cache.find(c => c.name === 'Tickets' && c.type === ChannelType.GuildCategory);
    if (!category) {
        try {
            category = await guild.channels.create({
                name: 'Tickets',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] } // Oculta para @everyone
                ]
            });
        } catch (e) {
            console.error('Error creando categoría Tickets:', e);
        }
    }

    // Configurar permisos del canal
    const permissionOverwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
    ];

    // Añadir roles de Staff si están configurados
    [config.ROLES.STAFF, config.ROLES.MODERADOR, config.ROLES.PROPHET].forEach(roleId => {
        if (roleId) {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
            });
        }
    });

    try {
        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            parent: category ? category.id : null,
            topic: `Ticket de ${user.id}`,
            permissionOverwrites: permissionOverwrites
        });

        // Guardar en DB
        stmts.addTicket(ticketChannel.id, user.id);

        // Embed de bienvenida dentro del ticket
        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x2ECC71)
            .setTitle(`🎫 Ticket #${ticketChannel.name.split('-')[1] || 'Soporte'}`)
            .setDescription(
                `¡Hola ${user}! Gracias por contactar al soporte de Prophet Gaming.\n\n` +
                '**Mientras esperás a un miembro del Staff, por favor:**\n' +
                '1️⃣ Describe tu problema detalladamente.\n' +
                '2️⃣ Adjunta capturas o pruebas si es necesario.\n' +
                '3️⃣ **No etiquetes al Staff innecesariamente.**\n\n' +
                '🔒 *Para cerrar este ticket, usá el botón de abajo.*'
            )
            .setFooter({ text: 'Prophet Gaming | Staff Team', iconURL: guild.iconURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_cerrar')
                .setLabel('🔒 Cerrar Ticket')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({ content: `${user} | <@&${config.ROLES.STAFF || config.ROLES.MODERADOR || user.id}>`, embeds: [embed], components: [row] });

        await interaction.editReply({ content: `✅ Ticket creado correctamente: ${ticketChannel}` });

        // Log
        const logChannel = guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(config.COLORES.INFO || 0x3498DB)
                .setTitle('🎫 Nuevo Ticket')
                .setDescription(`**Usuario:** ${user.tag}\n**Canal:** ${ticketChannel}\n**Razón:** Soporte General`)
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }

    } catch (error) {
        console.error('Error creando ticket:', error);
        await interaction.editReply({ content: '❌ Hubo un error al crear el canal de ticket. Por favor contacta a un administrador.' });
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

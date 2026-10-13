// ═══════════════════════════════════════════════════
//  MÓDULO: Sistema de Tickets
// ═══════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const { stmts } = require('../database');
const config = require('../config');
const { notice, makeEmbed } = require('../utils/discordUI');
const openingTickets = new Set();

/**
 * Crear el embed + botón para abrir tickets
 */
async function crearPanelTickets(channel) {
    const embed = new EmbedBuilder()
        .setColor(config.COLORES.INFO || 0x3498DB)
        .setTitle('🛡️ **CENTRO DE SOPORTE — PROPHET GAMING**')
        .setDescription(
            '¡Bienvenido al centro de soporte de **Prophet Gaming**! Nuestro equipo de Staff está listo para ayudarte.\n\n' +
            '**📋 ¿En qué podemos asistirte?**\n' +
            '> 👤 **Reportes de Usuarios** — Comportamiento tóxico, spam, etc.\n' +
            '> 🔧 **Soporte Técnico** — Problemas con el servidor o Discord\n' +
            '> 💬 **Consultas Privadas** — Temas con la administración\n' +
            '> 🤝 **Apelaciones** — Bans, mutes y reclamos\n\n' +
            '**¿Cómo funciona?**\n' +
            'Hacé click en el botón de abajo para crear un canal privado donde solo vos y el Staff podrán hablar.'
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
    const key = String(interaction.guild?.id || 'unknown') + ':' + interaction.user.id;
    if (openingTickets.has(key)) {
        return interaction.reply(notice({
            title: 'Ticket en preparación',
            description: 'Ya estamos preparando tu solicitud. No hace falta que pulses otra vez.',
            tone: 'warning',
        }));
    }
    openingTickets.add(key);
    try {
        return await abrirTicketSinDuplicados(interaction);
    } finally {
        openingTickets.delete(key);
    }
}

async function abrirTicketSinDuplicados(interaction) {
    // Si ya respondieron a la interacción (ej. doble click rápido), salir
    if (interaction.replied || interaction.deferred) return;

    const guild = interaction.guild;
    const user = interaction.user;

    // Verificar si ya tiene ticket abierto por nombre de canal (simple check)
    // OJO: Esto puede fallar si el usuario cambia de nombre, pero para MVP está bien.
    // Una mejora sería buscar en la DB si el usuario tiene un ticket activo.
    const existingChannel = guild.channels.cache.find(c => c.type === ChannelType.GuildText
        && c.topic === `Ticket de ${user.id}`);

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
        try {
            stmts.addTicket(ticketChannel.id, user.id);
        } catch (error) {
            await ticketChannel.delete('No se pudo registrar el ticket en la base de datos').catch(() => {});
            throw error;
        }

        // Embed de bienvenida dentro del ticket
        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x2ECC71)
            .setTitle(`🎫 Ticket #${ticketChannel.name.split('-')[1] || 'Soporte'}`)
            .setDescription(
                `¡Hola ${user}! Gracias por contactarnos. Un miembro del Staff te atenderá lo antes posible.\n\n` +
                '**Mientras esperás, te pedimos que:**\n' +
                '1️⃣ Describas tu problema con el mayor detalle posible\n' +
                '2️⃣ Adjuntes capturas de pantalla o pruebas si las tenés\n' +
                '3️⃣ Tengas paciencia, el Staff responderá cuando esté disponible\n\n' +
                '🔒 *Cuando tu consulta se resuelva, usá el botón de abajo para cerrar el ticket.*'
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

        await interaction.editReply({
            embeds: [makeEmbed({
                title: 'Ticket creado',
                description: 'Tu consulta privada está lista en ' + ticketChannel + '. Describí ahí tu problema para que el Staff pueda ayudarte.',
                tone: 'success',
                footer: 'Soporte',
            })],
        });

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

    await interaction.reply(notice({
        title: 'Preparando cierre',
        description: 'Estoy guardando el historial de este ticket antes de cerrarlo.',
        tone: 'info',
    }));
    let archived = false;

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

    try {
        const discordTranscripts = require('discord-html-transcripts');
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1,
            returnType: 'attachment',
            filename: `ticket-${ticket.user_id}.html`,
            saveImages: true,
            footerText: "Exportado {number} mensaje{s}"
        });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setDescription(`🎫 **Ticket cerrado** por ${interaction.user.tag} (usuario: <@${ticket.user_id}>)`)
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed], files: [attachment], allowedMentions: { parse: [] } });
            archived = true;
        }
    } catch (e) {
        console.error('Error generando transcript HTML:', e.message);
        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) {
            let fallback;
            try {
                const { createPlainTicketTranscript } = require('../utils/ticketTranscript');
                fallback = await createPlainTicketTranscript(channel, ticket.user_id);
            } catch (fallbackError) {
                console.error('Error generando transcript de respaldo:', fallbackError.message);
            }
            const logEmbed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR)
                .setDescription(`🎫 **Ticket cerrado** por ${interaction.user.tag} (usuario: <@${ticket.user_id}>)\n${fallback ? '*Historial de respaldo adjunto en texto.*' : '*No fue posible exportar el historial.*'}`)
                .setTimestamp();
            if (fallback) {
                try {
                    await logChannel.send({
                        embeds: [logEmbed], files: [fallback], allowedMentions: { parse: [] },
                    });
                    archived = true;
                } catch (error) {
                    console.error('Error enviando respaldo de ticket:', error);
                }
            }
        }
    }

    if (!archived) {
        return interaction.editReply({
            embeds: [makeEmbed({
                title: 'No pude archivar la conversación',
                description: 'Para no perder el historial, el ticket **permanecerá abierto**. Avisá al Staff para que revise el canal de logs.',
                tone: 'error',
                footer: 'Soporte · Historial protegido',
            })],
        }).catch(() => {});
    }

    await interaction.editReply({
        embeds: [makeEmbed({
            title: 'Ticket archivado',
            description: 'Guardé una copia del historial para el Staff. Este canal se cerrará en unos segundos.',
            tone: 'success',
            footer: 'Soporte',
        })],
    }).catch(() => {});
    stmts.deleteTicket(channel.id);
    setTimeout(() => channel.delete('Ticket archivado').catch(() => {}), 5000).unref?.();
}

module.exports = { crearPanelTickets, abrirTicket, cerrarTicket };

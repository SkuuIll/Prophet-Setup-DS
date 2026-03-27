const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { abrirTicket, cerrarTicket } = require('../modules/tickets');
const { participarSorteo } = require('../modules/giveaways');
const { trackCommand, updateDailyQuestProgress } = require('../modules/profileSystem');
const { updateLastCommand } = require('../modules/uxEnhancements');
const { checkKeywordMentions, processNotificationQueue } = require('../modules/smartNotifications');
const { analyzeMessagePattern, logSecurityEvent } = require('../modules/advancedMod');

function esStaff(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator)
        || config.STAFF_ROLES.some(rol => member.roles.cache.some(r => r.id === rol || r.name === rol));
}

function actualizarEstadoReporte(embedData, estado) {
    const embed = EmbedBuilder.from(embedData.toJSON());
    const fields = [...(embed.data.fields || [])];
    const statusIndex = fields.findIndex(field => field.name.includes('Estado'));
    const statusField = { name: '📊 Estado', value: `\`${estado}\``, inline: true };

    if (statusIndex >= 0) fields[statusIndex] = statusField;
    else fields.push(statusField);

    embed.setFields(fields);
    return embed;
}

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const comando = client.commands.get(interaction.commandName);
            if (!comando) return;

            const canalesPermitidos = [config.CHANNELS.COMANDOS_BOT, config.CHANNELS.STAFF].filter(Boolean);
            const miembroStaff = esStaff(interaction.member);

            if (canalesPermitidos.length > 0 && !canalesPermitidos.includes(interaction.channelId) && !miembroStaff) {
                return interaction.reply({
                    content: `> 🚫 **Canal incorrecto** — Los comandos deben usarse en <#${config.CHANNELS.COMANDOS_BOT}>.`,
                    flags: 64,
                });
            }

            // ── COOLDOWN HANDLER ──
            if (comando.cooldown) {
                const cdKey = `${interaction.commandName}-${interaction.user.id}`;
                const now = Date.now();
                const cdMs = comando.cooldown * 1000; // cooldown en segundos → ms

                if (!client.cooldowns) client.cooldowns = new Collection();
                const timestamps = client.cooldowns;

                if (timestamps.has(cdKey)) {
                    const expiresAt = timestamps.get(cdKey) + cdMs;
                    if (now < expiresAt) {
                        const unixExpiry = Math.floor(expiresAt / 1000);
                        return interaction.reply({
                            content: `> ⏳ **Cooldown activo** — Podés volver a usar \`/${interaction.commandName}\` <t:${unixExpiry}:R>.`,
                            flags: 64,
                        });
                    }
                }
                timestamps.set(cdKey, now);
                // Auto-limpiar después de que expire
                setTimeout(() => timestamps.delete(cdKey), cdMs);
            }

            const startedAt = Date.now();
            try {
                await comando.execute(interaction, client);
                const durationMs = Date.now() - startedAt;
                stmts.recordCommandExecution(interaction.commandName, true, durationMs);

                // Track progreso de comandos para badges/achievements y misiones
                trackCommand(interaction.user.id);
                updateDailyQuestProgress(interaction.user.id, 'daily_commands', 1);
                updateLastCommand(interaction.user.id, interaction.commandName);

                stmts.setHealthCheck('commands:slash', {
                    status: 'ok',
                    durationMs,
                    details: {
                        command: interaction.commandName,
                        userId: interaction.user.id,
                    }
                });
                stmts.addLog('COMMAND', {
                    user: interaction.user.tag,
                    userId: interaction.user.id,
                    command: interaction.commandName,
                    channel: interaction.channel?.name || interaction.channelId,
                    durationMs,
                });
            } catch (error) {
                const durationMs = Date.now() - startedAt;
                stmts.recordCommandExecution(interaction.commandName, false, durationMs);
                stmts.incrementAnalyticsMetric('error_events', 'commands', 1);
                stmts.setHealthCheck('commands:slash', {
                    status: 'error',
                    durationMs,
                    details: {
                        command: interaction.commandName,
                        message: error.message,
                    }
                });
                console.error(`Error en /${interaction.commandName}:`, error.message);
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '⚠️  Error del sistema' })
                    .setDescription(
                        `> No se pudo ejecutar \`/${interaction.commandName}\`.\n` +
                        `> Si el problema persiste, avisá al Staff.\n\n` +
                        `\`\`\`\n${error.message.substring(0, 200)}\n\`\`\``
                    )
                    .setFooter({ text: 'Prophet Bot  ·  Error handler' })
                    .setTimestamp();

                const respuesta = { embeds: [errorEmbed], flags: 64 };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(respuesta).catch(() => { });
                } else {
                    await interaction.reply(respuesta).catch(() => { });
                }
            }
            return;
        }

        if (interaction.isButton()) {
            const id = interaction.customId;

            // Onboarding buttons
            if (id.startsWith('onboarding_')) {
                const { handleOnboardingInteraction } = require('../modules/onboarding');
                return await handleOnboardingInteraction(interaction, id);
            }

            // Assistant quick responses
            if (id.startsWith('assistant:')) {
                const { handleAssistantButton } = require('../commands/utility/asistente');
                return await handleAssistantButton(interaction);
            }

            if (id === 'ticket_abrir') return abrirTicket(interaction);
            if (id === 'ticket_cerrar') return cerrarTicket(interaction);
            if (id === 'sorteo_participar') return participarSorteo(interaction);

            if (id.startsWith('rep_')) {
                if (!esStaff(interaction.member)) {
                    return interaction.reply({
                        content: '> 🚫 Solo el Staff puede gestionar reportes.',
                        flags: 64,
                    });
                }

                if (id.startsWith('rep_tomado_') || id.startsWith('rep_descartado_')) {
                    const embedOrigen = interaction.message.embeds[0];
                    if (!embedOrigen) {
                        return interaction.reply({
                            content: '> ⚠️ No pude actualizar ese reporte.',
                            flags: 64,
                        });
                    }

                    const estado = id.startsWith('rep_tomado_')
                        ? `🟡 En revisión por ${interaction.user.tag}`
                        : `⚫ Descartado por ${interaction.user.tag}`;

                    const updatedEmbed = actualizarEstadoReporte(embedOrigen, estado)
                        .setColor(id.startsWith('rep_tomado_') ? (config.COLORES.WARN || 0xFFB74D) : (config.COLORES.ERROR || 0xEF5350))
                        .setFooter({ text: `Gestionado por ${interaction.user.tag}` })
                        .setTimestamp();

                    return interaction.update({ embeds: [updatedEmbed], components: [] });
                }

                if (id.startsWith('rep_profile_') || id.startsWith('rep_ban_')) {
                    const userId = id.replace('rep_profile_', '').replace('rep_ban_', '');
                    const member = await interaction.guild.members.fetch(userId).catch(() => null);
                    const user = member?.user || await client.users.fetch(userId).catch(() => null);

                    if (!user) {
                        return interaction.reply({
                            content: '> ⚠️ No pude obtener la información de ese usuario.',
                            flags: 64,
                        });
                    }

                    const warns = stmts.countWarns(userId).total;
                    const roles = member
                        ? member.roles.cache
                            .filter(role => role.id !== interaction.guild.id)
                            .map(role => `<@&${role.id}>`)
                            .slice(0, 8)
                        : [];

                    const profileEmbed = new EmbedBuilder()
                        .setColor(config.COLORES.INFO || 0x42A5F5)
                        .setAuthor({ name: '👤  Perfil del reportado', iconURL: user.displayAvatarURL() })
                        .setThumbnail(user.displayAvatarURL({ size: 256 }))
                        .addFields(
                            { name: 'Usuario', value: `${user} (\`${user.tag}\`)`, inline: false },
                            { name: 'ID', value: `\`${user.id}\``, inline: true },
                            { name: 'Warns', value: `\`${warns}\``, inline: true },
                            { name: 'Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
                            { name: 'Entró al servidor', value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : '`No disponible`', inline: false },
                            { name: 'Roles', value: roles.length ? roles.join(', ') : '`Sin roles visibles`', inline: false }
                        )
                        .setTimestamp();

                    return interaction.reply({ embeds: [profileEmbed], flags: 64 });
                }
            }

            if (id.startsWith('rr_')) {
                const roleId = id.replace('rr_', '').replace('auto_', '');
                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({
                        content: '> ❌ **Rol no encontrado** — Es posible que haya sido eliminado del servidor.',
                        flags: 64,
                    });
                }

                try {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(role);
                        await interaction.reply({
                            content: `> ➖ Se te removió el rol **${role.name}**.`,
                            flags: 64,
                        });
                    } else {
                        await member.roles.add(role);
                        await interaction.reply({
                            content: `> ✅ Se te asignó el rol **${role.name}**.`,
                            flags: 64,
                        });
                    }
                } catch (e) {
                    console.error('Error RR:', e);
                    await interaction.reply({
                        content: `> ❌ **Error de permisos** — No pude modificar el rol. Avisá al Staff.\n> \`${e.message}\``,
                        flags: 64,
                    });
                }
            }
        }

        // Comandos contextuales (User)
        if (interaction.isUserContextMenuCommand()) {
            const comando = client.commands.get(interaction.commandName);
            if (comando) {
                const startedAt = Date.now();
                try {
                    await comando.execute(interaction);
                    const durationMs = Date.now() - startedAt;

                    // Tracking unificado (igual que slash commands)
                    trackCommand(interaction.user.id);
                    updateDailyQuestProgress(interaction.user.id, 'daily_commands', 1);
                    updateLastCommand(interaction.user.id, `ctx:${interaction.commandName}`);
                    stmts.recordCommandExecution(`ctx:${interaction.commandName}`, true, durationMs);
                    stmts.addLog('CONTEXT_COMMAND', {
                        user: interaction.user.tag,
                        userId: interaction.user.id,
                        command: interaction.commandName,
                        type: 'user',
                        durationMs,
                    });
                } catch (error) {
                    const durationMs = Date.now() - startedAt;
                    stmts.recordCommandExecution(`ctx:${interaction.commandName}`, false, durationMs);
                    stmts.incrementAnalyticsMetric('error_events', 'context_commands', 1);
                    console.error(`Error en contexto ${interaction.commandName}:`, error.message);
                    const errorEmbed = new EmbedBuilder()
                        .setColor(config.COLORES.ERROR || 0xEF5350)
                        .setAuthor({ name: '⚠️  Error del sistema' })
                        .setDescription(
                            `> No se pudo ejecutar \`${interaction.commandName}\`.\n` +
                            `> Si el problema persiste, avisá al Staff.\n\n` +
                            `\`\`\`\n${error.message.substring(0, 200)}\n\`\`\``
                        )
                        .setFooter({ text: 'Prophet Bot  ·  Error handler' })
                        .setTimestamp();
                    const respuesta = { embeds: [errorEmbed], flags: 64 };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(respuesta).catch(() => {});
                    } else {
                        await interaction.reply(respuesta).catch(() => {});
                    }
                }
            }
            return;
        }

        // Comandos contextuales (Message)
        if (interaction.isMessageContextMenuCommand()) {
            const comando = client.commands.get(interaction.commandName);
            if (comando) {
                const startedAt = Date.now();
                try {
                    await comando.execute(interaction);
                    const durationMs = Date.now() - startedAt;

                    trackCommand(interaction.user.id);
                    updateDailyQuestProgress(interaction.user.id, 'daily_commands', 1);
                    updateLastCommand(interaction.user.id, `ctx:${interaction.commandName}`);
                    stmts.recordCommandExecution(`ctx:${interaction.commandName}`, true, durationMs);
                    stmts.addLog('CONTEXT_COMMAND', {
                        user: interaction.user.tag,
                        userId: interaction.user.id,
                        command: interaction.commandName,
                        type: 'message',
                        durationMs,
                    });
                } catch (error) {
                    const durationMs = Date.now() - startedAt;
                    stmts.recordCommandExecution(`ctx:${interaction.commandName}`, false, durationMs);
                    stmts.incrementAnalyticsMetric('error_events', 'context_commands', 1);
                    console.error(`Error en contexto ${interaction.commandName}:`, error.message);
                    const errorEmbed = new EmbedBuilder()
                        .setColor(config.COLORES.ERROR || 0xEF5350)
                        .setAuthor({ name: '⚠️  Error del sistema' })
                        .setDescription(
                            `> No se pudo ejecutar \`${interaction.commandName}\`.\n` +
                            `> Si el problema persiste, avisá al Staff.\n\n` +
                            `\`\`\`\n${error.message.substring(0, 200)}\n\`\`\``
                        )
                        .setFooter({ text: 'Prophet Bot  ·  Error handler' })
                        .setTimestamp();
                    const respuesta = { embeds: [errorEmbed], flags: 64 };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(respuesta).catch(() => {});
                    } else {
                        await interaction.reply(respuesta).catch(() => {});
                    }
                }
            }
            return;
        }

        if (interaction.isModalSubmit()) {
            // Confesiones
            if (interaction.customId === 'modal_confesion') {
                const comando = client.commands.get('confesion');
                if (comando) {
                    await comando.handleModal(interaction);
                }
                return;
            }

            // Pago contextual (Dar Coins)
            if (interaction.customId.startsWith('pay_modal_')) {
                const targetUserId = interaction.customId.replace('pay_modal_', '');
                const amount = parseInt(interaction.fields.getTextInputValue('amount'));
                
                if (isNaN(amount) || amount <= 0) {
                    return interaction.reply({ content: '❌ Ingresá una cantidad válida.', flags: 64 });
                }

                const sender = stmts.getUser(interaction.user.id);
                if (!sender || sender.balance < amount) {
                    return interaction.reply({ content: '❌ No tenés suficientes coins.', flags: 64 });
                }

                // Realizar transferencia
                stmts.updateBalance(interaction.user.id, -amount);
                stmts.updateBalance(targetUserId, amount);

                const targetUser = await client.users.fetch(targetUserId).catch(() => null);
                
                const embed = new EmbedBuilder()
                    .setTitle('💸 Transferencia Realizada')
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setDescription(`Enviaste **${amount.toLocaleString()} coins** a ${targetUser || `<@${targetUserId}>`}`)
                    .addFields(
                        { name: 'Tu balance', value: `${(sender.balance - amount).toLocaleString()} coins`, inline: true },
                        { name: 'Destinatario', value: targetUser ? targetUser.tag : targetUserId, inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            // Reporte contextual
            if (interaction.customId.startsWith('context_report_')) {
                const targetUserId = interaction.customId.replace('context_report_', '');
                const reason = interaction.fields.getTextInputValue('reason');
                const evidence = interaction.fields.getTextInputValue('evidence') || 'Sin evidencia adjunta';

                const reportChannel = interaction.guild.channels.cache.get(config.CHANNELS.STAFF);
                if (!reportChannel) {
                    return interaction.reply({ content: '❌ No pude encontrar el canal de Staff.', flags: 64 });
                }

                const targetUser = await client.users.fetch(targetUserId).catch(() => null);

                const reportEmbed = new EmbedBuilder()
                    .setTitle('🚨 Reporte de Usuario')
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: `Reportado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        { name: '👤 Reportado', value: targetUser ? `${targetUser} (\`${targetUser.tag}\`)` : `<@${targetUserId}>`, inline: true },
                        { name: '📋 Razón', value: reason, inline: false },
                        { name: '📎 Evidencia', value: evidence, inline: false }
                    )
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`rep_tomado_${targetUserId}`).setLabel('Tomar').setStyle(ButtonStyle.Primary).setEmoji('👀'),
                        new ButtonBuilder().setCustomId(`rep_profile_${targetUserId}`).setLabel('Ver Perfil').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
                        new ButtonBuilder().setCustomId(`rep_descartado_${targetUserId}`).setLabel('Descartar').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                    );

                await reportChannel.send({ embeds: [reportEmbed], components: [row] });

                return interaction.reply({ content: '✅ Reporte enviado al Staff anónimamente.', flags: 64 });
            }
        }

        if (interaction.isStringSelectMenu()) {
            // Onboarding role select
            if (interaction.customId === 'onboarding_select_roles') {
                const { handleOnboardingRoleSelect } = require('../modules/onboarding');
                return await handleOnboardingRoleSelect(interaction);
            }

            if (interaction.customId === 'auto_roles_juegos') {
                const member = interaction.member;
                const guild = interaction.guild;
                const values = interaction.values;

                const roleMap = {
                    role_valorant: config.ROLES_JUEGOS?.VALORANT || guild.roles.cache.find(r => r.name.toLowerCase().includes('valorant'))?.id,
                    role_lol: config.ROLES_JUEGOS?.LOL || guild.roles.cache.find(r => r.name.toLowerCase().includes('league') || r.name.toLowerCase().includes('lol'))?.id,
                    role_minecraft: config.ROLES_JUEGOS?.MINECRAFT || guild.roles.cache.find(r => r.name.toLowerCase().includes('minecraft'))?.id,
                    role_cs2: config.ROLES_JUEGOS?.CS2 || guild.roles.cache.find(r => r.name.toLowerCase().includes('cs2') || r.name.toLowerCase().includes('counter'))?.id,
                    role_pubg: config.ROLES_JUEGOS?.PUBG || guild.roles.cache.find(r => r.name.toLowerCase().includes('pubg'))?.id,
                    role_gta: config.ROLES_JUEGOS?.GTA || guild.roles.cache.find(r => r.name.toLowerCase().includes('gta') || r.name.toLowerCase().includes('roleplay'))?.id,
                };

                const assigned = [];
                const removed = [];
                const allMenuRoleIds = Object.values(roleMap).filter(Boolean);

                try {
                    for (const roleId of allMenuRoleIds) {
                        const isSelected = Object.keys(roleMap).some(key => roleMap[key] === roleId && values.includes(key));
                        if (!isSelected && member.roles.cache.has(roleId)) {
                            await member.roles.remove(roleId);
                            removed.push(guild.roles.cache.get(roleId).name);
                        }
                    }

                    for (const value of values) {
                        const roleId = roleMap[value];
                        if (roleId && !member.roles.cache.has(roleId)) {
                            await member.roles.add(roleId);
                            assigned.push(guild.roles.cache.get(roleId).name);
                        }
                    }

                    let msg = '✅ **Roles actualizados correctamente.**\n';
                    if (assigned.length > 0) msg += `> ➕ **Añadidos:** ${assigned.join(', ')}\n`;
                    if (removed.length > 0) msg += `> ➖ **Removidos:** ${removed.join(', ')}\n`;
                    if (assigned.length === 0 && removed.length === 0) msg = '✅ **Tus roles ya estaban al día.**';

                    await interaction.reply({ content: msg, flags: 64 });
                } catch (e) {
                    console.error('Error aplicando Select Menu Roles:', e);
                    await interaction.reply({ content: '❌ **Error de permisos.** No pude modificar tus roles.', flags: 64 });
                }
            }
        }
    },
};

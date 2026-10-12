// ═══ EVENTO: guildMemberAdd (Bienvenida) ═══

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const { verificarRaid } = require('../modules/antispam');
const { stmts } = require('../database');
const { resolveMemberChannel, missingSendPermissions, sendWithImageFallback } = require('../utils/memberNotifications');
const { getPersistedValue } = require('../utils/memberNotificationDiagnostics');

async function resolveWelcomeChannel(guild) {
    return resolveMemberChannel(guild, {
        configValue: config.CHANNELS.BIENVENIDOS,
        persistedValue: getPersistedValue('BIENVENIDOS'),
        kind: 'welcome',
    });
}

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        try {
            // Métrica de retención
            try { stmts.incrementAnalyticsMetric('member_joins', 'global', 1); }
            catch (error) { console.warn('[Bienvenida] No se pudo registrar métrica:', error.message); }

            // La notificación se envía ANTES de tareas de roles, anti-raid
            // y apodos: un fallo en cualquiera de ellas nunca debe ocultar el ingreso.
            // Canal de bienvenida
            const welcomeChannel = await resolveWelcomeChannel(member.guild);
            if (!welcomeChannel) {
                console.error(`[Bienvenida] No se encontró un canal para ${member.guild.id}; revisá BIENVENIDOS y permisos.`);
            } else {

            // Generar tarjeta y enviar bienvenida
            try {
                const missing = missingSendPermissions(welcomeChannel, member.guild);
                if (missing.includes('ViewChannel') || missing.includes('SendMessages')) {
                    console.error(`[Bienvenida] Sin permisos para enviar en #${welcomeChannel.name}: ${missing.join(', ')}`);
                    return;
                }
                const files = [];
                const allowImage = !missing.includes('AttachFiles') && !missing.includes('EmbedLinks');
                if (allowImage) try {
                    const { generarBienvenida } = require('../utils/canvas');
                    const welcomeBuffer = await generarBienvenida(member);
                    if (welcomeBuffer) {
                        files.push(new AttachmentBuilder(welcomeBuffer, { name: 'bienvenida.png' }));
                    }
                } catch (canvasError) {
                    console.warn('[Bienvenida] Fallback sin imagen por error en canvas:', canvasError.message);
                }

                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                    .setTitle(`¡Bienvenido/a a la familia, ${member.user.username}!`)
                    .setDescription(
                        `Hola ${member}, nos alegra muchísimo tenerte acá. 👋\n\n` +
                        `**📜 Primeros pasos:**\n` +
                        `> 📌 Leé las **reglas** en <#${config.CHANNELS.REGLAS || '1472401285964890237'}>\n` +
                        `> 💬 Presentate en el chat y contanos qué jugás\n` +
                        `> 🎮 Unite a las partidas y divertite con la comunidad\n` +
                        `> 🎵 Probá los comandos de música con \`/play\`\n\n` +
                        `*¡Esperamos que la pases genial! Si necesitás ayuda, abrí un ticket.* 🎫`
                    )
                    .setFooter({ text: `Prophet Gaming  ·  Miembro #${member.guild.memberCount}` })
                    .setTimestamp();

                if (files.length > 0) {
                    embed.setImage('attachment://bienvenida.png');
                }

                if (missing.includes('EmbedLinks')) {
                    await welcomeChannel.send({
                        content: `¡Bienvenido a Prophet Gaming, ${member}! Pasá por las reglas y presentate en el chat.`,
                        allowedMentions: { users: [member.id] },
                    });
                } else {
                    await sendWithImageFallback(welcomeChannel, {
                        content: `<@${member.id}>`, embeds: [embed], files,
                        allowedMentions: { users: [member.id] },
                    });
                }
                console.log(`👋 Bienvenida enviada para ${member.user.tag} en #${welcomeChannel.name}`);

            } catch (sendError) {
                console.error(`[Bienvenida] Error enviando mensaje a #${welcomeChannel.name} (${welcomeChannel.id}):`, sendError);
            }
            }

            // Anti-raid
            let raid = { esRaid: false };
            try { raid = verificarRaid(member); }
            catch (error) { console.error('[AntiRaid] Falló detección de raid:', error.message); }
            if (raid.esRaid) {
                const logChannelId = config.CHANNELS.LOGS || '1536543207402508318';
                const logChannel = member.guild.channels.cache.get(logChannelId) 
                    || await member.guild.channels.fetch(logChannelId).catch(() => null);

                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(config.COLORES.ERROR || 0xEF5350)
                        .setAuthor({ name: '🚨  ALERTA — Posible raid detectado' })
                        .setDescription(
                            `> ${raid.razon}\n\n` +
                            `> 🔒 **Acción automática:** Nivel de verificación elevado a **ALTO** por 5 minutos.\n` +
                            `> El servidor volverá al nivel normal automáticamente.`
                        )
                        .setFooter({ text: 'Prophet  ·  Anti-Raid' })
                        .setTimestamp();
                    logChannel.send({ embeds: [embed] }).catch(() => {});
                }

                // Subir nivel de verificación a HIGH automáticamente
                try {
                    const prevLevel = member.guild.verificationLevel;
                    await member.guild.setVerificationLevel(3, 'Anti-Raid: raid detectado automáticamente');
                    setTimeout(async () => {
                        try {
                            await member.guild.setVerificationLevel(prevLevel, 'Anti-Raid: restaurado tras 5 minutos');
                            const logCh = member.guild.channels.cache.get(logChannelId);
                            if (logCh) logCh.send('> 🔓 **Anti-Raid:** Nivel de verificación restaurado al valor anterior.').catch(() => {});
                        } catch (e) { console.error('[AntiRaid] Error restaurando verificación:', e.message); }
                    }, 300000);
                } catch (e) {
                    console.error('[AntiRaid] Error ajustando nivel de verificación:', e.message);
                }
            }

            // Asignar rol Bots si es bot
            if (member.user.bot) {
                if (config.ROLES.BOTS) {
                    try {
                        await member.roles.add(config.ROLES.BOTS, 'Bot detectado');
                    } catch (e) { console.debug('[Bienvenida] Error asignando rol Bots:', e.message); }
                }
                return;
            }

            // Asignar rol Nuevo (si el miembro no está pendiente de screening de reglas)
            if (config.ROLES.NUEVO && !member.pending) {
                const rolesProtegidos = [config.ROLES.PROPHET, config.ROLES.STAFF, config.ROLES.MODERADOR, config.ROLES.VIP, config.ROLES.BOTS].filter(Boolean);
                const roleObj = member.guild.roles.cache.get(config.ROLES.NUEVO);
                const roleNameLower = roleObj ? roleObj.name.toLowerCase() : '';
                const isProtected = rolesProtegidos.includes(config.ROLES.NUEVO) ||
                                    (roleObj && rolesProtegidos.includes(roleObj.name)) ||
                                    roleNameLower.includes('vip') ||
                                    roleNameLower.includes('staff') ||
                                    roleNameLower.includes('moderador') ||
                                    roleNameLower.includes('admin');
                                    
                if (!isProtected) {
                    try {
                        await member.roles.add(config.ROLES.NUEVO, 'Nuevo miembro');
                        const roleName = roleObj?.name || config.ROLES.NUEVO;
                        console.log(`👤 Rol "${roleName}" asignado a nuevo miembro ${member.user.tag} (${member.id})`);
                    } catch (e) {
                        console.debug(`[Bienvenida] Error asignando rol NUEVO a ${member.user.tag}:`, e.message);
                    }
                }
            }

            // Auto-aplicar fuente estilizada del clan (Small Caps por defecto)
            if (!member.pending) {
                try {
                    const { applyClanFont, isAutoClanFontEnabled, getClanFontStyle } = require('../modules/clanFont');
                    if (isAutoClanFontEnabled()) {
                        const style = getClanFontStyle();
                        await applyClanFont(member, style, 'Auto-aplicación de fuente del clan al ingresar');
                    }
                } catch (e) {
                    console.debug('[ClanFont] Error aplicando fuente automática al nuevo miembro:', e.message);
                }
            }

            // Onboarding interactivo por DM (desactivado según requerimiento del usuario)
            if (config.ONBOARDING?.ENABLED) {
                try {
                    const onboarding = require('../modules/onboarding');
                    setTimeout(async () => {
                        try {
                            if (!member.guild) return;
                            const progress = onboarding.getOnboardingProgress(member.id);
                            if (!progress.completed) {
                                const result = await onboarding.sendOnboardingStep(member, 'welcome');
                                if (result) {
                                    await member.send({
                                        embeds: [result.embed],
                                        components: result.components
                                    }).catch(() => {});
                                }
                            }
                        } catch (e) {
                            console.debug('[Onboarding] No se pudo enviar DM:', e.message);
                        }
                    }, 30000);
                } catch (_) {}
            }

        } catch (globalErr) {
            console.error('[guildMemberAdd] Error no capturado:', globalErr);
        }
    }
};

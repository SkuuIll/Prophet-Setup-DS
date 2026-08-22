// ═══ EVENTO: voiceStateUpdate (Log de Canales de Voz + Voice XP) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { procesarXPVoz } = require('../modules/leveling');
const { trackVoiceMinutes, updateDailyQuestProgress } = require('../modules/profileSystem');

// Lock para evitar creaciones duplicadas simultáneas
const creatingChannelFor = new Set();

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState) {
        try {
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;
        const userId = member.id;
        const guild = member.guild;

        // Auto-sincronización de fuente del clan al conectar a voz
        try {
            const { applyClanFont, isAutoClanFontEnabled, getClanFontStyle, convertText, canManageMember } = require('../modules/clanFont');
            if (isAutoClanFontEnabled() && canManageMember(member)) {
                const style = getClanFontStyle();
                const current = member.nickname || member.displayName;
                const expected = convertText(current, style);
                if (member.nickname !== expected) {
                    applyClanFont(member, style, 'Sincronización activa de fuente en canal de voz', true).catch(() => {});
                }
            }
        } catch (_) {}

        // Función ayudante para procesar nivel visualmente
        const manejarSubidaDeNivel = async (member, resultado) => {
            stmts.incrementAnalyticsMetric('level_ups', 'global', 1);
            const { trackLevel } = require('../modules/profileSystem');
            trackLevel(member.id, resultado.nuevoNivel);

            // Enviar al canal de roles/niveles, no a bienvenidos
            const chatChannel = guild.channels.cache.get(config.CHANNELS.ROLES)
                || guild.channels.cache.get(config.CHANNELS.CHAT);
            if (!chatChannel) return;

            // Mensajes dinámicos según hito de nivel
            const lvl = resultado.nuevoNivel;
            let levelTitle = '🎉  ¡Subiste de nivel hablando!';
            let levelDesc = `> ${member.user} subió a **Nivel ${lvl}** por su tiempo en canales de voz!\n> ¡Seguí participando para desbloquear más recompensas!`;

            if (lvl === 5) {
                levelTitle = '🌱  ¡Nivel 5 — Voz activa!';
                levelDesc = `> ${member.user} alcanzó **Nivel 5** en voz — ¡ya se nota tu presencia!\n> La comunidad te escucha. 🎤`;
            } else if (lvl === 10) {
                levelTitle = '📚  ¡Nivel 10 — Aprendiz de la voz!';
                levelDesc = `> ${member.user} alcanzó **Nivel 10** en voz — ¡vas para arriba!\n> Tu voz ya es parte del servidor. 👊`;
            } else if (lvl === 25) {
                levelTitle = '⚔️  ¡Nivel 25 — Veterano!';
                levelDesc = `> ${member.user} alcanzó **Nivel 25** en voz — ¡leyenda activa!\n> Los nuevos miran tu nivel con admiración. 🔥`;
            } else if (lvl === 50) {
                levelTitle = '👑  ¡Nivel 50 — ÉLITE del servidor!';
                levelDesc = `> ${member.user} alcanzó **Nivel 50** en voz — ¡pilar absoluto!\n> Mitad del camino a la leyenda. 🏆`;
            } else if (lvl === 100) {
                levelTitle = '🏆  ¡NIVEL 100 — LEYENDA ABSOLUTA!';
                levelDesc = `> 🔔 ${member.user} alcanzó **Nivel 100** en voz — ¡RECORD HISTÓRICO!\n> Sos la leyenda de Prophet Gaming. 🙌`;
            } else if (lvl % 10 === 0) {
                levelTitle = `⭐  ¡Nivel ${lvl} — Hito de Voz!`;
                levelDesc = `> ${member.user} alcanzó **Nivel ${lvl}** en voz — ¡imparable!\n> Cada minuto en voz cuenta. 🚀`;
            }

            const embed = new EmbedBuilder()
                .setColor(lvl >= 50 ? 0xFFD700 : lvl >= 25 ? 0xE040FB : config.COLORES.NIVEL || 0xBB86FC)
                .setAuthor({ name: levelTitle })
                .setDescription(levelDesc)
                .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                .setFooter({ text: `Prophet  ·  Sistema de Niveles  ·  Nivel ${lvl}` })
                .setTimestamp();

            if (resultado.rolNuevo) {
                embed.addFields({
                    name: '🏅 Nuevo rol desbloqueado',
                    value: `> ¡Obtuviste el rol **${resultado.rolNuevo}**!`
                });

                const rol = guild.roles.cache.find(r => r.name === resultado.rolNuevo);
                const rolesProtegidosIds = [config.ROLES.PROPHET, config.ROLES.STAFF, config.ROLES.MODERADOR, config.ROLES.VIP, config.ROLES.BOTS].filter(Boolean);
                if (rol && !rolesProtegidosIds.includes(rol.id)) {
                    try {
                        await member.roles.add(rol, `Subió a nivel ${resultado.nuevoNivel} (XP de Voz)`);
                    } catch (e) {
                        console.error('Error asignando rol de nivel por voz:', e.message);
                    }
                }
            }

            chatChannel.send({ embeds: [embed] }).catch(() => {});
        };

        // ── VOICE XP: Tracking de sesión (con anti-abuse) ────────────────────────────
        if (!member.client.voiceSessions) member.client.voiceSessions = new Map();

        const joiningVoice = !oldState.channelId && newState.channelId;
        const leavingVoice = oldState.channelId && !newState.channelId;
        const stateChanged = oldState.channelId && newState.channelId; // mute/deafen/move

        // Helper: verificar si un usuario está en condiciones de ganar XP
        const esElegibleXP = (state) => {
            if (!state.channelId) return false;
            // No dar XP si está self-deafened (AFK farming)
            if (state.selfDeaf) return false;
            // No dar XP si está en un canal AFK
            if (state.channel && state.guild.afkChannelId === state.channelId) return false;
            // No dar XP si está solo en el canal (sin contar bots)
            if (state.channel && state.channel.members.filter(m => !m.user.bot).size < 2) return false;
            return true;
        };

        if (joiningVoice) {
            // Solo registrar si cumple condiciones
            if (esElegibleXP(newState)) {
                member.client.voiceSessions.set(userId, {
                    joinedAt: Date.now(),
                    guildId: guild.id,
                    channelId: newState.channelId
                });
            }
        } else if (leavingVoice) {
            // Al salir: dar XP por el tiempo acumulado
            const session = member.client.voiceSessions.get(userId);
            if (session) {
                const minutosTranscurridos = Math.floor((Date.now() - session.joinedAt) / 60000);
                if (minutosTranscurridos >= 1) {
                    const resultado = procesarXPVoz(userId, minutosTranscurridos);
                    stmts.incrementAnalyticsMetric('voice_minutes', 'global', minutosTranscurridos);

                    // Track progreso de voz para badges/achievements y misiones
                    trackVoiceMinutes(userId, minutosTranscurridos);
                    updateDailyQuestProgress(userId, 'daily_voice_minutes', minutosTranscurridos);
                    
                    // Si subió de nivel gracias al tiempo en voz
                    if (resultado.subioNivel) {
                        manejarSubidaDeNivel(member, resultado);
                    }
                }
                member.client.voiceSessions.delete(userId);
            }
        } else if (stateChanged) {
            // Si cambió estado (mute/deafen/move): reevaluar elegibilidad
            const session = member.client.voiceSessions.get(userId);
            const ahora = esElegibleXP(newState);

            if (session && !ahora) {
                // Estaba trackeando pero ya no es elegible → guardar XP parcial y pausar
                const minutosTranscurridos = Math.floor((Date.now() - session.joinedAt) / 60000);
                if (minutosTranscurridos >= 1) {
                    const resultado = procesarXPVoz(userId, minutosTranscurridos);
                    stmts.incrementAnalyticsMetric('voice_minutes', 'global', minutosTranscurridos);
                    
                    if (resultado.subioNivel) {
                        manejarSubidaDeNivel(member, resultado);
                    }
                }
                member.client.voiceSessions.delete(userId);
            } else if (!session && ahora) {
                // No estaba trackeando pero ahora sí es elegible → empezar
                member.client.voiceSessions.set(userId, {
                    joinedAt: Date.now(),
                    guildId: guild.id,
                    channelId: newState.channelId
                });
            }
        }
        // ─────────────────────────────────────────────────────────────────────────────

        const configData = stmts.getConfig('voice_generator_id');
        const generatorId = configData ? configData.value : null;
        const configCat = stmts.getConfig('voice_category_id');
        const categoryId = configCat ? configCat.value : null;

        const STATUSES = [
            "🤬 Modo Tóxico ON",
            "🧂 Más salado que el mar",
            "📉 Perdiendo RP...",
            "💀 Carreados por el team",
            "🐒 Equipo de macacos",
            "🚮 Basura espacial",
            "🔥 Tilteados al máximo",
            "🖱️ Rompiendo periféricos",
            "💦 Sudando sangre",
            "🏆 Smurfeando chilling",
            "❌ Alt + F4 inminente",
            "🤡 Circo de 5 pistas",
            "🤝 Carrileando bronces",
            "🛑 Lag mental",
            "♿ Mi team da pena",
            "🎮 Feedeando intencionalmente",
            "🚪 Desinstalando el juego",
            "🤐 Muteall y a ganar",
            "🔪 Apuñaladas al team",
            "🚑 Llama a la ambulancia",
            "🦶 Jugando con los pies",
            "💻 Monitor apagado",
            "🗑️ Directo a la basura",
            "🦍 Mentalidad de Plata IV",
            "💤 Dormido esperando gank",
            "🥊 Boxeando al teclado",
            "💥 0/10 power spike",
            "🐔 Campeando",
            "🐛 El juego está bug!",
            "🤖 Somos todos bots",
            "👀 Jugando a ciegas",
            "🗣️ Mucho texto, poco aim",
            "🐌 Reflejos de caracol",
            "🧠 -100 IQ plays",
            "🧱 Hablándole a la pared",
            "🚨 Reporte en progreso...",
            "💩 Mis mecánicas dan asco",
            "🤡 Los payasos del server",
            "💣 A punto de explotar",
            "🚫 Chat restringido"
        ];

        // 1. Lógica del creador de salas temporales
        if (newState.channelId && newState.channelId === generatorId) {
            // Evitar duplicados: si ya hay una creación en curso para este usuario, ignorar
            if (creatingChannelFor.has(userId)) return;
            creatingChannelFor.add(userId);

            try {
                const channelName = `🔊 Sala de ${newState.member.user.username}`;
                console.log(`[TempVoice] Creando sala para ${newState.member.user.username}...`);

                const parentId = categoryId || newState.channel?.parentId || null;
                const botId = newState.client.user.id;
                const everyoneId = newState.guild.id; // @everyone role ID = guild ID

                const newChannel = await newState.guild.channels.create({
                    name: channelName,
                    type: 2, // GUILD_VOICE
                    parent: parentId,
                    permissionOverwrites: [
                        {
                            // @everyone: permitir Connect explícitamente para que el usuario pueda entrar
                            id: everyoneId,
                            allow: ['Connect', 'ViewChannel'],
                        },
                        {
                            // El bot: todos los permisos necesarios para gestionar y mover
                            id: botId,
                            type: 1,
                            allow: ['ManageChannels', 'Connect', 'ViewChannel', 'Speak', 'MoveMembers'],
                        },
                        {
                            // El creador de la sala
                            id: userId,
                            type: 1,
                            allow: ['ManageChannels', 'Connect', 'ViewChannel', 'Speak'],
                        }
                    ]
                });
                console.log(`[TempVoice] Sala creada: ${newChannel.id}`);

                // Registrar en la DB
                stmts.addTempChannel(newChannel.id, newState.guild.id, userId);
                stmts.incrementAnalyticsMetric('temp_channels_created', 'global', 1);

                // Usar el voiceState directo desde el cache (más fresco que newState)
                const liveVoiceState = newState.guild.voiceStates.cache.get(userId);
                console.log(`[TempVoice] VoiceState actual: channelId=${liveVoiceState?.channelId}`);

                if (liveVoiceState?.channelId) {
                    try {
                        await liveVoiceState.setChannel(newChannel);
                        console.log(`[TempVoice] ✅ Usuario movido exitosamente a ${newChannel.id}`);
                    } catch (moveError) {
                        console.error('[TempVoice] ❌ Error moviendo usuario:', moveError.message);
                        stmts.removeTempChannel(newChannel.id);
                        await newChannel.delete('Fallo al mover usuario').catch(() => {});
                        return;
                    }
                } else {
                    console.warn('[TempVoice] Usuario ya no está en voz, borrando canal.');
                    stmts.removeTempChannel(newChannel.id);
                    await newChannel.delete('Usuario dejó el canal antes del move').catch(() => {});
                    return;
                }

                // Poner voice status
                const randomStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
                try {
                    await newState.client.rest.put(`/channels/${newChannel.id}/voice-status`, {
                        body: { status: randomStatus }
                    });
                } catch (e) { /* ignorar errores de status */ }

                // Autodestrucción a los 60s si queda vacía
                setTimeout(async () => {
                    try {
                        const checkChannel = await newState.guild.channels.fetch(newChannel.id).catch(() => null);
                        if (checkChannel && checkChannel.members.size === 0) {
                            stmts.removeTempChannel(checkChannel.id);
                            await checkChannel.delete('Autodestrucción 60s sin usuarios').catch(() => {});
                            console.log(`[TempVoice] Canal ${newChannel.id} autodestruido (60s vacío)`);
                        }
                    } catch (e) {}
                }, 60000);

            } catch (error) {
                console.error('[TempVoice] Error creando canal temporal:', error);
            } finally {
                creatingChannelFor.delete(userId);
            }
        }
        // 2. Asignar estado random si es el primero en entrar a un canal normal
        else if (newState.channelId && newState.channelId !== generatorId) {
            const channel = newState.channel;
            const isTemp = channel ? stmts.isTempChannel(channel.id) : false;
            const movedFromGenerator = oldState.channelId === generatorId;

            // Solo asignar si es el primer miembro y NO es una sala temporal (ya tiene su estado asignado al crearse)
            // ni proviene de la creación automática desde el canal generador
            if (channel && channel.members.size === 1 && !isTemp && !movedFromGenerator) {
                const randomStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
                try {
                    await newState.client.rest.put(`/channels/${channel.id}/voice-status`, {
                        body: { status: randomStatus }
                    });
                } catch (e) { /* Ignorar: sin permisos en canales externos */ }
            }
        }

        // 3. Si salió del canal: borrar ÚNICAMENTE canales temporales vacíos
        if (oldState.channelId) {
            const leftChannel = oldState.channel;
            if (leftChannel && leftChannel.members.size === 0) {
                const isRegisteredTemp = stmts.isTempChannel(leftChannel.id);
                const isTempByName = leftChannel.name.startsWith('🔊 Sala de') || leftChannel.name.startsWith('🔊 Sala ');

                // NUNCA borrar canales permanentes fijos del servidor
                const isPermanent = leftChannel.id === generatorId ||
                    leftChannel.name.includes('Lobby') ||
                    leftChannel.name.includes('VIP') ||
                    leftChannel.name.includes('AFK') ||
                    leftChannel.name.includes('Staff');

                if (!isPermanent && (isRegisteredTemp || isTempByName)) {
                    stmts.removeTempChannel(leftChannel.id);
                    stmts.incrementAnalyticsMetric('temp_channels_deleted', 'global', 1);
                    leftChannel.delete('Canal de voz temporal vacío').catch(() => { });
                } else {
                    // Canal permanente normal vacío: limpiar su status con delay
                    setTimeout(async () => {
                        try {
                            await oldState.client.rest.put(`/channels/${leftChannel.id}/voice-status`, {
                                body: { status: "" }
                            });
                        } catch (e) { }
                    }, 1000);
                }
            }
        }

        // ─── LOGS SIMPLIFICADOS (Un solo mensaje al desconectarse) ───
        if (!member.client.globalVoiceSessions) member.client.globalVoiceSessions = new Map();

        const joiningVoiceLog = !oldState.channelId && newState.channelId;
        const leavingVoiceLog = oldState.channelId && !newState.channelId;
        const movingVoiceLog = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

        if (joiningVoiceLog) {
            stmts.incrementAnalyticsMetric('voice_joins', 'global', 1);
            stmts.incrementAnalyticsMetric('voice_channels', newState.channelId, 1);
            
            const logChannel = newState.guild.channels.cache.get(config.CHANNELS.LOGS);
            if (logChannel) {
                const timeEntrada = Math.floor(Date.now() / 1000);
                const embed = new EmbedBuilder()
                    .setAuthor({ name: '🎙️ Actividad de Voz', iconURL: newState.member.user.displayAvatarURL() })
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setDescription(
                        `> **Usuario:** ${newState.member} (\`${userId}\`)\n` +
                        `> **Estado:** 🟢 Conectado\n` +
                        `> **Canal:** <#${newState.channelId}>\n` +
                        `> **Conectó:** <t:${timeEntrada}:T>`
                    )
                    .setFooter({ text: 'Prophet · Log de Voz' })
                    .setTimestamp();
                
                const msg = await logChannel.send({ embeds: [embed] }).catch(() => null);
                member.client.globalVoiceSessions.set(userId, {
                    joinedAt: Date.now(),
                    messageId: msg ? msg.id : null,
                    history: [`🔊 ${newState.channel ? newState.channel.name : 'Canal'}`]
                });
            } else {
                member.client.globalVoiceSessions.set(userId, { joinedAt: Date.now(), history: [`🔊 ${newState.channel ? newState.channel.name : 'Canal'}`] });
            }

        } else if (leavingVoiceLog) {
            stmts.incrementAnalyticsMetric('voice_leaves', 'global', 1);
            
            const session = member.client.globalVoiceSessions.get(userId) || { joinedAt: Date.now(), history: [] };
            member.client.globalVoiceSessions.delete(userId);

            const durationMs = Date.now() - session.joinedAt;
            const durationMins = Math.floor(durationMs / 60000);
            const durationSecs = Math.floor((durationMs % 60000) / 1000);
            
            const timeEntrada = Math.floor(session.joinedAt / 1000);
            const timeSalida = Math.floor(Date.now() / 1000);

            const logChannel = newState.guild.channels.cache.get(config.CHANNELS.LOGS);
            if (logChannel) {
                let msg = null;
                if (session.messageId) {
                    msg = await logChannel.messages.fetch(session.messageId).catch(() => null);
                }

                const channelName = oldState.channel ? oldState.channel.name : 'Canal eliminado';
                const desc = `> **Usuario:** ${newState.member} (\`${userId}\`)\n` +
                    `> **Estado:** 🔴 Desconectado\n` +
                    `> **Último Canal:** 🔊 ${channelName}\n` +
                    (session.history && session.history.length > 1 ? `> **Movimientos:** ${session.history.join(' ➔ ')}\n` : '') +
                    `> **Conectó:** <t:${timeEntrada}:T>\n` +
                    `> **Desconectó:** <t:${timeSalida}:T>\n` +
                    `> **Duración:** ${durationMins} min, ${durationSecs} seg`;

                if (msg) {
                    const embed = EmbedBuilder.from(msg.embeds[0])
                        .setColor(config.COLORES.INFO || 0x42A5F5)
                        .setDescription(desc);
                    await msg.edit({ embeds: [embed] }).catch(() => {});
                } else {
                    const embed = new EmbedBuilder()
                        .setAuthor({ name: '🎙️ Actividad de Voz', iconURL: newState.member.user.displayAvatarURL() })
                        .setColor(config.COLORES.INFO || 0x42A5F5)
                        .setDescription(desc)
                        .setFooter({ text: 'Prophet · Log de Voz' })
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] }).catch(() => {});
                }
            }

        } else if (movingVoiceLog) {
            stmts.incrementAnalyticsMetric('voice_moves', 'global', 1);
            stmts.incrementAnalyticsMetric('voice_channels', newState.channelId, 1);
            
            const session = member.client.globalVoiceSessions.get(userId);
            if (session) {
                if (!session.history) session.history = [];
                session.history.push(`🔊 ${newState.channel ? newState.channel.name : 'Canal'}`);
                if (session.history.length > 6) session.history = session.history.slice(-6); // Mantener últimos 6

                if (session.messageId) {
                    const logChannel = newState.guild.channels.cache.get(config.CHANNELS.LOGS);
                    if (logChannel) {
                        const msg = await logChannel.messages.fetch(session.messageId).catch(() => null);
                        if (msg) {
                            const timeEntrada = Math.floor(session.joinedAt / 1000);
                            const embed = EmbedBuilder.from(msg.embeds[0])
                                .setColor(config.COLORES.WARNING || 0xFFA726)
                                .setDescription(
                                    `> **Usuario:** ${newState.member} (\`${userId}\`)\n` +
                                    `> **Estado:** 🔀 Cambiando de canal\n` +
                                    `> **Canal Actual:** <#${newState.channelId}>\n` +
                                    `> **Movimientos:** ${session.history.join(' ➔ ')}\n` +
                                    `> **Conectó:** <t:${timeEntrada}:T>`
                                );
                            await msg.edit({ embeds: [embed] }).catch(() => {});
                        }
                    }
                }
            }
        }
        } catch (err) {
            console.error('[voiceStateUpdate] Error no manejado:', err.message);
        }
    }
};

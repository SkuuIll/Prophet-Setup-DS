// ═══ EVENTO: voiceStateUpdate (Log de Canales de Voz + Voice XP) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { procesarXPVoz } = require('../modules/leveling');
const { trackVoiceMinutes, updateDailyQuestProgress } = require('../modules/profileSystem');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState) {
        const member = newState.member || oldState.member;
        if (member.user.bot) return;
        const userId = member.id;
        const guild = member.guild;

        // Función ayudante para procesar nivel visualmente
        const manejarSubidaDeNivel = async (member, resultado) => {
            stmts.incrementAnalyticsMetric('level_ups', 'global', 1);
            const { trackLevel } = require('../modules/profileSystem');
            trackLevel(member.id, resultado.nuevoNivel);

            const chatChannel = guild.channels.cache.get(config.CHANNELS.CHAT);
            if (!chatChannel) return;

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.NIVEL || 0xBB86FC)
                .setAuthor({ name: '🎉  ¡Subiste de nivel hablando!' })
                .setDescription(
                    `> ${member.user} subió a **Nivel ${resultado.nuevoNivel}** por su tiempo en canales de voz!\n` +
                    `> ¡Seguí participando para desbloquear más recompensas!`
                )
                .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
                .setFooter({ text: 'Prophet  ·  Sistema de Niveles' })
                .setTimestamp();

            if (resultado.rolNuevo) {
                embed.addFields({
                    name: '🏅 Nuevo rol desbloqueado',
                    value: `> ¡Obtuviste el rol **${resultado.rolNuevo}**!`
                });

                const rol = guild.roles.cache.find(r => r.name === resultado.rolNuevo);
                if (rol) {
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
            try {
                const channelName = `🔊 Sala de ${newState.member.user.username}`;
                const newChannel = await newState.guild.channels.create({
                    name: channelName,
                    type: 2, // GUILD_VOICE
                    parent: categoryId || newState.channel.parentId,
                    permissionOverwrites: [
                        {
                            id: newState.member.user.id,
                            allow: ['ManageChannels', 'ManageRoles', 'Connect', 'ViewChannel'],
                        }
                    ]
                });

                // Registrar en la DB
                stmts.addTempChannel(newChannel.id, newState.guild.id, newState.member.user.id);
                stmts.incrementAnalyticsMetric('temp_channels_created', 'global', 1);

                try {
                    await newState.member.voice.setChannel(newChannel.id);
                } catch (moveError) {
                    // Si falla moverlo, borramos el canal para evitar canales fantasma
                    console.error('Error moviendo usuario a canal temporal:', moveError.message);
                    stmts.removeTempChannel(newChannel.id);
                    await newChannel.delete('Fallo al mover usuario, eliminando canal fantasma').catch(() => {});
                    return; // abort configuration
                }

                const randomStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
                try {
                    await newState.client.rest.put(`/channels/${newChannel.id}/voice-status`, {
                        body: { status: randomStatus }
                    });
                } catch (e) {
                    console.error('Error al setear el voice status por REST:', e.message);
                }

            } catch (error) {
                console.error('Error creando canal temporal:', error);
            }
        }
        // 2. Asignar estado random si es el primero en entrar a un canal normal
        else if (newState.channelId) {
            const channel = newState.channel;
            if (channel && channel.members.size === 1) {
                const randomStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];
                try {
                    await newState.client.rest.put(`/channels/${channel.id}/voice-status`, {
                        body: { status: randomStatus }
                    });
                } catch (e) { /* Ignorar: sin permisos en canales externos */ }
            }
        }

        // 3. Si salió del canal: borrar temporales vacíos usando la DB de referencia
        if (oldState.channelId) {
            const leftChannel = oldState.channel;
            if (leftChannel && leftChannel.members.size === 0) {
                // Verificar si es un canal temporal registrado en la DB
                if (stmts.isTempChannel(leftChannel.id)) {
                    stmts.removeTempChannel(leftChannel.id);
                    stmts.incrementAnalyticsMetric('temp_channels_deleted', 'global', 1);
                    leftChannel.delete('Canal de voz temporal vacío').catch(() => { });
                } else if (leftChannel.parentId === categoryId && leftChannel.id !== generatorId) {
                    // Fallback: si está en la categoría de temporales pero no está en DB (restart)
                    stmts.incrementAnalyticsMetric('temp_channels_deleted', 'global', 1);
                    leftChannel.delete('Canal de voz temporal vacío (sin registro DB)').catch(() => { });
                } else {
                    // Canal normal vacío: limpiar su status con delay para evitar rate limits
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

        // ─── LOGS ───
        const logChannelId = config.CHANNELS.LOGS;
        const logChannel = newState.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setAuthor({ name: '🎙️ Actividad de Voz', iconURL: newState.member.user.displayAvatarURL() })
            .setFooter({ text: 'Prophet · Log de Voz' })
            .setTimestamp();

        // Join
        if (!oldState.channelId && newState.channelId) {
            stmts.incrementAnalyticsMetric('voice_joins', 'global', 1);
            stmts.incrementAnalyticsMetric('voice_channels', newState.channelId, 1);
            embed.setColor(config.COLORES.SUCCESS || 0x69F0AE);
            embed.setDescription(`> 📥 ${newState.member} **entró** al canal de voz <#${newState.channelId}>`);
        }
        // Leave
        else if (oldState.channelId && !newState.channelId) {
            stmts.incrementAnalyticsMetric('voice_leaves', 'global', 1);
            embed.setColor(config.COLORES.ERROR || 0xEF5350);
            embed.setDescription(`> 📤 ${newState.member} **salió** del canal de voz <#${oldState.channelId}>`);
        }
        // Move
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            stmts.incrementAnalyticsMetric('voice_moves', 'global', 1);
            stmts.incrementAnalyticsMetric('voice_channels', newState.channelId, 1);
            embed.setColor(config.COLORES.INFO || 0x42A5F5);
            embed.setDescription(`> 🔀 ${newState.member} **se movió** de canal de voz\n> De: <#${oldState.channelId}>\n> A: <#${newState.channelId}>`);
        } else {
            return; // Muteds, deafens, streams etc.
        }

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};

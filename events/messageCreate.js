// ═══ EVENTO: messageCreate (XP + Anti-spam + AFK + Counting) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { verificarSpam } = require('../modules/antispam');
const { procesarXP } = require('../modules/leveling');
const { preguntarAIA, preguntarConVision } = require('../modules/aiChat');
const { procesarAutoRespuesta } = require('../modules/autoResponder');
const { trackMessage, trackLevel, updateDailyQuestProgress, trackStreak } = require('../modules/profileSystem');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        try {
        if (message.author.bot || !message.guild) return;

        stmts.incrementAnalyticsMetric('messages_total', 'global', 1);
        stmts.incrementAnalyticsMetric('messages_channel', message.channelId, 1);

        // ═══ COUNTING GAME ═══
        const countingChannelId = stmts.getConfig('COUNTING_CHANNEL')?.value;

        if (countingChannelId && message.channel.id === countingChannelId) {
            const currentCount = stmts.getConfig('COUNTING_CURRENT')?.value || 0;
            const lastUser = stmts.getConfig('COUNTING_LAST_USER')?.value;
            const number = parseInt(message.content);

            if (isNaN(number)) return;

            if (message.author.id === lastUser) {
                await message.react('❌');
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription(`> 🚫 **${message.author}**, ¡no podés contar dos veces seguidas!\n> La racha se reinició a **0**. 😭`)
                    .setFooter({ text: 'Prophet  ·  Juego de Contar' });
                await message.channel.send({ embeds: [embed] });
                stmts.setConfig('COUNTING_CURRENT', 0);
                stmts.setConfig('COUNTING_LAST_USER', null);
                return;
            }

            if (number === currentCount + 1) {
                await message.react('✅');
                stmts.setConfig('COUNTING_CURRENT', number);
                stmts.setConfig('COUNTING_LAST_USER', message.author.id);

                // Celebración cada 100 números
                if (number % 100 === 0) {
                    const embed = new EmbedBuilder()
                        .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                        .setDescription(`> 🎉 **¡Increíble!** Llegamos a **${number}**. ¡Sigan así!`)
                        .setFooter({ text: 'Prophet  ·  Juego de Contar' });
                    message.channel.send({ embeds: [embed] });
                }
            } else {
                await message.react('❌');
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription(`> 💥 **${message.author}** rompió la racha al decir **${number}**.\n> Íbamos por el **${currentCount + 1}**. Reiniciamos a **0**.`)
                    .setFooter({ text: 'Prophet  ·  Juego de Contar' });
                await message.channel.send({ embeds: [embed] });
                stmts.setConfig('COUNTING_CURRENT', 0);
                stmts.setConfig('COUNTING_LAST_USER', null);
            }
            return;
        }

        // ═══ SISTEMA AFK ═══

        // 1. Si el autor estaba AFK, quitarlo y mostrar resumen
        if (message.client.afk.has(message.author.id)) {
            const afkData = message.client.afk.get(message.author.id);
            message.client.afk.delete(message.author.id);

            try {
                if (message.member.displayName.startsWith('[AFK] ')) {
                    await message.member.setNickname(message.member.displayName.replace('[AFK] ', ''));
                }
                const tiempoAFK = Math.floor((Date.now() - afkData.timestamp) / 1000);
                let duracion = `${tiempoAFK}s`;
                if (tiempoAFK >= 3600) duracion = `${Math.floor(tiempoAFK / 3600)}h ${Math.floor((tiempoAFK % 3600) / 60)}m`;
                else if (tiempoAFK >= 60) duracion = `${Math.floor(tiempoAFK / 60)}m ${tiempoAFK % 60}s`;

                // Resumen de menciones recibidas
                const mentions = afkData.mentions || [];
                let mentionSummary = '';
                if (mentions.length > 0) {
                    const shown = mentions.slice(0, 5);
                    mentionSummary = '\n\n> 📬 **Mientras no estabas te mencionaron:**\n' +
                        shown.map(m =>
                            `> • **${m.from}** en <#${m.channel}> — *"${m.preview.slice(0, 60)}${m.preview.length > 60 ? '...' : ''}"*`
                        ).join('\n');
                    if (mentions.length > 5) {
                        mentionSummary += `\n> *...y ${mentions.length - 5} más*`;
                    }
                }

                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setDescription(
                        `> 👋 **¡Bienvenido de vuelta, ${message.author}!**\n` +
                        `> Estuviste AFK por \`${duracion}\`.` +
                        (mentions.length > 0 ? ` (${mentions.length} mencion${mentions.length !== 1 ? 'es' : ''})` : '') +
                        mentionSummary
                    )
                    .setFooter({ text: 'Prophet  ·  Sistema AFK' });

                const welcomeMsg = await message.reply({ embeds: [embed] });
                setTimeout(() => welcomeMsg.delete().catch(() => { }), mentions.length > 0 ? 15000 : 8000);
            } catch (e) { console.debug('[AFK] Error enviando mensaje de bienvenida:', e.message); }
        }

        // 2. Si mencionan a un usuario AFK, trackear la mención
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(user => {
                const afkData = message.client.afk.get(user.id);
                if (afkData && user.id !== message.author.id) {
                    // Trackear mención (máx 20)
                    if (!afkData.mentions) afkData.mentions = [];
                    if (afkData.mentions.length < 20) {
                        afkData.mentions.push({
                            from: message.author.username,
                            channel: message.channel.id,
                            timestamp: Date.now(),
                            preview: message.content.replace(/<@!?\d+>/g, '').trim() || '[archivo/embed]'
                        });
                    }

                    const embed = new EmbedBuilder()
                        .setColor(config.COLORES.WARN || 0xFFB74D)
                        .setDescription(`> 💤 **${user.username}** está AFK: *${afkData.reason}*\n> Ausente desde <t:${Math.floor(afkData.timestamp / 1000)}:R>`)
                        .setFooter({ text: 'Prophet  ·  Sistema AFK' });

                    message.reply({ embeds: [embed] })
                        .then(m => setTimeout(() => m.delete().catch(() => { }), 10000));
                }
            });
        }

        // ═══ ANTI-SPAM ═══
        const spam = verificarSpam(message);
        if (spam.esSpam) {
            try { await message.delete(); } catch (e) { console.debug('[AntiSpam] Error borrando mensaje:', e.message); }
            try { await message.member.timeout(config.ANTISPAM.MUTE_DURACION, `AutoMod: ${spam.razon}`); } catch (e) { console.debug('[AntiSpam] Error silenciando usuario:', e.message); }

            try {
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '🛡️  AutoMod — Prophet' })
                    .setDescription(
                        `> ${message.author}, fuiste silenciado por **${config.ANTISPAM.MUTE_DURACION / 60000} minutos**.\n` +
                        `> **Motivo:** ${spam.razon}`
                    )
                    .setFooter({ text: 'Prophet  ·  Protección automática' })
                    .setTimestamp();

                const canal = message.channel;
                const aviso = await canal.send({ embeds: [embed] });
                setTimeout(() => aviso.delete().catch(() => { }), 10000);
            } catch (e) { console.debug('[AntiSpam] Error enviando aviso:', e.message); }

            // Log
            const logChannel = message.guild.channels.cache.get(config.CHANNELS.LOGS);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.COLORES.WARN || 0xFFB74D)
                    .setAuthor({ name: '🛡️  AutoMod — Acción ejecutada' })
                    .setDescription(
                        `> **Usuario:** ${message.author.tag} (\`${message.author.id}\`)\n` +
                        `> **Acción:** Timeout ${config.ANTISPAM.MUTE_DURACION / 60000}min\n` +
                        `> **Motivo:** ${spam.razon}\n` +
                        `> **Canal:** ${message.channel}`
                    )
                    .setFooter({ text: 'Prophet  ·  Log de AutoMod' })
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }
            stmts.incrementAnalyticsMetric('automod_actions', 'global', 1);
            return;
        }

        // ═══ @MENCIÓN O RESPUESTA DIRECTA → RESPUESTA CON IA ═══
        const esRespuesta = message.reference && message.mentions.repliedUser?.id === message.client.user.id;
        const fueMencionado = message.mentions.has(message.client.user) || esRespuesta;
        if (fueMencionado) {
            // Extraer el texto sin la mención
            const textoSinMencion = message.content
                .replace(/<@!?\d+>/g, '')
                .trim();

            const attachment = message.attachments.find(a => a.contentType?.startsWith('image/'));

            if (!textoSinMencion && !attachment) {
                // Mencionaron al bot sin texto y sin imagen → respuesta rápida
                const respuestasRapidas = [
                    `¡Acá estoy, ${message.author.username}! 👋 ¿En qué te ayudo? Podés preguntarme lo que sea.`,
                    `¡Me llamaste? 🎮 ¿Qué necesitás?`,
                    `¡Presente! 🤖 Preguntame lo que quieras.`,
                    `¡Hola! ¿Cómo te puedo ayudar? También tenés /ayuda para ver todos los comandos.`,
                ];
                stmts.incrementAnalyticsMetric('ai_replies', 'mention_quick', 1);
                return message.reply(respuestasRapidas[Math.floor(Math.random() * respuestasRapidas.length)]);
            }

            // Tiene texto o imagen → usar IA
            try {
                const typing = message.channel.sendTyping();
                const contexto = `Servidor: ${message.guild.name}, usuario: ${message.author.username}`;
                
                let respuesta;
                if (attachment) {
                    respuesta = await preguntarConVision(message.channel.id, textoSinMencion || '¿Qué opinás de esta imagen?', attachment.url, contexto);
                    stmts.incrementAnalyticsMetric('ai_replies', 'vision_mention', 1);
                } else {
                    respuesta = await preguntarAIA(message.channel.id, textoSinMencion, contexto);
                    stmts.incrementAnalyticsMetric('ai_replies', 'direct_mention', 1);
                }
                
                await typing;
                return message.reply({ content: respuesta });
            } catch (e) {
                stmts.incrementAnalyticsMetric('error_events', 'ai', 1);
                console.error('[AI mention]', e.message);
                return message.reply('Lo siento, no puedo responder ahora mismo 😅');
            }
        }

        // ═══ AUTO-RESPUESTAS INTELIGENTES ═══
        // Solo en canales de chat (no en bots/logs/staff)
        const esCanal = !message.channel.name?.includes('log') &&
            !message.channel.name?.includes('bot') &&
            !message.channel.name?.includes('staff') &&
            !message.channel.name?.includes('reporte');

        if (esCanal && message.content.length > 3) {
            const autoResp = procesarAutoRespuesta(message.content);
            if (autoResp) {
                stmts.incrementAnalyticsMetric('auto_responses', 'global', 1);
                // Pequeño delay para que parezca más natural
                setTimeout(() => message.channel.send(autoResp).catch(() => { }), 800);
            }
        }

        // ═══ AUTO-INTERVENCIÓN Y VISIÓN (BOT OPINA SOLO) ═══
        // SOLO en el canal #chat (💬・chat)
        const esCanalChat = config.CHANNELS.CHAT && message.channel.id === config.CHANNELS.CHAT;

        if (esCanalChat && !message.author.bot && !message.content.startsWith('/')) {
            const attachment = message.attachments.find(a => a.contentType?.startsWith('image/'));

            // 1. Visión (Si mandan una imagen)
            if (attachment) {
                let typingInterval = null;
                try {
                    typingInterval = setInterval(() => {
                        message.channel.sendTyping().catch(() => { });
                    }, 8000);
                    message.channel.sendTyping().catch(() => { });

                    const contexto = `El usuario ${message.author.username} mandó esta imagen al chat general. Comentá o burlate de la imagen.`;
                    const resVision = await preguntarConVision(message.channel.id, message.content || '¿Qué opinás de esta imagen?', attachment.url, contexto);

                    stmts.incrementAnalyticsMetric('ai_replies', 'vision_auto', 1);
                    return setTimeout(() => message.reply(resVision).catch(() => { }), 1000);
                } catch (e) {
                    stmts.incrementAnalyticsMetric('error_events', 'ai', 1);
                    console.error('Error Vision Auto:', e.message);
                } finally {
                    if (typingInterval) clearInterval(typingInterval);
                }
            }
            // 2. Intervención espontánea de texto (80% chance)
            else if (message.content.length > 10 && Math.random() < 0.35) {
                try {
                    await message.channel.sendTyping();
                    const contexto = `El usuario ${message.author.username} dijo esto en el chat. Metete en la conversación como si fueras un usuario más. Opiná, bardeá o bromeá sobre lo que dijo. SE BREVE y directo, como si estuvieras charlando.`;
                    const resAuto = await preguntarAIA(message.channel.id, message.content, contexto);
                    stmts.incrementAnalyticsMetric('ai_replies', 'chat_auto', 1);
                    // send() en lugar de reply para que parezca más natural (como un usuario mandando un mensaje general)
                    return setTimeout(() => message.channel.send(resAuto).catch(() => { }), 1500);
                } catch (e) {
                    stmts.incrementAnalyticsMetric('error_events', 'ai', 1);
                    console.error('Error Auto Chat:', e.message);
                }
            }
        }

        // ═══ SISTEMA DE XP ═══
        const resultado = procesarXP(message.author.id);

        // ═══ TRACKING DE PERFILES AVANZADOS ═══
        // Actualizar racha de mensajes
        const streakResult = stmts.updateMessageStreak(message.author.id);
        if (streakResult.updated && streakResult.streak > 0) {
            trackStreak(message.author.id, streakResult.streak);
        }

        // Track progreso de mensajes para badges/achievements
        trackMessage(message.author.id);

        // Actualizar misiones diarias de mensajes
        updateDailyQuestProgress(message.author.id, 'daily_messages', 1);

        if (resultado.subioNivel) {
            stmts.incrementAnalyticsMetric('level_ups', 'global', 1);

            // Track progreso de nivel para badges/achievements
            trackLevel(message.author.id, resultado.nuevoNivel);

            // Mensajes dinámicos según hito de nivel
            const lvl = resultado.nuevoNivel;
            let levelTitle = '🎉  ¡Subiste de nivel!';
            let levelDesc = `> ${message.author} subió a **Nivel ${lvl}**!\n> ¡Seguí participando para desbloquear más recompensas!`;

            if (lvl === 5) {
                levelTitle = '🌱  ¡Primer logro desbloqueado!';
                levelDesc = `> ${message.author} alcanzó **Nivel 5** — ¡ya no sos nuevo acá!\n> La comunidad te da la bienvenida al club de los activos. 👏`;
            } else if (lvl === 10) {
                levelTitle = '📚  ¡Nivel 10 — Aprendiz!';
                levelDesc = `> ${message.author} alcanzó **Nivel 10** — ¡el camino recién empieza!\n> Ya ganaste respeto en Prophet Gaming. 👊`;
            } else if (lvl === 25) {
                levelTitle = '⚔️  ¡Nivel 25 — Veterano!';
                levelDesc = `> ${message.author} alcanzó **Nivel 25** — ¡leyenda creciente!\n> Los nuevos van a querer ser como vos. 🔥`;
            } else if (lvl === 50) {
                levelTitle = '👑  ¡Nivel 50 — ÉLITE del servidor!';
                levelDesc = `> ${message.author} alcanzó **Nivel 50** — ¡un verdadero pilar del servidor!\n> Mitad del camino a la leyenda absoluta. 🏆`;
            } else if (lvl === 100) {
                levelTitle = '🏆  ¡NIVEL 100 — LEYENDA ABSOLUTA!';
                levelDesc = `> 🔔 ${message.author} alcanzó **Nivel 100** — ¡IMPARABLE!\n> Sos oficialmente una leyenda de Prophet Gaming. Todo el servidor te saluda. 🙌`;
            } else if (lvl % 10 === 0) {
                levelTitle = `⭐  ¡Nivel ${lvl} — Hito Desbloqueado!`;
                levelDesc = `> ${message.author} alcanzó **Nivel ${lvl}** — ¡sigue imárarable!\n> Cada nivel es un paso más en la historia de Prophet. 🚀`;
            }

            const embed = new EmbedBuilder()
                .setColor(lvl >= 50 ? 0xFFD700 : lvl >= 25 ? 0xE040FB : config.COLORES.NIVEL || 0xBB86FC)
                .setAuthor({ name: levelTitle })
                .setDescription(levelDesc)
                .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
                .setFooter({ text: `Prophet  ·  Sistema de Niveles  ·  Nivel ${lvl}` })
                .setTimestamp();

            if (resultado.rolNuevo) {
                embed.addFields({
                    name: '🏅 Nuevo rol desbloqueado',
                    value: `> ¡Obtuviste el rol **${resultado.rolNuevo}**!`
                });

                const rol = message.guild.roles.cache.find(r => r.name === resultado.rolNuevo);
                const rolesProtegidosIds = [config.ROLES.PROPHET, config.ROLES.STAFF, config.ROLES.MODERADOR, config.ROLES.VIP, config.ROLES.BOTS].filter(Boolean);
                if (rol && message.member && !rolesProtegidosIds.includes(rol.id)) {
                    try {
                        await message.member.roles.add(rol, `Subió a nivel ${resultado.nuevoNivel}`);
                    } catch (e) {
                        console.error('Error asignando rol de nivel:', e.message);
                    }
                }
            }

            // Enviar al canal de bienvenida/general, no en el canal donde escribió
            const levelUpChannel = message.guild.channels.cache.get(config.CHANNELS.BIENVENIDOS)
                || message.guild.channels.cache.get(config.CHANNELS.CHAT);
            if (levelUpChannel) {
                levelUpChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
        } catch (err) {
            console.error('[messageCreate] Error no manejado:', err.message);
        }
    }
};

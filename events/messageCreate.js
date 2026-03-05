// ═══ EVENTO: messageCreate (XP + Anti-spam + AFK + Counting) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { verificarSpam } = require('../modules/antispam');
const { procesarXP } = require('../modules/leveling');
const { preguntarAIA, preguntarConVision } = require('../modules/aiChat');
const { procesarAutoRespuesta } = require('../modules/autoResponder');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

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

        // 1. Si el autor estaba AFK, quitarlo
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

                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setDescription(`> 👋 **¡Bienvenido de vuelta, ${message.author}!**\n> Estuviste AFK por \`${duracion}\`.`)
                    .setFooter({ text: 'Prophet  ·  Sistema AFK' });

                const welcomeMsg = await message.reply({ embeds: [embed] });
                setTimeout(() => welcomeMsg.delete().catch(() => { }), 8000);
            } catch (e) { console.debug('[AFK] Error enviando mensaje de bienvenida:', e.message); }
        }

        // 2. Si mencionan a un usuario AFK
        if (message.mentions.users.size > 0) {
            message.mentions.users.forEach(user => {
                const afkData = message.client.afk.get(user.id);
                if (afkData && user.id !== message.author.id) {
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
            return;
        }

        // ═══ @MENCIÓN → RESPUESTA CON IA (GEMINI) ═══
        const fueMencionado = message.mentions.has(message.client.user);
        if (fueMencionado) {
            // Extraer el texto sin la mención
            const textoSinMencion = message.content
                .replace(/<@!?\d+>/g, '')
                .trim();

            if (!textoSinMencion) {
                // Mencionaron al bot sin texto → respuesta rápida
                const respuestasRapidas = [
                    `¡Acá estoy, ${message.author.username}! 👋 ¿En qué te ayudo? Podés preguntarme lo que sea.`,
                    `¡Me llamaste? 🎮 ¿Qué necesitás?`,
                    `¡Presente! 🤖 Preguntame lo que quieras.`,
                    `¡Hola! ¿Cómo te puedo ayudar? También tenés /ayuda para ver todos los comandos.`,
                ];
                return message.reply(respuestasRapidas[Math.floor(Math.random() * respuestasRapidas.length)]);
            }

            // Tiene texto → usar IA
            try {
                const typing = message.channel.sendTyping();
                const contexto = `Servidor: ${message.guild.name}, usuario: ${message.author.username}`;
                const respuesta = await preguntarAIA(message.channel.id, textoSinMencion, contexto);
                await typing;
                return message.reply({ content: respuesta });
            } catch (e) {
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
                // Pequeño delay para que parezca más natural
                setTimeout(() => message.channel.send(autoResp).catch(() => { }), 800);
            }
        }

        // ═══ AUTO-INTERVENCIÓN Y VISIÓN (BOT OPINA SOLO) ═══
        if (esCanal && !message.author.bot && !message.content.startsWith('/')) {
            const attachment = message.attachments.find(a => a.contentType?.startsWith('image/'));

            // 1. Visión (Si mandan una imagen)
            if (attachment) {
                // 20% de chances de reaccionar espontáneamente a una imagen
                if (Math.random() < 0.20) {
                    try {
                        const typing = message.channel.sendTyping();
                        const contexto = `El usuario ${message.author.username} mandó esta imagen al chat general. Comentá o burlate de la imagen.`;
                        const resVision = await preguntarConVision(message.channel.id, message.content || '¿Qué opinás de esta imagen?', attachment.url, contexto);
                        await typing;
                        return setTimeout(() => message.reply(resVision).catch(() => { }), 1000);
                    } catch (e) { console.error('Error Vision Auto:', e.message); }
                }
            }
            // 2. Intervención espontánea de texto (5% chance)
            else if (message.content.length > 5 && Math.random() < 0.05) {
                try {
                    const typing = message.channel.sendTyping();
                    const contexto = `El usuario ${message.author.username} dijo esto en el chat. Metete en la conversación como si fueras un usuario más. Opiná, bardeá o bromeá sobre lo que dijo. SE BREVE y directo, como si estuvieras charlando.`;
                    const resAuto = await preguntarAIA(message.channel.id, message.content, contexto);
                    await typing;
                    // send() en lugar de reply para que parezca más natural (como un usuario mandando un mensaje general)
                    return setTimeout(() => message.channel.send(resAuto).catch(() => { }), 1500);
                } catch (e) { console.error('Error Auto Chat:', e.message); }
            }
        }

        // ═══ SISTEMA DE XP ═══
        const resultado = procesarXP(message.author.id);

        if (resultado.subioNivel) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.NIVEL || 0xBB86FC)
                .setAuthor({ name: '🎉  ¡Subiste de nivel!' })
                .setDescription(
                    `> ${message.author} subió a **Nivel ${resultado.nuevoNivel}**!\n` +
                    `> ¡Seguí participando para desbloquear más recompensas!`
                )
                .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
                .setFooter({ text: 'Prophet  ·  Sistema de Niveles' })
                .setTimestamp();

            if (resultado.rolNuevo) {
                embed.addFields({
                    name: '🏅 Nuevo rol desbloqueado',
                    value: `> ¡Obtuviste el rol **${resultado.rolNuevo}**!`
                });

                const rol = message.guild.roles.cache.find(r => r.name === resultado.rolNuevo);
                if (rol && message.member) {
                    try {
                        await message.member.roles.add(rol, `Subió a nivel ${resultado.nuevoNivel}`);
                    } catch (e) {
                        console.error('Error asignando rol de nivel:', e.message);
                    }
                }
            }

            message.channel.send({ embeds: [embed] });
        }
    }
};

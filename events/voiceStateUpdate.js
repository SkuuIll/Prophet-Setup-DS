// ═══ EVENTO: voiceStateUpdate (Log de Canales de Voz) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState) {
        if (newState.member.user.bot) return;

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
                            allow: ['ManageChannels', 'ManageRoles'],
                        }
                    ]
                });

                // Registrar en la DB
                stmts.addTempChannel(newChannel.id, newState.guild.id, newState.member.user.id);

                await newState.member.voice.setChannel(newChannel.id);

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
                    leftChannel.delete('Canal de voz temporal vacío').catch(() => { });
                } else if (leftChannel.parentId === categoryId && leftChannel.id !== generatorId) {
                    // Fallback: si está en la categoría de temporales pero no está en DB (restart)
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
            embed.setColor(config.COLORES.SUCCESS || 0x69F0AE);
            embed.setDescription(`> 📥 ${newState.member} **entró** al canal de voz <#${newState.channelId}>`);
        }
        // Leave
        else if (oldState.channelId && !newState.channelId) {
            embed.setColor(config.COLORES.ERROR || 0xEF5350);
            embed.setDescription(`> 📤 ${newState.member} **salió** del canal de voz <#${oldState.channelId}>`);
        }
        // Move
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            embed.setColor(config.COLORES.INFO || 0x42A5F5);
            embed.setDescription(`> 🔀 ${newState.member} **se movió** de canal de voz\n> De: <#${oldState.channelId}>\n> A: <#${newState.channelId}>`);
        } else {
            return; // Muteds, deafens, streams etc.
        }

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};

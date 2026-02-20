// ═══ EVENTO: voiceStateUpdate (Log de Canales de Voz) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'voiceStateUpdate',
    once: false,
    async execute(oldState, newState) {
        if (newState.member.user.bot) return;

        // ---------- LOGIC DE JOINT-TO-CREATE ----------
        const { stmts } = require('../database');

        // El id del canal que "genera" las salas, tomado de la DB
        const configData = stmts.getConfig('voice_generator_id');
        const generatorId = configData ? configData.value : null;
        const configCat = stmts.getConfig('voice_category_id');
        const categoryId = configCat ? configCat.value : null;

        const STATUSES = [
            '💎 VIP Lounge',
            '🎮 Puro Tryhard',
            '🔥 En racha positiva',
            '🎶 Charla y música',
            '👽 Teorías conspirativas',
            '🍺 Chill y relax',
            '💥 Rompiéndola toda',
            '😴 Modo AFK / Descanso',
            '🌟 Partidas épicas',
            '🔪 Modo Sigilo',
            '🏎️ Acelerando a fondo',
            '👻 Cazando fantasmas',
            '🧙‍♂️ Lanzando hechizos',
            '🚀 Rumbo a la luna',
            '🍕 Comiendo pizza',
            '🎙️ Podcast en vivo',
            '😎 Puros pros acá',
            '🤡 Troleando un rato',
            '🛠️ Construyendo cosas',
            '🎯 Apuntando cabezas',
            '🧗‍♂️ Escalando de rango',
            '🕵️‍♂️ Modo Investigador',
            '🌌 Explorando el universo',
            '👾 Matando marcianos'
        ];

        // Si entró a un canal de voz y es el canal generador
        if (newState.channelId && newState.channelId === generatorId) {
            try {
                // Crear canal temporal
                const channelName = `🔊 Sala de ${newState.member.user.username}`;
                const newChannel = await newState.guild.channels.create({
                    name: channelName,
                    type: 2, // GUILD_VOICE
                    parent: categoryId || newState.channel.parentId, // Mismo padre que el generador
                    permissionOverwrites: [
                        {
                            id: newState.member.user.id,
                            allow: ['ManageChannels', 'ManageRoles'], // Permitirle al dueño administrar SU canal
                        }
                    ]
                });

                // Mover al usuario al canal recién creado
                await newState.member.voice.setChannel(newChannel.id);

                // Asignarle un estado al azar al canal de voz usando @discordjs/voice para entrar 1 seg
                const { joinVoiceChannel } = require('@discordjs/voice');
                const randomStatus = STATUSES[Math.floor(Math.random() * STATUSES.length)];

                try {
                    const connection = joinVoiceChannel({
                        channelId: newChannel.id,
                        guildId: newChannel.guild.id,
                        adapterCreator: newChannel.guild.voiceAdapterCreator,
                        selfDeaf: true,
                        selfMute: true
                    });

                    setTimeout(async () => {
                        try {
                            await newState.client.rest.put(`/channels/${newChannel.id}/voice-status`, {
                                body: { status: randomStatus }
                            });
                        } catch (e) {
                            console.error('Error al setear el voice status:', e.message);
                        }
                        // Desconectamos para que salga del canal
                        connection.destroy();
                    }, 500); // 0.5 segundos después de entrar

                } catch (e) {
                    console.error('Error conectando temporalmente:', e.message);
                }

            } catch (error) {
                console.error('Error creando canal temporal:', error);
            }
        }

        // Si salió del canal, checkear el canal que dejó
        if (oldState.channelId) {
            const leftChannel = oldState.channel;
            if (leftChannel
                && leftChannel.parentId === categoryId
                && leftChannel.id !== generatorId
                && leftChannel.members.size === 0) {
                // El canal pertenece a la categoría de temporales, no es el maestro, y quedó vacío. Lo borramos.
                leftChannel.delete('Canal de voz temporal vacío').catch(() => { });
            }
        }
        // ---------- FIN LOGIC JOINT-TO-CREATE ----------

        // Logs originales
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
            return; // Muteds, deafens, streams etc, no queremos spam.
        }

        logChannel.send({ embeds: [embed] }).catch(() => { });
    }
};

// ═══ EVENTO: messageCreate (XP + Anti-spam) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { verificarSpam } = require('../modules/antispam');
const { procesarXP } = require('../modules/leveling');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // ═══ ANTI-SPAM ═══
        const spam = verificarSpam(message);
        if (spam.esSpam) {
            try {
                await message.delete();
            } catch (e) { }

            try {
                await message.member.timeout(config.ANTISPAM.MUTE_DURACION, `AutoMod: ${spam.razon}`);
            } catch (e) { }

            // Notificar al usuario
            try {
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.ERROR)
                    .setDescription(`⚠️ ${message.author}, fuiste silenciado por **${config.ANTISPAM.MUTE_DURACION / 60000} minutos**.\n**Razón:** ${spam.razon}`)
                    .setFooter({ text: 'Prophet Gaming | AutoMod' });

                const canal = message.channel;
                const aviso = await canal.send({ embeds: [embed] });
                setTimeout(() => aviso.delete().catch(() => { }), 10000);
            } catch (e) { }

            // Log
            const logChannel = message.guild.channels.cache.get(config.CHANNELS.LOGS);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.COLORES.WARN)
                    .setTitle('🛡️ AutoMod')
                    .setDescription(`**Usuario:** ${message.author.tag} (${message.author.id})\n**Acción:** Timeout ${config.ANTISPAM.MUTE_DURACION / 60000}min\n**Razón:** ${spam.razon}\n**Canal:** ${message.channel}`)
                    .setTimestamp();
                logChannel.send({ embeds: [logEmbed] });
            }
            return;
        }

        // ═══ SISTEMA DE XP ═══
        const resultado = procesarXP(message.author.id);

        if (resultado.subioNivel) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.NIVEL)
                .setTitle('🎉 ¡Subiste de nivel!')
                .setDescription(`${message.author} subió a **Nivel ${resultado.nuevoNivel}**!`)
                .setThumbnail(message.author.displayAvatarURL({ size: 64 }))
                .setFooter({ text: 'Prophet Gaming | Niveles' });

            if (resultado.rolNuevo) {
                embed.addFields({ name: '🎭 Nuevo rol desbloqueado', value: resultado.rolNuevo });

                // Asignar el rol
                const rol = message.guild.roles.cache.find(r => r.name === resultado.rolNuevo);
                if (rol && message.member) {
                    try {
                        await message.member.roles.add(rol, `Subió a nivel ${resultado.nuevoNivel}`);
                    } catch (e) {
                        console.error('Error asignando rol de nivel:', e.message);
                    }
                }
            }

            message.channel.send({ embeds: [embed] }).then(msg => {
                setTimeout(() => msg.delete().catch(() => { }), 15000);
            });
        }
    }
};

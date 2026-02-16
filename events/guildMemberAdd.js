// ═══ EVENTO: guildMemberAdd (Bienvenida) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { verificarRaid } = require('../modules/antispam');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        // Anti-raid
        const raid = verificarRaid(member);
        if (raid.esRaid) {
            const logChannel = member.guild.channels.cache.get(config.CHANNELS.LOGS);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES.ERROR)
                    .setTitle('🚨 ¡POSIBLE RAID DETECTADO!')
                    .setDescription(raid.razon)
                    .setTimestamp();
                logChannel.send({ embeds: [embed] });
            }
        }

        // Asignar rol Nuevo
        if (config.ROLES.NUEVO) {
            try {
                await member.roles.add(config.ROLES.NUEVO, 'Nuevo miembro');
            } catch (e) {
                console.error('Error asignando rol:', e.message);
            }
        }

        // Asignar rol Bots
        if (member.user.bot && config.ROLES.BOTS) {
            try {
                await member.roles.add(config.ROLES.BOTS, 'Bot detectado');
            } catch (e) { }
            return; // No enviar bienvenida a bots
        }

        // Embed de bienvenida
        const welcomeChannel = member.guild.channels.cache.get(config.CHANNELS.BIENVENIDOS);
        if (!welcomeChannel) return;

        const { AttachmentBuilder } = require('discord.js');
        const banner = new AttachmentBuilder(config.ASSETS.BANNER, { name: 'banner.png' });
        const logo = new AttachmentBuilder(config.ASSETS.LOGO, { name: 'logo.png' });

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle(`✨ ¡Bienvenido/a a ${member.guild.name}!`)
            .setDescription(
                `¡Hola ${member}! 👋 Nos alegra mucho tenerte con nosotros.\n` +
                `Sos el miembro **#${member.guild.memberCount}** de la comunidad Prophet. 🎉\n\n` +
                `**📜 Primeros Pasos para empezar:**\n` +
                `> 📌 Leé las **reglas** en <#${config.CHANNELS.REGLAS}>\n` +
                `> 💬 Presentate en el chat y contanos qué jugás\n` +
                `> 🎮 Unite a las partidas y divertite con la comunidad\n` +
                `> 🎵 Probá los comandos de música y economía\n\n` +
                `*¡Esperamos que la pases genial! Si necesitás ayuda, abrí un ticket.* 🎫`
            )
            .setThumbnail('attachment://logo.png')
            .setImage('attachment://banner.png')
            .setFooter({ text: 'Prophet Gaming | ¡Bienvenido a la familia!', iconURL: 'attachment://logo.png' })
            .setTimestamp();

        welcomeChannel.send({ embeds: [embed], files: [banner, logo] });
    }
};

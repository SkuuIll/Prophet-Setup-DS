// ═══ EVENTO: guildMemberAdd (Bienvenida) ═══

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
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
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '🚨  ALERTA — Posible raid detectado' })
                    .setDescription(`> ${raid.razon}\n\n> Revisá las entradas recientes y considerá activar medidas de seguridad.`)
                    .setFooter({ text: 'Prophet  ·  Anti-Raid' })
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
            return;
        }

        // Embed de bienvenida
        const welcomeChannel = member.guild.channels.cache.get(config.CHANNELS.BIENVENIDOS);
        if (!welcomeChannel) return;

        const banner = new AttachmentBuilder(config.ASSETS.BANNER, { name: 'banner.png' });
        const logo = new AttachmentBuilder(config.ASSETS.LOGO, { name: 'logo.png' });

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: `✨ ¡Nuevo miembro!`, iconURL: 'attachment://logo.png' })
            .setTitle(`¡Bienvenido/a, ${member.user.username}!`)
            .setDescription(
                `Hola ${member}, nos alegra muchísimo tenerte acá. 👋\n` +
                `Sos el miembro **#${member.guild.memberCount}** de la familia Prophet. 🎉\n\n` +
                `**📜 Primeros pasos:**\n` +
                `> 📌 Leé las **reglas** en <#${config.CHANNELS.REGLAS}>\n` +
                `> 💬 Presentate en el chat y contanos qué jugás\n` +
                `> 🎮 Unite a las partidas y divertite con la comunidad\n` +
                `> 🎵 Probá los comandos de música con \`/play\`\n\n` +
                `*¡Esperamos que la pases genial! Si necesitás ayuda, abrí un ticket.* 🎫`
            )
            .setThumbnail(member.user.displayAvatarURL({ size: 256, dynamic: true }))
            .setImage('attachment://banner.png')
            .setFooter({ text: `Prophet Gaming  ·  ¡Bienvenido a la familia!`, iconURL: 'attachment://logo.png' })
            .setTimestamp();

        welcomeChannel.send({ embeds: [embed], files: [banner, logo] });
    }
};

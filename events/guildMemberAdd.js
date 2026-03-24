// ═══ EVENTO: guildMemberAdd (Bienvenida) ═══

const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../config');
const { verificarRaid } = require('../modules/antispam');
const { stmts } = require('../database');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        // Métrica de retención
        stmts.incrementAnalyticsMetric('member_joins', 'global', 1);

        // Anti-raid
        const raid = verificarRaid(member);
        if (raid.esRaid) {
            const logChannel = member.guild.channels.cache.get(config.CHANNELS.LOGS);
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
                logChannel.send({ embeds: [embed] });
            }

            // Subir nivel de verificación a HIGH automáticamente
            try {
                const prevLevel = member.guild.verificationLevel;
                await member.guild.setVerificationLevel(3, 'Anti-Raid: raid detectado automáticamente');
                setTimeout(async () => {
                    try {
                        await member.guild.setVerificationLevel(prevLevel, 'Anti-Raid: restaurado tras 5 minutos');
                        const logCh = member.guild.channels.cache.get(config.CHANNELS.LOGS);
                        if (logCh) logCh.send('> 🔓 **Anti-Raid:** Nivel de verificación restaurado al valor anterior.');
                    } catch (e) { console.error('[AntiRaid] Error restaurando verificación:', e.message); }
                }, 300000);
            } catch (e) {
                console.error('[AntiRaid] Error ajustando nivel de verificación:', e.message);
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
            } catch (e) { console.debug('[Bienvenida] Error asignando rol Bots:', e.message); }
            return;
        }

        // Embed de bienvenida
        const welcomeChannel = member.guild.channels.cache.get(config.CHANNELS.BIENVENIDOS);
        if (!welcomeChannel) return;

        try {
            const { generarBienvenida } = require('../utils/canvas');
            const welcomeBuffer = await generarBienvenida(member);
            const attachment = new AttachmentBuilder(welcomeBuffer, { name: 'bienvenida.png' });

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                .setTitle(`¡Bienvenido/a a la familia, ${member.user.username}!`)
                .setDescription(
                    `Hola ${member}, nos alegra muchísimo tenerte acá. 👋\n\n` +
                    `**📜 Primeros pasos:**\n` +
                    `> 📌 Leé las **reglas** en <#${config.CHANNELS.REGLAS}>\n` +
                    `> 💬 Presentate en el chat y contanos qué jugás\n` +
                    `> 🎮 Unite a las partidas y divertite con la comunidad\n` +
                    `> 🎵 Probá los comandos de música con \`/play\`\n\n` +
                    `*¡Esperamos que la pases genial! Si necesitás ayuda, abrí un ticket.* 🎫`
                )
                .setImage('attachment://bienvenida.png')
                .setFooter({ text: `Prophet Gaming` })
                .setTimestamp();

            welcomeChannel.send({ content: `${member}`, embeds: [embed], files: [attachment] });

            // Iniciar onboarding después de 30 segundos
            setTimeout(async () => {
                try {
                    const { startOnboarding, sendOnboardingStep, getOnboardingProgress } = require('../modules/onboarding');
                    const progress = getOnboardingProgress(member.id);

                    if (!progress.completed) {
                        const result = await sendOnboardingStep(member, 'welcome');
                        if (result) {
                            await member.send({
                                embeds: [result.embed],
                                components: result.components
                            }).catch(() => { });
                        }
                    }
                } catch (e) {
                    console.debug('[Onboarding] No se pudo enviar DM:', e.message);
                }
            }, 30000);

        } catch (error) {
            console.error('Error enviando tarjeta de bienvenida:', error);
            // Fallback si canvas falla o no está instalado correctamente
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                .setTitle(`¡Bienvenido/a, ${member.user.username}!`)
                .setDescription(`Hola ${member}, nos alegra muchísimo tenerte acá. 👋`)
                .setFooter({ text: `Prophet Gaming` })
                .setTimestamp();

            welcomeChannel.send({ content: `${member}`, embeds: [embed] });
        }
    }
};

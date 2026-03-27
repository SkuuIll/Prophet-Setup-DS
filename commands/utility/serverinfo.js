// ═══ COMANDO: /serverinfo — Dashboard del servidor ═══

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config');
const { stmts } = require('../../database');

const VERIFICATION_LEVELS = {
    0: 'Ninguno',
    1: 'Bajo',
    2: 'Medio',
    3: 'Alto',
    4: 'Muy Alto'
};

const BOOST_TIERS = {
    0: 'Sin Nivel',
    1: 'Nivel 1',
    2: 'Nivel 2',
    3: 'Nivel 3'
};

module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('📊 Información completa y estadísticas del servidor'),

    async execute(interaction) {
        await interaction.deferReply();

        const guild = interaction.guild;
        await guild.members.fetch({ force: false }).catch(() => { });

        // Conteos
        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;
        const idle = guild.members.cache.filter(m => m.presence?.status === 'idle').size;
        const dnd = guild.members.cache.filter(m => m.presence?.status === 'dnd').size;
        const offline = totalMembers - online - idle - dnd;

        // Canales
        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const threads = guild.channels.cache.filter(c => c.isThread()).size;

        // Roles
        const totalRoles = guild.roles.cache.size - 1; // quitar @everyone

        // Emojis y stickers
        const animEmojis = guild.emojis.cache.filter(e => e.animated).size;
        const staticEmojis = guild.emojis.cache.filter(e => !e.animated).size;
        const stickers = guild.stickers.cache.size;

        // Fecha de creación
        const createdTs = Math.floor(guild.createdTimestamp / 1000);

        // Boost
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostTier = BOOST_TIERS[guild.premiumTier] || 'Sin Nivel';

        // Owner
        const owner = await guild.fetchOwner().catch(() => null);

        // Barra de estado de miembros
        const onlinePct = Math.round((online / totalMembers) * 100);
        const barLen = 15;
        const onBar = Math.round((online / totalMembers) * barLen);
        const idBar = Math.round((idle / totalMembers) * barLen);
        const dnBar = Math.round((dnd / totalMembers) * barLen);
        const ofBar = barLen - onBar - idBar - dnBar;
        const statusBar = '🟢'.repeat(Math.max(onBar, 0)) + '🟡'.repeat(Math.max(idBar, 0)) + '🔴'.repeat(Math.max(dnBar, 0)) + '⚫'.repeat(Math.max(ofBar, 0));

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 256 }) })
            .setThumbnail(guild.iconURL({ size: 512, dynamic: true }))
            .setDescription(
                `${guild.description || '*Sin descripción del servidor*'}\n\n` +
                `${statusBar}\n` +
                `> 🟢 ${online} online · 🟡 ${idle} idle · 🔴 ${dnd} DnD · ⚫ ${offline} offline`
            )
            .addFields(
                {
                    name: '👥 Miembros',
                    value:
                        `> 👤 Usuarios: **${humans}**\n` +
                        `> 🤖 Bots: **${bots}**\n` +
                        `> 📊 Total: **${totalMembers}**`,
                    inline: true
                },
                {
                    name: '📂 Canales',
                    value:
                        `> 💬 Texto: **${textChannels}**\n` +
                        `> 🔊 Voz: **${voiceChannels}**\n` +
                        `> 📁 Categorías: **${categories}**` +
                        (threads > 0 ? `\n> 🧵 Hilos: **${threads}**` : ''),
                    inline: true
                },
                {
                    name: '🎨 Personalización',
                    value:
                        `> 🏷️ Roles: **${totalRoles}**\n` +
                        `> 😀 Emojis: **${staticEmojis}** + **${animEmojis}** anim.\n` +
                        `> 🖼️ Stickers: **${stickers}**`,
                    inline: true
                },
                {
                    name: '💎 Boosts',
                    value:
                        `> ✨ **${boostCount}** boosts — **${boostTier}**\n` +
                        (boostCount > 0 ? `> ${('🟪'.repeat(Math.min(boostCount, 14)))}` : '> Nadie boosteó todavía'),
                    inline: true
                },
                {
                    name: '⚙️ Configuración',
                    value:
                        `> 🔒 Verificación: **${VERIFICATION_LEVELS[guild.verificationLevel] || 'N/A'}**\n` +
                        `> 👑 Owner: ${owner ? `${owner.user}` : 'N/A'}\n` +
                        `> 📅 Creado: <t:${createdTs}:R>`,
                    inline: true
                }
            )
            .setFooter({ text: `ID: ${guild.id}  ·  Prophet Gaming` })
            .setTimestamp();

        // Agregar banner si existe
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await interaction.editReply({ embeds: [embed] });
    }
};

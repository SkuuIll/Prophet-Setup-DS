// ═══ COMANDO: /userinfo — Info de usuario premium ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const BADGES = {
    Staff: '<:staff:1205553424800583741>',
    Partner: '🤝', HypeSquadOnlineHouse1: '🏠', HypeSquadOnlineHouse2: '🌟',
    HypeSquadOnlineHouse3: '⚖️', BugHunterLevel1: '🐛', BugHunterLevel2: '🐛',
    ActiveDeveloper: '👨‍💻', PremiumEarlySupporter: '📀', VerifiedDeveloper: '✅',
    Nitro: '💎',
};

const STATUS_EMOJI = {
    online: '🟢 Online', idle: '🌙 Ausente',
    dnd: '🔴 No Molestar', offline: '⚫ Desconectado',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('👤 Ver información completa de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id) ||
            await interaction.guild.members.fetch(user.id).catch(() => null);

        await interaction.deferReply();

        // Fetch full user for banner
        const fullUser = await user.fetch(true).catch(() => user);

        // Badges
        const userFlags = fullUser.flags?.toArray() || [];
        const badgeStr = userFlags.map(f => BADGES[f] || '').filter(Boolean).join(' ') || '*Sin insignias*';

        // Antigüedad en el server
        let joinPos = 'N/A';
        if (member) {
            const sorted = [...interaction.guild.members.cache.values()]
                .filter(m => m.joinedTimestamp)
                .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
            const pos = sorted.findIndex(m => m.id === user.id) + 1;
            if (pos > 0) joinPos = `#${pos} de ${sorted.length}`;
        }

        // Status
        const presence = member?.presence;
        const statusStr = STATUS_EMOJI[presence?.status] || STATUS_EMOJI.offline;
        const activity = presence?.activities?.[0];
        let activityStr = '';
        if (activity) {
            if (activity.type === 0) activityStr = `\n> 🎮 Jugando **${activity.name}**`;
            else if (activity.type === 1) activityStr = `\n> 📺 Streameando **${activity.name}**`;
            else if (activity.type === 2) activityStr = `\n> 🎵 Escuchando **${activity.name}**`;
            else if (activity.type === 4) activityStr = `\n> 💬 *${activity.state || activity.name}*`;
        }

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor !== '#000000' ? member?.displayHexColor : config.COLORES.INFO || 0x3498DB)
            .setAuthor({ name: fullUser.globalName || user.username, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ size: 512 }))
            .setDescription(
                `> ${statusStr}${activityStr}\n` +
                `> 🏷️ **Insignias:** ${badgeStr}\n` +
                (user.bot ? '> 🤖 **Bot verificado**\n' : '')
            )
            .addFields(
                { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            );

        if (member) {
            embed.addFields(
                { name: '📥 Se unió', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: '📊 Posición', value: `\`${joinPos}\``, inline: true },
            );

            if (member.nickname) {
                embed.addFields({ name: '✏️ Apodo', value: member.nickname, inline: true });
            }

            if (member.premiumSinceTimestamp) {
                embed.addFields({ name: '💎 Boost', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: true });
            }

            // Roles
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `<@&${r.id}>`)
                .slice(0, 20);
            if (roles.length > 0) {
                embed.addFields({ name: `🏷️ Roles (${member.roles.cache.size - 1})`, value: roles.join(' ') });
            }
        }

        // Nivel + XP
        try {
            const levelData = stmts.getUser(user.id);
            if (levelData && levelData.level > 0) {
                const voiceMins = levelData.voice_minutes || 0;
                const voiceStr = voiceMins >= 60 ? `${Math.floor(voiceMins / 60)}h ${voiceMins % 60}m` : `${voiceMins}m`;
                embed.addFields({
                    name: '📊 Actividad',
                    value:
                        `> 📈 Nv.**${levelData.level}** · \`${(levelData.xp || 0).toLocaleString()} XP\`\n` +
                        `> 💬 \`${(levelData.messages || 0).toLocaleString()}\` msgs · 🎙️ \`${voiceStr}\` en voz\n` +
                        `> 🔥 Racha: \`${levelData.message_streak || 0}\` días · ⭐ Rep: \`${levelData.reputation || 0}\``
                });
            }
        } catch { }

        // Warns
        try {
            const warns = stmts.countWarns(user.id);
            if (warns && warns.total > 0) {
                embed.addFields({ name: '⚠️ Warns', value: `\`${warns.total}\` advertencia${warns.total !== 1 ? 's' : ''}`, inline: true });
            }
        } catch { }

        // Economía
        try {
            const eco = stmts.getEconomy(user.id);
            if (eco && (eco.balance > 0 || eco.bank > 0)) {
                const total = eco.balance + eco.bank;
                const cur = config.ECONOMIA.CURRENCY;
                embed.addFields({
                    name: '💰 Economía',
                    value: `> 💵 \`${cur} ${eco.balance.toLocaleString()}\` · 🏦 \`${cur} ${eco.bank.toLocaleString()}\` · 💎 Total: \`${cur} ${total.toLocaleString()}\``,
                    inline: false
                });
            }
        } catch { }

        // Banner
        if (fullUser.bannerURL?.()) {
            embed.setImage(fullUser.bannerURL({ size: 1024 }));
        }

        embed.setFooter({ text: 'Prophet Gaming  ·  User Info' }).setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

// ═══ COMANDO: /serverinfo ═══
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Ver información del servidor'),

    async execute(interaction) {
        const guild = interaction.guild;
        await guild.members.fetch();

        const totalMembers = guild.memberCount;
        const humans = guild.members.cache.filter(m => !m.user.bot).size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const online = guild.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        const boostText = boostCount > 0 ? `Nivel ${boostLevel} (${boostCount} boosts)` : 'Sin boosts';

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.INFO || 0x3498DB)
            .setTitle(`📊 ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '👑 Dueño', value: `<@${guild.ownerId}>`, inline: true },
                { name: '🆔 ID', value: `\`${guild.id}\``, inline: true },
                { name: '📅 Creado', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: `👥 Miembros (${totalMembers})`, value: `👤 ${humans} humanos · 🤖 ${bots} bots\n🟢 ${online} en línea`, inline: false },
                { name: `💬 Canales (${textChannels + voiceChannels})`, value: `📝 ${textChannels} texto · 🔊 ${voiceChannels} voz · 📁 ${categories} categorías`, inline: false },
                { name: '🏷️ Roles', value: `${guild.roles.cache.size - 1}`, inline: true },
                { name: '😀 Emojis', value: `${guild.emojis.cache.size}`, inline: true },
                { name: '💎 Boost', value: boostText, inline: true },
            )
            .setFooter({ text: 'Prophet Gaming | Info del Servidor' })
            .setTimestamp();

        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }

        await interaction.reply({ embeds: [embed] });
    }
};

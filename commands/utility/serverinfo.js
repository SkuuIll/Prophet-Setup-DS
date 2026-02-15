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

        const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const roles = guild.roles.cache.size - 1; // Sin @everyone
        const emojis = guild.emojis.cache.size;
        const onlineCount = guild.members.cache.filter(m => m.presence?.status !== 'offline').size;
        const botCount = guild.members.cache.filter(m => m.user.bot).size;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle(`🏰 **INFORMACIÓN DEL SERVIDOR** | ${guild.name}`)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .addFields(
                { name: '👑 **Owner**', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 **Creado**', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🔒 **Verificación**', value: `Nivel ${guild.verificationLevel}`, inline: true },
                { name: '👥 **Estadísticas de Miembros**', value: `Total: \`${guild.memberCount}\` | Online: \`${onlineCount}\` | Bots: \`${botCount}\``, inline: false },
                { name: '📺 **Canales y Estructura**', value: `Texto: \`${textChannels}\` | Voz: \`${voiceChannels}\` | Categorías: \`${categories}\``, inline: false },
                { name: '🎭 **Roles**', value: `\`${roles}\` roles configurados`, inline: true },
                { name: '😀 **Emojis**', value: `\`${emojis}\` emojis disponibles`, inline: true },
                { name: '🆔 **Server ID**', value: `\`${guild.id}\``, inline: true },
            )
            .setFooter({ text: 'Prophet Gaming | Información del Servidor' })
            .setTimestamp();

        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 512 }));
        }

        await interaction.reply({ embeds: [embed] });
    }
};

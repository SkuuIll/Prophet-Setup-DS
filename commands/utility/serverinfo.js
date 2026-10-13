const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { makeEmbed, safeText } = require('../../utils/discordUI');

const VERIFICATION = ['Sin verificación', 'Baja', 'Media', 'Alta', 'Máxima'];

module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Consultá la información y estadísticas de este servidor'),

    async execute(interaction) {
        await interaction.deferReply();
        const guild = interaction.guild;
        if (!guild) {
            return interaction.editReply('Esta información solo está disponible dentro de un servidor.');
        }
        // No descargar todos los miembros: la caché puede ser parcial y la
        // consulta masiva provoca rate limits en comunidades grandes.
        const textCount = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
        const voiceCount = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
        const forums = guild.channels.cache.filter(c => c.type === ChannelType.GuildForum).size;
        const categoryCount = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
        const roles = Math.max(0, guild.roles.cache.size - 1);
        const owner = await guild.fetchOwner().catch(() => null);
        const icon = guild.iconURL?.({ size: 256 }) || undefined;

        const embed = makeEmbed({
            title: guild.name + ' · Información del servidor',
            iconURL: icon,
            description: safeText(guild.description || 'Comunidad de Prophet Gaming.', 350)
                + '\n\nCreado <t:' + Math.floor(guild.createdTimestamp / 1000) + ':F>',
            fields: [
                { name: 'Miembros', value: '**' + guild.memberCount.toLocaleString('es-AR') + '**', inline: true },
                { name: 'Responsable', value: owner ? '<@' + owner.id + '>' : 'No disponible', inline: true },
                { name: 'Verificación', value: VERIFICATION[guild.verificationLevel] || 'No disponible', inline: true },
                { name: 'Canales', value: 'Texto **' + textCount + '** · Voz **' + voiceCount
                    + '**\nForos **' + forums + '** · Categorías **' + categoryCount + '**', inline: true },
                { name: 'Comunidad', value: 'Roles **' + roles + '**\nEmojis **'
                    + guild.emojis.cache.size + '** · Stickers **' + guild.stickers.cache.size + '**', inline: true },
                { name: 'Mejoras', value: '**' + (guild.premiumSubscriptionCount || 0)
                    + '** boosts · Nivel **' + (guild.premiumTier || 0) + '**', inline: true },
            ],
            footer: 'Información oficial de Discord · Actualizada al consultar',
        });
        if (icon) embed.setThumbnail(icon);
        if (guild.bannerURL?.()) embed.setImage(guild.bannerURL({ size: 1024 }));
        await interaction.editReply({ embeds: [embed] });
    }
};

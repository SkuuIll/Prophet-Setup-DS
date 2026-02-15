// ═══ COMANDO: /userinfo ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Ver información de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

    async execute(interaction) {
        const target = interaction.options.getMember('usuario') || interaction.member;
        const user = target.user;

        const roles = target.roles.cache
            .filter(r => r.id !== interaction.guild.id) // No @everyone
            .sort((a, b) => b.position - a.position)
            .map(r => `${r}`)
            .slice(0, 15)
            .join(', ') || 'Ninguno';

        const embed = new EmbedBuilder()
            .setColor(target.displayColor || config.COLORES.INFO)
            .setTitle(`👤 ${user.displayName}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: '📛 Tag', value: user.tag, inline: true },
                { name: '🆔 ID', value: user.id, inline: true },
                { name: '🤖 Bot', value: user.bot ? 'Sí' : 'No', inline: true },
                { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '📥 Se unió', value: `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>`, inline: true },
                { name: `🎭 Roles (${target.roles.cache.size - 1})`, value: roles }
            )
            .setFooter({ text: 'Prophet Gaming | Info' })
            .setTimestamp();

        if (user.banner) {
            embed.setImage(user.bannerURL({ size: 512 }));
        }

        await interaction.reply({ embeds: [embed] });
    }
};

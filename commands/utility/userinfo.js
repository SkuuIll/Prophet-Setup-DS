// ═══ COMANDO: /userinfo ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Ver información detallada de un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

    async execute(interaction) {
        const user = interaction.options.getUser('usuario') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id) || await interaction.guild.members.fetch(user.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor(member?.displayHexColor !== '#000000' ? member?.displayHexColor : config.COLORES.INFO || 0x3498DB)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: '🆔 ID', value: `\`${user.id}\``, inline: true },
                { name: '📅 Cuenta creada', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            );

        if (member) {
            embed.addFields(
                { name: '📥 Se unió', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: true },
            );

            // Roles (sin @everyone)
            const roles = member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `<@&${r.id}>`)
                .slice(0, 15);
            if (roles.length > 0) {
                embed.addFields({ name: `🏷️ Roles (${member.roles.cache.size - 1})`, value: roles.join(', '), inline: false });
            }

            // Nickname
            if (member.nickname) {
                embed.addFields({ name: '✏️ Apodo', value: member.nickname, inline: true });
            }

            // Boost
            if (member.premiumSinceTimestamp) {
                embed.addFields({ name: '💎 Boosting', value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`, inline: true });
            }
        }

        // Nivel (si tiene)
        try {
            const levelData = stmts.getUser(user.id);
            if (levelData && levelData.level > 0) {
                embed.addFields({
                    name: '📊 Nivel',
                    value: `Nivel **${levelData.level}** · ${levelData.xp} XP · ${levelData.messages || 0} msgs`,
                    inline: false
                });
            }
        } catch { /* módulo no disponible */ }

        // Warns
        const warns = stmts.countWarns(user.id);
        if (warns && warns.total > 0) {
            embed.addFields({ name: '⚠️ Warns', value: `${warns.total} advertencia${warns.total !== 1 ? 's' : ''}`, inline: true });
        }

        // Economía
        try {
            const eco = stmts.getEconomy(user.id);
            if (eco && (eco.balance > 0 || eco.bank > 0)) {
                embed.addFields({ name: '💰 Economía', value: `$${eco.balance.toLocaleString()} en mano · $${eco.bank.toLocaleString()} en banco`, inline: false });
            }
        } catch { /* sin datos */ }

        embed.setFooter({ text: 'Prophet Gaming | Info de Usuario' }).setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

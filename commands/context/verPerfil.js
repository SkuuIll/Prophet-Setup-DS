// ═══════════════════════════════════════════════════════════════
// COMANDO CONTEXTUAL: Ver Perfil
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } = require('discord.js');
const db = require('../../database');
const { calculateLevel } = require('../../modules/leveling');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Ver Perfil')
        .setType(ApplicationCommandType.User),

    async execute(interaction) {
        const targetUser = interaction.targetUser;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUser.id);

        if (!user) {
            return interaction.reply({
                content: '❌ Este usuario no tiene perfil en el servidor.',
                ephemeral: true
            });
        }

        const level = calculateLevel(user.xp);
        const progress = user.xp - level.xpForCurrent;
        const progressPercent = Math.min(100, Math.max(0, (progress / level.xpNeeded) * 100));
        const progressBar = '▓'.repeat(Math.floor(progressPercent / 10)) + '░'.repeat(10 - Math.floor(progressPercent / 10));

        const embed = new EmbedBuilder()
            .setTitle(`👤 Perfil de ${targetUser.username}`)
            .setColor(0xBB86FC)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '⭐ Nivel', value: `${level.level}`, inline: true },
                { name: '✨ XP', value: user.xp.toLocaleString(), inline: true },
                { name: '💬 Mensajes', value: user.messages.toLocaleString(), inline: true },
                { name: '📊 Progreso', value: `${progressBar} ${progressPercent.toFixed(1)}%`, inline: false },
                { name: '💰 Balance', value: `${(user.balance + user.bank).toLocaleString()} coins`, inline: true },
                { name: '🎤 Voz', value: `${Math.floor((user.voice_minutes || 0) / 60)}h`, inline: true },
                { name: '🔥 Racha', value: `${user.message_streak || 0} días`, inline: true }
            )
            .setFooter({ text: `Miembro desde ${targetUser.createdAt.toLocaleDateString('es-AR')}` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};

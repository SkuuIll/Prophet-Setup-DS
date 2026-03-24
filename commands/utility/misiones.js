// ═══════════════════════════════════════════════════
//  COMANDO: /misiones
//  Gestiona las misiones diarias y semanales
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { stmts } = require('../../database');
const { assignDailyQuestsForUser, trackQuestCompleted } = require('../../modules/profileSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('misiones')
        .setDescription('Gestiona tus misiones diarias y semanales')
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver tus misiones activas')
        )
        .addSubcommand(sub =>
            sub.setName('diarias')
                .setDescription('Obtener nuevas misiones diarias')
        )
        .addSubcommand(sub =>
            sub.setName('reclamar')
                .setDescription('Reclamar recompensa de una misión completada')
                .addIntegerOption(opt =>
                    opt.setName('id')
                        .setDescription('ID de la misión completada')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'ver') {
            return await handleViewQuests(interaction);
        }

        if (subcommand === 'diarias') {
            return await handleGetDailyQuests(interaction);
        }

        if (subcommand === 'reclamar') {
            return await handleClaimQuest(interaction);
        }
    }
};

async function handleViewQuests(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const activeQuests = stmts.getUserActiveQuests(userId);
    const completedQuests = stmts.getUserCompletedQuests(userId, 5);

    const embed = new EmbedBuilder()
        .setColor(0xBB86FC)
        .setAuthor({
            name: `Misiones de ${interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        });

    if (activeQuests.length > 0) {
        // Separar por tipo
        const dailyQuests = activeQuests.filter(q => q.type === 'daily');
        const weeklyQuests = activeQuests.filter(q => q.type === 'weekly');

        if (dailyQuests.length > 0) {
            const dailyText = dailyQuests.map(q => {
                const progress = Math.min(100, Math.round((q.progress / q.requirement_value) * 100));
                const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
                const expires = q.expires_at ? `<t:${Math.floor(q.expires_at / 1000)}:R>` : 'Sin límite';
                const status = q.completed ? '✅' : '🔄';
                return `${status} **${q.name}**\n└ ${progressBar} ${progress}%\n└ ${q.description}\n└ 🎁 ${q.reward_xp} XP · ${q.reward_coins} monedas\n└ ⏰ ${expires}`;
            }).join('\n\n');

            embed.addFields({
                name: `📅 Diarias (${dailyQuests.length})`,
                value: dailyText,
                inline: false
            });
        }

        if (weeklyQuests.length > 0) {
            const weeklyText = weeklyQuests.map(q => {
                const progress = Math.min(100, Math.round((q.progress / q.requirement_value) * 100));
                const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
                const expires = q.expires_at ? `<t:${Math.floor(q.expires_at / 1000)}:R>` : 'Sin límite';
                const status = q.completed ? '✅' : '🔄';
                return `${status} **${q.name}**\n└ ${progressBar} ${progress}%\n└ ${q.description}\n└ 🎁 ${q.reward_xp} XP · ${q.reward_coins} monedas\n└ ⏰ ${expires}`;
            }).join('\n\n');

            embed.addFields({
                name: `📆 Semanales (${weeklyQuests.length})`,
                value: weeklyText,
                inline: false
            });
        }
    } else {
        embed.setDescription('No tienes misiones activas. Usa `/misiones diarias` para obtener nuevas misiones.');
    }

    // Mostrar misiones completadas recientes
    const unclaimed = completedQuests.filter(q => !q.claimed);
    if (unclaimed.length > 0) {
        embed.addFields({
            name: `🎁 Por Reclamar (${unclaimed.length})`,
            value: unclaimed.map(q => `• **${q.name}** (ID: ${q.id})`).join('\n'),
            inline: false
        });
    }

    const components = [];
    if (unclaimed.length > 0) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`quests:claim:${unclaimed[0].id}`)
                    .setLabel('Reclamar Primera')
                    .setStyle(ButtonStyle.Success)
            );
        components.push(row);
    }

    await interaction.editReply({ embeds: [embed], components });
}

async function handleGetDailyQuests(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const assigned = assignDailyQuestsForUser(userId);

    if (assigned.length === 0) {
        return interaction.editReply('Ya tienes misiones diarias asignadas para hoy. Usa `/misiones ver` para verlas.');
    }

    const embed = new EmbedBuilder()
        .setColor(0x4CAF50)
        .setTitle('🎯 ¡Nuevas Misiones Diarias!')
        .setDescription(
            assigned.map(q => {
                const expires = Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000);
                return `• **${q.name}**\n  └ ${q.description}\n  └ 🎁 ${q.reward_xp} XP · ${q.reward_coins} monedas\n  └ ⏰ Expira <t:${expires}:R>`;
            }).join('\n\n')
        )
        .setFooter({ text: 'Completa las misiones antes de que expiren!' });

    await interaction.editReply({ embeds: [embed] });
}

async function handleClaimQuest(interaction) {
    const userId = interaction.user.id;
    const questId = interaction.options.getInteger('id');

    const result = stmts.claimQuestReward(userId, questId);

    if (!result.claimed) {
        return interaction.reply({
            content: `❌ ${result.error || 'No se pudo reclamar la misión.'}`,
            ephemeral: true
        });
    }

    // Track quest completion para achievements
    trackQuestCompleted(userId);

    const rewards = result.rewards;
    let rewardText = [];
    if (rewards.xp > 0) rewardText.push(`${rewards.xp} XP`);
    if (rewards.coins > 0) rewardText.push(`${rewards.coins} monedas`);
    if (rewards.badge) rewardText.push(`Badge: ${rewards.badge}`);

    const embed = new EmbedBuilder()
        .setColor(0x4CAF50)
        .setTitle('🎁 ¡Recompensa Reclamada!')
        .setDescription(`Has recibido: **${rewardText.join(' · ')}**`);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

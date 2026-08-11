// ═══════════════════════════════════════════════════
//  COMANDO: /perfil
//  Muestra el perfil avanzado del usuario
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { stmts } = require('../../database');
const { getProfileCardData, formatProfileEmbed } = require('../../modules/profileSystem');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perfil')
        .setDescription('Muestra tu perfil o el de otro usuario')
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver el perfil completo')
                .addUserOption(option =>
                    option.setName('usuario')
                        .setDescription('Usuario cuyo perfil quieres ver')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('badges')
                .setDescription('Ver todos tus badges')
        )
        .addSubcommand(sub =>
            sub.setName('logros')
                .setDescription('Ver tus logros completados')
        )
        .addSubcommand(sub =>
            sub.setName('misiones')
                .setDescription('Ver tus misiones activas')
        )
        .addSubcommand(sub =>
            sub.setName('preferencias')
                .setDescription('Configurar tus preferencias')
                .addStringOption(opt =>
                    opt.setName('timezone')
                        .setDescription('Tu zona horaria')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Argentina (UTC-3)', value: 'America/Argentina/Buenos_Aires' },
                            { name: 'México (UTC-6)', value: 'America/Mexico_City' },
                            { name: 'Colombia (UTC-5)', value: 'America/Bogota' },
                            { name: 'Chile (UTC-4)', value: 'America/Santiago' },
                            { name: 'España (UTC+1)', value: 'Europe/Madrid' },
                        )
                )
                .addStringOption(opt =>
                    opt.setName('idioma')
                        .setDescription('Tu idioma preferido')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Español', value: 'es' },
                            { name: 'English', value: 'en' },
                        )
                )
                .addBooleanOption(opt =>
                    opt.setName('ia')
                        .setDescription('Habilitar respuestas de IA')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('color')
                .setDescription('Cambiar el color de tu perfil')
                .addStringOption(opt =>
                    opt.setName('color')
                        .setDescription('Color en formato hexadecimal (ej: #BB86FC)')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('usuario') || interaction.user;
        
        // Si el subcomando es 'ver', obtener usuario de ahí
        const viewUser = subcommand === 'ver' 
            ? (interaction.options.getUser('usuario') || interaction.user)
            : interaction.user;
        const member = await interaction.guild.members.fetch(viewUser.id);

        // Ver perfil
        if (subcommand === 'ver' || !subcommand) {
            return await handleViewProfile(interaction, targetUser, member);
        }

        // Ver badges
        if (subcommand === 'badges') {
            return await handleViewBadges(interaction, targetUser, member);
        }

        // Ver logros
        if (subcommand === 'logros') {
            return await handleViewAchievements(interaction, targetUser, member);
        }

        // Ver misiones
        if (subcommand === 'misiones') {
            return await handleViewQuests(interaction, targetUser, member);
        }

        // Preferencias
        if (subcommand === 'preferencias') {
            return await handlePreferences(interaction, targetUser);
        }

        // Color
        if (subcommand === 'color') {
            return await handleColor(interaction, targetUser);
        }
    }
};

async function handleViewProfile(interaction, targetUser, member) {
    await interaction.deferReply();

    const profile = getProfileCardData(targetUser.id);
    if (!profile) {
        return interaction.editReply('❌ No se encontró el perfil. Intenta enviar un mensaje primero.');
    }

    const embed = formatProfileEmbed(profile, member);

    // Botones de acción
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`profile:badges:${targetUser.id}`)
                .setLabel('🏆 Badges')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`profile:achievements:${targetUser.id}`)
                .setLabel('🎯 Logros')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(`profile:quests:${targetUser.id}`)
                .setLabel('📋 Misiones')
                .setStyle(ButtonStyle.Secondary),
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleViewBadges(interaction, targetUser, member) {
    await interaction.deferReply();

    const badges = stmts.getUserBadges(targetUser.id);

    if (badges.length === 0) {
        return interaction.editReply({
            content: `${targetUser.id === interaction.user.id ? 'Todavía no tienes' : 'Este usuario no tiene'} badges desbloqueados.`,
            ephemeral: true
        });
    }

    const rarityEmojis = {
        common: '⚪',
        uncommon: '🟢',
        rare: '🔵',
        epic: '🟣',
        legendary: '🟡',
    };

    const embed = new EmbedBuilder()
        .setColor(0xBB86FC)
        .setAuthor({
            name: `Badges de ${member.displayName}`,
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setDescription(
            badges.slice(0, 15).map(b =>
                `${b.icon} **${b.name}** ${rarityEmojis[b.rarity] || ''}\n└ ${b.description}`
            ).join('\n\n')
        )
        .setFooter({ text: `${badges.length} badges desbloqueados` });

    await interaction.editReply({ embeds: [embed] });
}

async function handleViewAchievements(interaction, targetUser, member) {
    await interaction.deferReply();

    const achievements = stmts.getUserAchievements(targetUser.id);
    const completed = achievements.filter(a => a.completed_at);
    const inProgress = achievements.filter(a => !a.completed_at);

    const embed = new EmbedBuilder()
        .setColor(0xBB86FC)
        .setAuthor({
            name: `Logros de ${member.displayName}`,
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        });

    if (completed.length > 0) {
        embed.addFields({
            name: `✅ Completados (${completed.length})`,
            value: completed.slice(0, 10).map(a => `• **${a.name}** - ${a.description}`).join('\n'),
            inline: false
        });
    }

    if (inProgress.length > 0) {
        const progressText = inProgress.slice(0, 5).map(a => {
            const percent = Math.round((a.progress / 100) * 100);
            return `• **${a.name}** (${percent}%)`;
        }).join('\n');
        embed.addFields({
            name: `🔄 En Progreso (${inProgress.length})`,
            value: progressText,
            inline: false
        });
    }

    if (completed.length === 0 && inProgress.length === 0) {
        embed.setDescription('No hay logros registrados todavía. ¡Sigue participando!');
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleViewQuests(interaction, targetUser, member) {
    await interaction.deferReply();

    const activeQuests = stmts.getUserActiveQuests(targetUser.id);
    const completedQuests = stmts.getUserCompletedQuests(targetUser.id, 10);

    const embed = new EmbedBuilder()
        .setColor(0xBB86FC)
        .setAuthor({
            name: `Misiones de ${member.displayName}`,
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        });

    if (activeQuests.length > 0) {
        const questText = activeQuests.map(q => {
            const progress = Math.min(100, Math.round((q.progress / q.requirement_value) * 100));
            const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
            const expires = q.expires_at ? `<t:${Math.floor(q.expires_at / 1000)}:R>` : 'Sin límite';
            return `**${q.name}**\n└ ${progressBar} ${progress}%\n└ 🎁 ${q.reward_xp} XP · ${q.reward_coins} monedas\n└ ⏰ Expira: ${expires}`;
        }).join('\n\n');

        embed.addFields({
            name: `🎯 Misiones Activas (${activeQuests.length})`,
            value: questText,
            inline: false
        });
    }

    if (completedQuests.length > 0) {
        const completedText = completedQuests.slice(0, 5).map(q =>
            `✅ **${q.name}** - ${q.reward_xp} XP`
        ).join('\n');
        embed.addFields({
            name: '✅ Completadas Recientemente',
            value: completedText,
            inline: false
        });
    }

    if (activeQuests.length === 0 && completedQuests.length === 0) {
        embed.setDescription('No tienes misiones activas. ¡Usa `/perfil misiones` mañana para nuevas misiones diarias!');
    }

    // Botón para reclamar recompensas
    const unclaimedQuests = completedQuests.filter(q => !q.claimed);
    const components = [];

    if (unclaimedQuests.length > 0 && targetUser.id === interaction.user.id) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`quests:claim:${unclaimedQuests[0].id}`)
                    .setLabel(`Reclamar (${unclaimedQuests.length})`)
                    .setStyle(ButtonStyle.Success)
            );
        components.push(row);
    }

    await interaction.editReply({ embeds: [embed], components });
}

async function handlePreferences(interaction, targetUser) {
    // Solo el propio usuario puede cambiar sus preferencias
    if (targetUser.id !== interaction.user.id) {
        return interaction.reply({
            content: '❌ Solo puedes cambiar tus propias preferencias.',
            ephemeral: true
        });
    }

    const timezone = interaction.options.getString('timezone');
    const language = interaction.options.getString('idioma');
    const aiEnabled = interaction.options.getBoolean('ia');

    const updates = {};
    if (timezone) updates.timezone = timezone;
    if (language) updates.language = language;
    if (aiEnabled !== null) updates.ai_enabled = aiEnabled ? 1 : 0;

    if (Object.keys(updates).length > 0) {
        stmts.setMultipleUserPreferences(targetUser.id, updates);
        await interaction.reply({
            content: `✅ Preferencias actualizadas:\n${Object.entries(updates).map(([k, v]) => `• ${k}: ${v}`).join('\n')}`,
            ephemeral: true
        });
    } else {
        const prefs = stmts.getUserPreferences(targetUser.id);
        const embed = new EmbedBuilder()
            .setColor(0xBB86FC)
            .setTitle('⚙️ Tus Preferencias')
            .addFields(
                { name: '🌍 Zona Horaria', value: prefs.timezone, inline: true },
                { name: '🌐 Idioma', value: prefs.language, inline: true },
                { name: '🤖 IA Habilitada', value: prefs.ai_enabled ? 'Sí' : 'No', inline: true },
                { name: '🔔 Notificaciones', value: prefs.notifications_enabled ? 'Sí' : 'No', inline: true },
            );

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}

async function handleColor(interaction, targetUser) {
    if (targetUser.id !== interaction.user.id) {
        return interaction.reply({
            content: '❌ Solo puedes cambiar tu propio color de perfil.',
            ephemeral: true
        });
    }

    const color = interaction.options.getString('color');

    // Validar formato hexadecimal
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        return interaction.reply({
            content: '❌ El color debe ser un código hexadecimal válido (ej: #BB86FC)',
            ephemeral: true
        });
    }

    stmts.setProfileColor(targetUser.id, color);

    const embed = new EmbedBuilder()
        .setColor(color)
        .setDescription(`✅ Color de perfil actualizado a **${color}**`);

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

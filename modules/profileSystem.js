// ═══════════════════════════════════════════════════
//  SISTEMA DE PERFILES AVANZADOS
//  Badges, Achievements y Quests
// ═══════════════════════════════════════════════════

const { stmts } = require('../database');

// ═══════════════════════════════════════════════════
//  DEFINICIONES POR DEFECTO
// ═══════════════════════════════════════════════════

const DEFAULT_BADGES = [
    // Badges de actividad
    { id: 'first_message', name: 'Primer Mensaje', description: 'Enviaste tu primer mensaje en el servidor', icon: '💬', rarity: 'common', requirement_type: 'messages_sent', requirement_value: 1, reward_xp: 10, reward_coins: 5 },
    { id: 'chatterbox', name: 'Cotorra', description: 'Enviaste 100 mensajes', icon: '🗣️', rarity: 'uncommon', requirement_type: 'messages_sent', requirement_value: 100, reward_xp: 100, reward_coins: 50 },
    { id: 'talkative', name: 'Charlatán', description: 'Enviaste 500 mensajes', icon: '📢', rarity: 'rare', requirement_type: 'messages_sent', requirement_value: 500, reward_xp: 300, reward_coins: 150 },
    { id: 'megaphone', name: 'Megáfono', description: 'Enviaste 1000 mensajes', icon: '📣', rarity: 'epic', requirement_type: 'messages_sent', requirement_value: 1000, reward_xp: 500, reward_coins: 300 },
    { id: 'legendary_speaker', name: 'Orador Legendario', description: 'Enviaste 5000 mensajes', icon: '🎙️', rarity: 'legendary', requirement_type: 'messages_sent', requirement_value: 5000, reward_xp: 2000, reward_coins: 1000 },

    // Badges de nivel
    { id: 'level_5', name: 'Novato', description: 'Alcanzaste nivel 5', icon: '🌱', rarity: 'common', requirement_type: 'level', requirement_value: 5, reward_xp: 0, reward_coins: 50 },
    { id: 'level_10', name: 'Aprendiz', description: 'Alcanzaste nivel 10', icon: '📖', rarity: 'uncommon', requirement_type: 'level', requirement_value: 10, reward_xp: 0, reward_coins: 100 },
    { id: 'level_25', name: 'Veterano', description: 'Alcanzaste nivel 25', icon: '⚔️', rarity: 'rare', requirement_type: 'level', requirement_value: 25, reward_xp: 0, reward_coins: 250 },
    { id: 'level_50', name: 'Élite', description: 'Alcanzaste nivel 50', icon: '👑', rarity: 'epic', requirement_type: 'level', requirement_value: 50, reward_xp: 0, reward_coins: 500 },
    { id: 'level_100', name: 'Leyenda', description: 'Alcanzaste nivel 100', icon: '🏆', rarity: 'legendary', requirement_type: 'level', requirement_value: 100, reward_xp: 0, reward_coins: 2000 },

    // Badges de voz
    { id: 'voice_starter', name: 'Primera Voz', description: 'Pasaste 1 hora en canales de voz', icon: '🎤', rarity: 'common', requirement_type: 'voice_hours', requirement_value: 1, reward_xp: 50, reward_coins: 25 },
    { id: 'voice_regular', name: 'Voz Regular', description: 'Pasaste 10 horas en voz', icon: '🎧', rarity: 'uncommon', requirement_type: 'voice_hours', requirement_value: 10, reward_xp: 200, reward_coins: 100 },
    { id: 'voice_addict', name: 'Adicto a la Voz', description: 'Pasaste 50 horas en voz', icon: '📻', rarity: 'rare', requirement_type: 'voice_hours', requirement_value: 50, reward_xp: 500, reward_coins: 300 },
    { id: 'voice_legend', name: 'Leyenda de Voz', description: 'Pasaste 200 horas en voz', icon: '🎚️', rarity: 'legendary', requirement_type: 'voice_hours', requirement_value: 200, reward_xp: 2000, reward_coins: 1000 },

    // Badges de racha
    { id: 'streak_3', name: 'Racha de 3', description: '3 días consecutivos de actividad', icon: '🔥', rarity: 'common', requirement_type: 'streak', requirement_value: 3, reward_xp: 30, reward_coins: 15 },
    { id: 'streak_7', name: 'Semana Perfecta', description: '7 días consecutivos de actividad', icon: '🌟', rarity: 'uncommon', requirement_type: 'streak', requirement_value: 7, reward_xp: 100, reward_coins: 50 },
    { id: 'streak_30', name: 'Mes Imparable', description: '30 días consecutivos de actividad', icon: '💫', rarity: 'rare', requirement_type: 'streak', requirement_value: 30, reward_xp: 500, reward_coins: 250 },
    { id: 'streak_100', name: 'Máquina Imparable', description: '100 días consecutivos de actividad', icon: '⚡', rarity: 'legendary', requirement_type: 'streak', requirement_value: 100, reward_xp: 3000, reward_coins: 1500 },

    // Badges de reputación
    { id: 'rep_10', name: 'Buena Onda', description: 'Recibiste 10 puntos de reputación', icon: '😊', rarity: 'common', requirement_type: 'reputation', requirement_value: 10, reward_xp: 50, reward_coins: 25 },
    { id: 'rep_50', name: 'Querido por Todos', description: 'Recibiste 50 puntos de reputación', icon: '💚', rarity: 'rare', requirement_type: 'reputation', requirement_value: 50, reward_xp: 300, reward_coins: 150 },
    { id: 'rep_100', name: 'Leyenda Comunitaria', description: 'Recibiste 100 puntos de reputación', icon: '💎', rarity: 'legendary', requirement_type: 'reputation', requirement_value: 100, reward_xp: 1000, reward_coins: 500 },

    // Badges especiales
    { id: 'early_bird', name: 'Ave Madrugadora', description: 'Fuiste de los primeros en unirte', icon: '🐦', rarity: 'epic', requirement_type: 'early_member', requirement_value: 1, reward_xp: 500, reward_coins: 250 },
    { id: 'birthday_star', name: 'Estrella de Cumpleaños', description: 'Registraste tu cumpleaños', icon: '🎂', rarity: 'common', requirement_type: 'birthday_set', requirement_value: 1, reward_xp: 20, reward_coins: 10 },
    { id: 'quest_master', name: 'Maestro de Misiones', description: 'Completaste 50 misiones', icon: '🎯', rarity: 'epic', requirement_type: 'quests_completed', requirement_value: 50, reward_xp: 400, reward_coins: 200 },
];

const DEFAULT_ACHIEVEMENTS = [
    // Logros de mensajes
    { id: 'msg_100', name: 'Conversador', description: 'Envía 100 mensajes', category: 'activity', requirement_type: 'messages_sent', requirement_value: 100, reward_xp: 100, reward_coins: 50 },
    { id: 'msg_500', name: 'Comunicador', description: 'Envía 500 mensajes', category: 'activity', requirement_type: 'messages_sent', requirement_value: 500, reward_xp: 300, reward_coins: 150 },
    { id: 'msg_1000', name: 'Orador', description: 'Envía 1000 mensajes', category: 'activity', requirement_type: 'messages_sent', requirement_value: 1000, reward_xp: 500, reward_coins: 250 },

    // Logros de comandos
    { id: 'cmds_50', name: 'Explorador', description: 'Usa 50 comandos', category: 'commands', requirement_type: 'commands_used', requirement_value: 50, reward_xp: 75, reward_coins: 40 },
    { id: 'cmds_200', name: 'Veterano de Comandos', description: 'Usa 200 comandos', category: 'commands', requirement_type: 'commands_used', requirement_value: 200, reward_xp: 200, reward_coins: 100 },

    // Logros de economía
    { id: 'rich_1000', name: 'Ahorrista', description: 'Acumula 1000 monedas', category: 'economy', requirement_type: 'total_coins', requirement_value: 1000, reward_xp: 100, reward_coins: 0 },
    { id: 'rich_10000', name: 'Millonario', description: 'Acumula 10000 monedas', category: 'economy', requirement_type: 'total_coins', requirement_value: 10000, reward_xp: 500, reward_coins: 0, reward_badge_id: 'money_bags' },

    // Logros de voz
    { id: 'voice_10h', name: 'Locutor', description: 'Pasa 10 horas en voz', category: 'voice', requirement_type: 'voice_hours', requirement_value: 10, reward_xp: 200, reward_coins: 100 },
    { id: 'voice_50h', name: 'Locutor Pro', description: 'Pasa 50 horas en voz', category: 'voice', requirement_type: 'voice_hours', requirement_value: 50, reward_xp: 500, reward_coins: 250 },

    // Logros de misiones
    { id: 'quest_10', name: 'Aventurero', description: 'Completa 10 misiones', category: 'quests', requirement_type: 'quests_completed', requirement_value: 10, reward_xp: 150, reward_coins: 75 },
    { id: 'quest_50', name: 'Héroe', description: 'Completa 50 misiones', category: 'quests', requirement_type: 'quests_completed', requirement_value: 50, reward_xp: 400, reward_coins: 200 },
];

const DEFAULT_QUESTS = [
    // Misiones diarias
    { id: 'daily_messages_10', name: 'Charlatán Diario', description: 'Envía 10 mensajes hoy', type: 'daily', category: 'activity', requirement_type: 'daily_messages', requirement_value: 10, reward_xp: 25, reward_coins: 15 },
    { id: 'daily_messages_25', name: 'Super Charlatán', description: 'Envía 25 mensajes hoy', type: 'daily', category: 'activity', requirement_type: 'daily_messages', requirement_value: 25, reward_xp: 50, reward_coins: 30 },
    { id: 'daily_commands_5', name: 'Explorador de Comandos', description: 'Usa 5 comandos hoy', type: 'daily', category: 'commands', requirement_type: 'daily_commands', requirement_value: 5, reward_xp: 20, reward_coins: 10 },
    { id: 'daily_voice_30', name: 'Media Hora de Voz', description: 'Pasa 30 minutos en voz', type: 'daily', category: 'voice', requirement_type: 'daily_voice_minutes', requirement_value: 30, reward_xp: 30, reward_coins: 15 },

    // Misiones semanales
    { id: 'weekly_messages_100', name: 'Semana Productiva', description: 'Envía 100 mensajes esta semana', type: 'weekly', category: 'activity', requirement_type: 'weekly_messages', requirement_value: 100, reward_xp: 150, reward_coins: 75 },
    { id: 'weekly_voice_5h', name: 'Voz Semanal', description: 'Pasa 5 horas en voz esta semana', type: 'weekly', category: 'voice', requirement_type: 'weekly_voice_minutes', requirement_value: 300, reward_xp: 200, reward_coins: 100 },
    { id: 'weekly_commands_25', name: 'Maestro de Comandos', description: 'Usa 25 comandos esta semana', type: 'weekly', category: 'commands', requirement_type: 'weekly_commands', requirement_value: 25, reward_xp: 100, reward_coins: 50 },
];

// ═══════════════════════════════════════════════════
//  INICIALIZACIÓN
// ═══════════════════════════════════════════════════

function initializeProfileSystem() {
    let newBadges = 0;
    let newAchievements = 0;
    let newQuests = 0;

    // Crear badges
    for (const badge of DEFAULT_BADGES) {
        const existing = stmts.getBadgeDefinition(badge.id);
        if (!existing) {
            stmts.createBadgeDefinition(badge);
            newBadges++;
        }
    }

    // Crear achievements
    for (const achievement of DEFAULT_ACHIEVEMENTS) {
        const existing = stmts.getAchievementDefinition(achievement.id);
        if (!existing) {
            stmts.createAchievementDefinition(achievement);
            newAchievements++;
        }
    }

    // Crear quests
    for (const quest of DEFAULT_QUESTS) {
        const existing = stmts.getQuestTemplate(quest.id);
        if (!existing) {
            stmts.createQuestTemplate(quest);
            newQuests++;
        }
    }

    if (newBadges > 0 || newAchievements > 0 || newQuests > 0) {
        console.log(`🏆 Sistema de perfiles: ${newBadges} badges, ${newAchievements} achievements, ${newQuests} quests creados`);
    }

    return { newBadges, newAchievements, newQuests };
}

// ═══════════════════════════════════════════════════
//  TRACKING DE PROGRESO
// ═══════════════════════════════════════════════════

function trackMessage(userId) {
    const user = stmts.getUser(userId);
    const results = stmts.checkAndAwardProgress(userId, 'messages_sent', (user?.messages || 0) + 1);
    return results;
}

function trackLevel(userId, level) {
    const results = stmts.checkAndAwardProgress(userId, 'level', level);
    return results;
}

function trackVoiceMinutes(userId, minutes) {
    const user = stmts.getUser(userId);
    const totalMinutes = (user?.voice_minutes || 0) + minutes;
    const hours = Math.floor(totalMinutes / 60);
    const results = stmts.checkAndAwardProgress(userId, 'voice_hours', hours);
    return results;
}

function trackStreak(userId, streak) {
    const results = stmts.checkAndAwardProgress(userId, 'streak', streak);
    return results;
}

function trackReputation(userId, rep) {
    const results = stmts.checkAndAwardProgress(userId, 'reputation', rep);
    return results;
}

function trackCommand(userId) {
    const results = stmts.checkAndAwardProgress(userId, 'commands_used', 1);
    return results;
}

function trackQuestCompleted(userId) {
    const completed = stmts.getUserCompletedQuests(userId, 100);
    const total = completed.length;
    const results = stmts.checkAndAwardProgress(userId, 'quests_completed', total);
    return results;
}

// ═══════════════════════════════════════════════════
//  GESTIÓN DE MISIONES DIARIAS
// ═══════════════════════════════════════════════════

function assignDailyQuestsForUser(userId) {
    return stmts.assignDailyQuests(userId);
}

function updateDailyQuestProgress(userId, type, increment = 1) {
    const activeQuests = stmts.getUserActiveQuests(userId);
    const completed = [];

    for (const quest of activeQuests) {
        if (quest.requirement_type === type && !quest.completed) {
            const newProgress = (quest.progress || 0) + increment;
            const result = stmts.updateQuestProgress(userId, quest.quest_id, newProgress);
            if (result?.completed) {
                completed.push(result.quest);
            }
        }
    }

    return completed;
}

// ═══════════════════════════════════════════════════
//  UTILIDADES DE PERFIL
// ═══════════════════════════════════════════════════

function getProfileCardData(userId) {
    const profile = stmts.getFullProfile(userId);
    if (!profile) return null;

    const { user, badges, achievements, activeQuests, preferences, ranks } = profile;

    // Calcular progreso al siguiente nivel
    const xpForLevel = (level) => 5 * (level ** 2) + 50 * level + 100;
    const currentLevelXp = xpForLevel(user.level);
    const nextLevelXp = xpForLevel(user.level + 1);
    const xpProgress = user.xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progressPercent = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

    return {
        userId,
        username: user.username || 'Usuario',
        level: user.level,
        xp: user.xp,
        xpProgress,
        xpNeeded,
        progressPercent,
        messages: user.messages,
        voiceMinutes: user.voice_minutes,
        voiceHours: Math.floor((user.voice_minutes || 0) / 60),
        balance: user.balance,
        bank: user.bank,
        totalCoins: (user.balance || 0) + (user.bank || 0),
        reputation: user.reputation || 0,
        streak: user.message_streak || 0,
        ranks,
        badges: badges.slice(0, 6),
        totalBadges: badges.length,
        achievements: achievements.slice(0, 5),
        totalAchievements: achievements.length,
        activeQuests: activeQuests.slice(0, 3),
        totalActiveQuests: activeQuests.length,
        profileColor: user.profile_color,
        profileBadge: user.profile_badge,
        preferences,
    };
}

function formatProfileEmbed(profile, member) {
    const { EmbedBuilder } = require('discord.js');

    const rarityColors = {
        common: 0x9E9E9E,
        uncommon: 0x4CAF50,
        rare: 0x2196F3,
        epic: 0x9C27B0,
        legendary: 0xFFD700,
    };

    // Determinar color del embed
    let embedColor = profile.profileColor || 0xBB86FC;
    if (profile.badges.length > 0) {
        const highestRarity = profile.badges.reduce((highest, badge) => {
            const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
            return rarityOrder.indexOf(badge.rarity) > rarityOrder.indexOf(highest) ? badge.rarity : highest;
        }, 'common');
        if (!profile.profileColor) {
            embedColor = rarityColors[highestRarity] || 0xBB86FC;
        }
    }

    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({
            name: `${member.displayName}'s Profile`,
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .addFields(
            {
                name: '📊 Nivel',
                value: `**${profile.level}** (${profile.progressPercent}% al siguiente)\n${profile.xp.toLocaleString()} XP`,
                inline: true
            },
            {
                name: '🏆 Ranks',
                value: `XP: #${profile.ranks.xp}${profile.ranks.voice ? `\nVoz: #${profile.ranks.voice}` : ''}`,
                inline: true
            },
            {
                name: '💰 Economía',
                value: `💵 ${profile.balance.toLocaleString()}\n🏦 ${profile.bank.toLocaleString()}\n💎 ${profile.totalCoins.toLocaleString()} total`,
                inline: true
            }
        );

    // Badges
    if (profile.badges.length > 0) {
        const badgeText = profile.badges.map(b => `${b.icon} ${b.name}`).join('\n');
        embed.addFields({
            name: `🏅 Badges (${profile.totalBadges})`,
            value: badgeText,
            inline: true
        });
    }

    // Stats
    embed.addFields(
        {
            name: '📈 Estadísticas',
            value: `💬 ${profile.messages.toLocaleString()} mensajes\n🎤 ${profile.voiceHours}h en voz\n⭐ ${profile.reputation} reputación\n🔥 ${profile.streak} días de racha`,
            inline: true
        }
    );

    // Misiones activas
    if (profile.activeQuests.length > 0) {
        const questText = profile.activeQuests.map(q => {
            const progress = Math.min(100, Math.round((q.progress / q.requirement_value) * 100));
            return `${q.name}: ${progress}%`;
        }).join('\n');
        embed.addFields({
            name: `🎯 Misiones Activas (${profile.totalActiveQuests})`,
            value: questText,
            inline: true
        });
    }

    embed.setFooter({ text: `Prophet Gaming • Miembro desde ${member.joinedAt?.toLocaleDateString('es-AR') || 'siempre'}` });

    return embed;
}

module.exports = {
    initializeProfileSystem,
    trackMessage,
    trackLevel,
    trackVoiceMinutes,
    trackStreak,
    trackReputation,
    trackCommand,
    trackQuestCompleted,
    assignDailyQuestsForUser,
    updateDailyQuestProgress,
    getProfileCardData,
    formatProfileEmbed,
    DEFAULT_BADGES,
    DEFAULT_ACHIEVEMENTS,
    DEFAULT_QUESTS,
};

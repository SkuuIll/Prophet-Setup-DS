// ═══════════════════════════════════════════════════
//  SISTEMA DE ONBOARDING INTELIGENTE
//  Flujo de bienvenida guiado y recomendaciones
// ═══════════════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

// ═══════════════════════════════════════════════════
//  CONFIGURACIÓN DE ONBOARDING
// ═══════════════════════════════════════════════════

const ONBOARDING_STEPS = [
    {
        id: 'welcome',
        title: '👋 ¡Bienvenido a Prophet Gaming!',
        description: 'Soy Prophet, el bot del servidor. Te voy a guiar en tus primeros pasos para que aproveches al máximo la comunidad.',
        fields: [
            { name: '🎯 ¿Qué encontrarás?', value: '• Comunidad gaming activa\n• Canales de voz para jugar\n• Eventos y sorteos\n• Sistema de niveles y economía\n• Música y entretenimiento' }
        ],
        nextStep: 'rules'
    },
    {
        id: 'rules',
        title: '📜 Reglas del Servidor',
        description: 'Antes de continuar, es importante que conozcas las normas de la comunidad.',
        fields: [
            { name: 'Reglas principales', value: '1. Respetar a todos los miembros\n2. No spam ni auto-promoción\n3. Usar canales apropiados\n4. No contenido NSFW\n5. Divertirse!' },
            { name: '⚠️ Importante', value: 'El incumplimiento de las reglas puede resultar en sanciones. Si tenés dudas, consultá al Staff.' }
        ],
        nextStep: 'roles'
    },
    {
        id: 'roles',
        title: '🎭 Elegí tus Roles',
        description: 'Seleccioná los juegos que te interesan para obtener acceso a canales y notificaciones específicas.',
        action: 'select_roles',
        nextStep: 'channels'
    },
    {
        id: 'channels',
        title: '📍 Canales Importantes',
        description: 'Estos son los canales que vas a usar más seguido:',
        fields: [
            { name: '💬 Chat General', value: 'Para charlar con la comunidad' },
            { name: '🎮 Buscar Partido', value: 'Para buscar gente para jugar' },
            { name: '📢 Anuncios', value: 'Para estar al tanto de eventos' },
            { name: '🤖 Comandos', value: 'Para usar comandos del bot' }
        ],
        nextStep: 'commands'
    },
    {
        id: 'commands',
        title: '⚡ Comandos Útiles',
        description: 'Estos son algunos comandos que te van a servir:',
        fields: [
            { name: '🎵 Música', value: '`/play` - Reproducir música\n`/skip` - Saltar canción\n`/queue` - Ver cola' },
            { name: '💰 Economía', value: '`/daily` - Recompensa diaria\n`/balance` - Ver monedas\n`/shop` - Tienda' },
            { name: '🎮 Utilidad', value: '`/perfil` - Tu perfil\n`/misiones` - Ver misiones\n`/help` - Ayuda' }
        ],
        nextStep: 'complete'
    },
    {
        id: 'complete',
        title: '✅ ¡Listo para empezar!',
        description: 'Completaste el tour de bienvenida. ¡Ya sos parte de la familia Prophet!',
        fields: [
            { name: '🎁 Recompensa', value: 'Recibiste **100 XP** y **50 monedas** por completar el onboarding!' },
            { name: '💡 Tip', value: 'Usa `/ayuda` si necesitás más información sobre los comandos disponibles.' }
        ],
        isComplete: true
    }
];

const GAME_ROLES = [
    { id: 'valorant', label: '🎯 Valorant', description: 'Notificaciones de Valorant' },
    { id: 'lol', label: '⚔️ League of Legends', description: 'Notificaciones de LoL' },
    { id: 'csgo', label: '🔫 CS2', description: 'Notificaciones de CS2' },
    { id: 'minecraft', label: '⛏️ Minecraft', description: 'Notificaciones de Minecraft' },
    { id: 'gta', label: '🚗 GTA/RP', description: 'Notificaciones de GTA' },
    { id: 'fortnite', label: '🏗️ Fortnite', description: 'Notificaciones de Fortnite' },
    { id: 'apex', label: '🤖 Apex Legends', description: 'Notificaciones de Apex' },
    { id: 'fifa', label: '⚽ FIFA/EA FC', description: 'Notificaciones de FIFA' },
];

// ═══════════════════════════════════════════════════
//  FUNCIONES PRINCIPALES
// ═══════════════════════════════════════════════════

function getOnboardingProgress(userId) {
    const progress = stmts.getConfig(`onboarding_${userId}`);
    return progress?.value || { completed: false, currentStep: 'welcome', completedSteps: [] };
}

function setOnboardingProgress(userId, progress) {
    stmts.setConfig(`onboarding_${userId}`, progress);
}

async function startOnboarding(member) {
    const userId = member.id;

    // Verificar si ya completó el onboarding
    const existing = getOnboardingProgress(userId);
    if (existing.completed) {
        return { alreadyCompleted: true };
    }

    // Dar recompensa inicial
    stmts.addMoney(userId, 25, 'balance');

    return await sendOnboardingStep(member, 'welcome');
}

async function sendOnboardingStep(member, stepId) {
    const step = ONBOARDING_STEPS.find(s => s.id === stepId);
    if (!step) return null;

    const embed = new EmbedBuilder()
        .setColor(config.COLORES?.PRINCIPAL || 0xBB86FC)
        .setTitle(step.title)
        .setDescription(step.description);

    if (step.fields) {
        step.fields.forEach(field => {
            embed.addFields(field);
        });
    }

    const components = [];

    // Si tiene acción de seleccionar roles
    if (step.action === 'select_roles') {
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('onboarding_select_roles')
            .setPlaceholder('Seleccioná los juegos que te interesan')
            .setMinValues(0)
            .setMaxValues(GAME_ROLES.length)
            .addOptions(GAME_ROLES.map(role => ({
                label: role.label,
                description: role.description,
                value: role.id
            })));

        components.push(new ActionRowBuilder().addComponents(selectMenu));
    }

    // Botones de navegación
    if (!step.isComplete) {
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`onboarding_prev:${stepId}`)
                    .setLabel('⬅️ Anterior')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(stepId === 'welcome'),
                new ButtonBuilder()
                    .setCustomId(`onboarding_next:${stepId}`)
                    .setLabel('Siguiente ➡️')
                    .setStyle(ButtonStyle.Primary)
            );
        components.push(buttons);
    } else {
        const completeButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('onboarding_complete')
                    .setLabel('🎉 ¡Empezar a Explorar!')
                    .setStyle(ButtonStyle.Success)
            );
        components.push(completeButton);
    }

    return { embed, components, step };
}

async function handleOnboardingInteraction(interaction, customId) {
    const userId = interaction.user.id;
    const member = interaction.member;

    if (customId === 'onboarding_complete') {
        // Completar onboarding
        setOnboardingProgress(userId, { completed: true, completedAt: Date.now() });

        // Dar recompensas
        stmts.addMoney(userId, 50, 'balance');
        const currentXp = stmts.getUser(userId)?.xp || 0;
        stmts.upsertUser({ id: userId, xp: currentXp + 100 });

        // Track para badges
        const { trackMessage } = require('./profileSystem');
        trackMessage(userId);

        const embed = new EmbedBuilder()
            .setColor(0x4CAF50)
            .setTitle('🎉 ¡Bienvenido a Prophet Gaming!')
            .setDescription('Ya completaste el proceso de bienvenida. ¡Disfruta la comunidad!')
            .addFields(
                { name: '🎁 Recibiste', value: '• **100 XP**\n• **75 monedas**', inline: true },
                { name: '📍 Próximos pasos', value: '• Presentate en #chat\n• Buscá gente para jugar\n• Explorá los comandos con `/help`', inline: true }
            );

        return await interaction.update({ embeds: [embed], components: [] });
    }

    if (customId.startsWith('onboarding_next:')) {
        const currentStepId = customId.split(':')[1];
        const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStepId);
        const nextStep = ONBOARDING_STEPS[currentIndex + 1];

        if (nextStep) {
            const { embed, components } = await sendOnboardingStep(member, nextStep.id);
            return await interaction.update({ embeds: [embed], components });
        }
    }

    if (customId.startsWith('onboarding_prev:')) {
        const currentStepId = customId.split(':')[1];
        const currentIndex = ONBOARDING_STEPS.findIndex(s => s.id === currentStepId);
        const prevStep = ONBOARDING_STEPS[currentIndex - 1];

        if (prevStep) {
            const { embed, components } = await sendOnboardingStep(member, prevStep.id);
            return await interaction.update({ embeds: [embed], components });
        }
    }
}

async function handleOnboardingRoleSelect(interaction) {
    const selectedGames = interaction.values;
    const member = interaction.member;
    const guild = interaction.guild;

    const roleMap = {
        valorant: config.ROLES_JUEGOS?.VALORANT || guild.roles.cache.find(r => r.name.toLowerCase().includes('valorant'))?.id,
        lol: config.ROLES_JUEGOS?.LOL || guild.roles.cache.find(r => r.name.toLowerCase().includes('league') || r.name.toLowerCase().includes('lol'))?.id,
        csgo: config.ROLES_JUEGOS?.CS2 || guild.roles.cache.find(r => r.name.toLowerCase().includes('cs2') || r.name.toLowerCase().includes('counter'))?.id,
        minecraft: config.ROLES_JUEGOS?.MINECRAFT || guild.roles.cache.find(r => r.name.toLowerCase().includes('minecraft'))?.id,
        gta: config.ROLES_JUEGOS?.GTA || guild.roles.cache.find(r => r.name.toLowerCase().includes('gta') || r.name.toLowerCase().includes('roleplay'))?.id,
        fortnite: config.ROLES_JUEGOS?.FORTNITE || guild.roles.cache.find(r => r.name.toLowerCase().includes('fortnite'))?.id,
        apex: config.ROLES_JUEGOS?.APEX || guild.roles.cache.find(r => r.name.toLowerCase().includes('apex'))?.id,
        fifa: config.ROLES_JUEGOS?.FIFA || guild.roles.cache.find(r => r.name.toLowerCase().includes('fifa') || r.name.toLowerCase().includes('fc'))?.id,
    };

    const assigned = [];
    for (const game of selectedGames) {
        const roleId = roleMap[game];
        if (roleId && !member.roles.cache.has(roleId)) {
            try {
                await member.roles.add(roleId, 'Onboarding - Rol de juego');
                const role = guild.roles.cache.get(roleId);
                if (role) assigned.push(role.name);
            } catch (e) {
                console.error(`Error asignando rol ${game}:`, e.message);
            }
        }
    }

    const responseEmbed = new EmbedBuilder()
        .setColor(0x4CAF50)
        .setDescription(assigned.length > 0
            ? `✅ Se te asignaron los roles: **${assigned.join(', ')}**`
            : 'No se asignaron nuevos roles.'
        );

    await interaction.reply({ embeds: [responseEmbed], ephemeral: true });
}

// ═══════════════════════════════════════════════════
//  SISTEMA DE RECOMENDACIONES
// ═══════════════════════════════════════════════════

function getPersonalizedRecommendations(member) {
    const recommendations = [];
    const user = stmts.getUser(member.id);

    // Basado en nivel
    if (!user || user.level < 5) {
        recommendations.push({
            icon: '📈',
            title: 'Sube de nivel',
            description: 'Participa en el chat y en canales de voz para subir de nivel y desbloquear beneficios.',
            action: 'Envía mensajes y únete a voz'
        });
    }

    // Basado en economía
    if (!user || user.balance < 100) {
        recommendations.push({
            icon: '💰',
            title: 'Reclama tu daily',
            description: 'No te olvides de usar `/daily` cada día para obtener monedas gratis.',
            action: 'Usa `/daily`'
        });
    }

    // Basado en roles
    const gamingRoles = ['valorant', 'lol', 'csgo', 'minecraft', 'gta', 'fortnite', 'apex'];
    const hasGamingRole = gamingRoles.some(roleName =>
        member.roles.cache.some(r => r.name.toLowerCase().includes(roleName))
    );

    if (!hasGamingRole) {
        recommendations.push({
            icon: '🎮',
            title: 'Elige tus juegos',
            description: 'Selecciona los juegos que te interesan para recibir notificaciones y acceder a canales específicos.',
            action: 'Usa el menú de roles'
        });
    }

    // Basado en misiones
    const activeQuests = stmts.getUserActiveQuests(member.id);
    if (activeQuests.length === 0) {
        recommendations.push({
            icon: '🎯',
            title: 'Obtén misiones',
            description: 'Usa `/misiones diarias` para obtener objetivos y ganar recompensas extra.',
            action: 'Usa `/misiones diarias`'
        });
    }

    return recommendations;
}

async function sendRecommendations(member) {
    const recommendations = getPersonalizedRecommendations(member);

    if (recommendations.length === 0) return null;

    const embed = new EmbedBuilder()
        .setColor(0xFFB74D)
        .setTitle('💡 Recomendaciones para ti')
        .setDescription('Basado en tu actividad, te sugerimos:');

    recommendations.forEach(rec => {
        embed.addFields({
            name: `${rec.icon} ${rec.title}`,
            value: `${rec.description}\n*${rec.action}*`,
            inline: false
        });
    });

    return embed;
}

module.exports = {
    ONBOARDING_STEPS,
    GAME_ROLES,
    getOnboardingProgress,
    setOnboardingProgress,
    startOnboarding,
    sendOnboardingStep,
    handleOnboardingInteraction,
    handleOnboardingRoleSelect,
    getPersonalizedRecommendations,
    sendRecommendations,
};

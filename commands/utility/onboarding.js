// ═══════════════════════════════════════════════════
//  COMANDO: /onboarding
//  Flujo de bienvenida guiado
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { startOnboarding, sendOnboardingStep, getOnboardingProgress, sendRecommendations } = require('../../modules/onboarding');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('onboarding')
        .setDescription('Inicia el tour de bienvenida del servidor')
        .addSubcommand(sub =>
            sub.setName('iniciar')
                .setDescription('Iniciar o continuar el tour de bienvenida')
        )
        .addSubcommand(sub =>
            sub.setName('recomendaciones')
                .setDescription('Ver recomendaciones personalizadas')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'iniciar') {
            return await handleStart(interaction);
        }

        if (subcommand === 'recomendaciones') {
            return await handleRecommendations(interaction);
        }
    }
};

async function handleStart(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const progress = getOnboardingProgress(member.id);

    if (progress.completed) {
        const embed = new EmbedBuilder()
            .setColor(0xFFB74D)
            .setTitle('ℹ️ Ya completaste el onboarding')
            .setDescription('Si querés ver el tour de nuevo, hablá con un administrador.')
            .addFields({
                name: '📅 Completado',
                value: progress.completedAt ? `<t:${Math.floor(progress.completedAt / 1000)}:R>` : 'Previamente'
            });

        return interaction.editReply({ embeds: [embed] });
    }

    // Iniciar o continuar desde el paso actual
    const stepId = progress.currentStep || 'welcome';
    const result = await sendOnboardingStep(member, stepId);

    if (!result) {
        return interaction.editReply({
            content: '❌ Hubo un error al iniciar el onboarding.',
        });
    }

    await interaction.editReply({
        embeds: [result.embed],
        components: result.components
    });
}

async function handleRecommendations(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = await sendRecommendations(interaction.member);

    if (!embed) {
        return interaction.editReply({
            content: '✅ ¡Ya estás al día con todas las recomendaciones!',
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

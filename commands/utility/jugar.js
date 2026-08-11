const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const AuthManager = require('../../games/common/authManager');
const config = require('../../config');

const GAME_META = {
    hub: { path: 'hub', name: 'Prophet Games Hub', emoji: '🌐' },
    tycoon: { path: 'tycoon', name: 'Tycoon de Servidores', emoji: '🕹️' },
    casino: { path: 'casino', name: 'Casino Prophet', emoji: '🎰' },
    trivia: { path: 'trivia', name: 'Trivia Party', emoji: '🎨' },
    cards: { path: 'cards', name: 'Truco & Blackjack', emoji: '🃏' },
    survivor: { path: 'survivor', name: 'Prophet Survivor 2D', emoji: '👾' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jugar')
        .setDescription('🎮 Abrí Prophet Games (Discord Activity o link de sesión)')
        .addStringOption(option =>
            option.setName('juego')
                .setDescription('Juego al que querés entrar')
                .setRequired(false)
                .addChoices(
                    { name: '🌐 Hub (todos)', value: 'hub' },
                    { name: '🕹️ Tycoon de Servidores', value: 'tycoon' },
                    { name: '🎰 Casino Prophet', value: 'casino' },
                    { name: '🎨 Trivia Party', value: 'trivia' },
                    { name: '🃏 Truco & Blackjack', value: 'cards' },
                    { name: '👾 Prophet Survivor 2D', value: 'survivor' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const selected = interaction.options.getString('juego') || 'hub';
        const meta = GAME_META[selected] || GAME_META.hub;
        const userId = interaction.user.id;

        // Token de sesión para browser / fallback (2h)
        const sessionToken = AuthManager.createSession(userId, 120);
        try {
            const { stmts } = require('../../database');
            if (stmts.upsertUser) stmts.upsertUser({ id: userId });
        } catch (_) { /* no-op */ }

        const baseUrl = (process.env.GAMES_BASE_URL || `http://127.0.0.1:3850/games`).replace(/\/$/, '');
        const gameUrl = `${baseUrl}/${meta.path}/index.html?token=${sessionToken}`;

        const activityEnabled = Boolean(
            process.env.DISCORD_CLIENT_ID
            || process.env.DISCORD_CLIENT_SECRET
            || process.env.ACTIVITY_CLIENT_ID
        );
        const activityAppId = process.env.DISCORD_CLIENT_ID
            || process.env.ACTIVITY_CLIENT_ID
            || '';

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({
                name: 'PROPHET GAMES',
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTitle(`${meta.emoji} ${meta.name}`)
            .setDescription(
                activityEnabled
                    ? (
                        `**Modo recomendado: Discord Activity**\n` +
                        `1. Entrá a un **canal de voz**\n` +
                        `2. Abrí el **App Launcher** (🚀 / Activities)\n` +
                        `3. Buscá **Prophet Games** y dale Launch\n\n` +
                        `La Activity usa tu cuenta de Discord automáticamente (economía, monedas, ranking).\n\n` +
                        `---\n` +
                        `También podés abrir el juego en el **navegador** con el botón de abajo (sesión 2h).`
                    )
                    : (
                        `Abrí el juego con el botón de abajo.\n\n` +
                        `> 🔐 Sesión vinculada a tu cuenta Discord\n` +
                        `> ⏳ Válida 2 horas\n` +
                        `> 💰 Economía en tiempo real\n\n` +
                        `_Para jugar **dentro de Discord** (Activity), configurá ` +
                        `\`DISCORD_CLIENT_ID\` + \`DISCORD_CLIENT_SECRET\` y habilitá Activities en el Developer Portal. ` +
                        `Ver \`docs/DISCORD_ACTIVITIES.md\`._`
                    )
            )
            .setFooter({ text: 'Prophet Gaming · Discord Activities' })
            .setTimestamp();

        if (activityEnabled && activityAppId) {
            embed.addFields({
                name: 'Activity App ID',
                value: `\`${activityAppId}\``,
                inline: true
            });
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Abrir en navegador')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};

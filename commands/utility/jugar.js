const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const AuthManager = require('../../games/common/authManager');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jugar')
        .setDescription('🎮 Abre el portal de juegos web y mini-juegos de Prophet')
        .addStringOption(option =>
            option.setName('juego')
                .setDescription('Juego directo al que querés entrar')
                .setRequired(false)
                .addChoices(
                    { name: '🕹️ Tycoon de Servidores (Idle)', value: 'tycoon' },
                    { name: '🎰 Casino Prophet (Crash, Ruleta, Cajas)', value: 'casino' },
                    { name: '🎨 Trivia Party Game (Kahoot)', value: 'trivia' },
                    { name: '🃏 Truco & Blackjack Multiplayer', value: 'cards' },
                    { name: '👾 Prophet Survivor 2D (Arcade)', value: 'survivor' },
                    { name: '🌐 Prophet Games Hub (Todos)', value: 'hub' }
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const selectedGame = interaction.options.getString('juego') || 'hub';
        const userId = interaction.user.id;

        // Generar token temporal de 2 horas
        const sessionToken = AuthManager.createSession(userId, 120);

        // Host / URL del servidor de juegos (por defecto puerto 3850 o dashboard host)
        const baseUrl = process.env.GAMES_BASE_URL || `http://127.0.0.1:3850/games`;
        let targetPath = 'hub';
        let gameName = 'Prophet Games Hub';
        if (selectedGame === 'tycoon') {
            targetPath = 'tycoon';
            gameName = 'Tycoon de Servidores';
        } else if (selectedGame === 'casino') {
            targetPath = 'casino';
            gameName = 'Casino Prophet';
        } else if (selectedGame === 'trivia') {
            targetPath = 'trivia';
            gameName = 'Trivia Party Game';
        } else if (selectedGame === 'cards') {
            targetPath = 'cards';
            gameName = 'Truco & Blackjack Multiplayer';
        } else if (selectedGame === 'survivor') {
            targetPath = 'survivor';
            gameName = 'Prophet Survivor 2D';
        }
        const gameUrl = `${baseUrl}/${targetPath}/index.html?token=${sessionToken}`;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({
                name: '🎮 PROPHET GAMES HUB',
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTitle('¡Tu sesión de juego está lista!')
            .setDescription(
                `Hacé clic en el botón de abajo para ingresar a **${gameName}**.\n\n` +
                `> 🔐 **Sesión:** Vinculada automáticamente a tu cuenta.\n` +
                `> ⏳ **Validez del enlace:** 2 horas.\n` +
                `> 💰 **Economía:** Tus compras y ganancias se guardan en tiempo real.`
            )
            .setFooter({ text: 'Prophet Gaming · Discord Web Activities' })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('▶️ ENTRAR A JUGAR')
                .setStyle(ButtonStyle.Link)
                .setURL(gameUrl)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
    }
};

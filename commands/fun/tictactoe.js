const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('🎮 Juega al Tres en Raya (Tic Tac Toe) contra otro usuario')
        .addUserOption(option =>
            option.setName('oponente')
                .setDescription('El usuario contra el que quieres jugar')
                .setRequired(true)),
    async execute(interaction) {
        const oponente = interaction.options.getUser('oponente');

        if (oponente.bot) {
            return interaction.reply({ content: '❌ No puedes jugar contra un bot.', ephemeral: true });
        }
        if (oponente.id === interaction.user.id) {
            return interaction.reply({ content: '❌ No puedes jugar contra ti mismo.', ephemeral: true });
        }

        // Tablero inicial (0-8)
        const board = Array(9).fill(null);
        let turn = interaction.user; // Empieza quien desafía

        // Función para generar filas de botones
        const getRows = () => {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const index = i * 3 + j;
                    const btn = new ButtonBuilder()
                        .setCustomId(`ttt_${index}`)
                        .setLabel(board[index] || '➖')
                        .setStyle(board[index] === '❌' ? ButtonStyle.Danger : board[index] === '⭕' ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setDisabled(!!board[index]);
                    row.addComponents(btn);
                }
                rows.push(row);
            }
            return rows;
        };

        const response = await interaction.reply({
            content: `🎮 **Tres en Raya**\n${interaction.user} (❌) vs ${oponente} (⭕)\nEs el turno de: ${turn}`,
            components: getRows(),
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000 // 1 minuto por partida o inactividad
        });

        collector.on('collect', async i => {
            if (i.user.id !== turn.id) {
                return i.reply({ content: '✋ No es tu turno.', ephemeral: true });
            }

            const index = parseInt(i.customId.split('_')[1]);
            board[index] = turn.id === interaction.user.id ? '❌' : '⭕';

            // Comprobar ganador
            const winner = checkWinner(board);
            if (winner) {
                collector.stop();
                return i.update({
                    content: `🏆 **¡Juego terminado!**\nGanador: ${turn}\n\n${interaction.user} (❌) vs ${oponente} (⭕)`,
                    components: getRows().map(row => {
                        row.components.forEach(btn => btn.setDisabled(true));
                        return row;
                    })
                });
            }

            // Comprobar empate
            if (board.every(cell => cell !== null)) {
                collector.stop();
                return i.update({
                    content: `🤝 **¡Es un empate!**\n\n${interaction.user} (❌) vs ${oponente} (⭕)`,
                    components: getRows().map(row => {
                        row.components.forEach(btn => btn.setDisabled(true));
                        return row;
                    })
                });
            }

            // Cambiar turno
            turn = turn.id === interaction.user.id ? oponente : interaction.user;
            await i.update({
                content: `🎮 **Tres en Raya**\n${interaction.user} (❌) vs ${oponente} (⭕)\nEs el turno de: ${turn}`,
                components: getRows()
            });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    content: '⏰ El tiempo se agotó. Juego cancelado.',
                    components: []
                });
            }
        });
    }
};

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontales
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Verticales
        [0, 4, 8], [2, 4, 6]             // Diagonales
    ];

    for (const [a, b, c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

// ═══ COMANDO: /tictactoe mejorado ═══
const {
    SlashCommandBuilder, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, ComponentType, EmbedBuilder
} = require('discord.js');
const config = require('../../config');

const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],   // Horizontales
    [0, 3, 6], [1, 4, 7], [2, 5, 8],   // Verticales
    [0, 4, 8], [2, 4, 6],           // Diagonales
];

function checkWinner(board) {
    for (const [a, b, c] of LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return null;
}

function buildRows(board, winLine = null, disabled = false) {
    const rows = [];
    for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < 3; c++) {
            const idx = r * 3 + c;
            const cell = board[idx];
            const inWinLine = winLine?.includes(idx);

            let style = ButtonStyle.Secondary;
            if (cell === '❌') style = inWinLine ? ButtonStyle.Success : ButtonStyle.Danger;
            if (cell === '⭕') style = inWinLine ? ButtonStyle.Success : ButtonStyle.Primary;

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${idx}`)
                    .setLabel(cell || '⬜')
                    .setStyle(style)
                    .setDisabled(disabled || !!cell)
            );
        }
        rows.push(row);
    }
    return rows;
}

function buildEmbed(jugador1, jugador2, turno, estado = null) {
    let desc = `> ${jugador1} (**❌**) vs ${jugador2} (**⭕**)\n\n`;

    if (!estado) {
        desc += `> 🎯 Turno de: **${turno.username}**`;
    } else {
        desc += estado;
    }

    return new EmbedBuilder()
        .setColor(
            !estado ? (config.COLORES.INFO || 0x42A5F5) :
                estado.includes('🏆') ? (config.COLORES.SUCCESS || 0x69F0AE) :
                    estado.includes('🤝') ? 0xFFB74D :
                        0x546E7A
        )
        .setAuthor({ name: '🎮  Tres en Raya  ·  Prophet Fun' })
        .setDescription(desc)
        .setFooter({ text: 'Prophet Fun  ·  60 segundos por turno' });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('🎮 Jugar Tres en Raya contra otro usuario')
        .addUserOption(o =>
            o.setName('oponente')
                .setDescription('Usuario contra quien jugar')
                .setRequired(true)),

    async execute(interaction) {
        const oponente = interaction.options.getUser('oponente');

        if (oponente.bot) {
            return interaction.reply({ content: '> ❌ No podés jugar contra un bot.', ephemeral: true });
        }
        if (oponente.id === interaction.user.id) {
            return interaction.reply({ content: '> ❌ No podés jugar contra vos mismo.', ephemeral: true });
        }

        const board = Array(9).fill(null);
        let turno = interaction.user; // Quien inicia usa ❌

        const response = await interaction.reply({
            embeds: [buildEmbed(interaction.user, oponente, turno)],
            components: buildRows(board),
            fetchReply: true,
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
        });

        collector.on('collect', async i => {
            // Solo el jugador de turno puede mover
            if (i.user.id !== turno.id) {
                return i.reply({ content: `> ✋ Esperá tu turno, ${i.user}!`, ephemeral: true });
            }

            const idx = parseInt(i.customId.split('_')[1]);
            board[idx] = turno.id === interaction.user.id ? '❌' : '⭕';

            const winner = checkWinner(board);
            if (winner) {
                // Encontrar los índices de la línea ganadora para colorear
                const winLine = LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]) || null;
                collector.stop('win');
                return i.update({
                    embeds: [buildEmbed(interaction.user, oponente, turno, `## 🏆 ¡**${turno.username}** ganó la partida!`)],
                    components: buildRows(board, winLine, true),
                });
            }

            if (board.every(c => c !== null)) {
                collector.stop('draw');
                return i.update({
                    embeds: [buildEmbed(interaction.user, oponente, turno, `## 🤝 ¡Empate! Nadie ganó.`)],
                    components: buildRows(board, null, true),
                });
            }

            // Cambiar turno
            turno = turno.id === interaction.user.id ? oponente : interaction.user;
            await i.update({
                embeds: [buildEmbed(interaction.user, oponente, turno)],
                components: buildRows(board),
            });
        });

        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    embeds: [buildEmbed(interaction.user, oponente, turno, `> ⏰ Tiempo agotado. Nadie jugó a tiempo.`)],
                    components: buildRows(board, null, true),
                }).catch(() => { });
            }
        });
    }
};

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

function createDeck() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    for (const suit of suits) {
        for (const val of values) {
            let num = parseInt(val);
            if (['J', 'Q', 'K'].includes(val)) num = 10;
            if (val === 'A') num = 11;
            deck.push({ name: `${val}${suit}`, value: num, raw: val });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function calculateHand(hand) {
    let sum = 0;
    let aces = 0;
    for (const card of hand) {
        sum += card.value;
        if (card.raw === 'A') aces++;
    }
    while (sum > 21 && aces > 0) { sum -= 10; aces--; }
    return sum;
}

function formatHand(hand) {
    return hand.map(c => `\`${c.name}\``).join('  ');
}

function handStrength(sum) {
    if (sum === 21) return '🔥 **¡21 exacto!**';
    if (sum >= 18) return '💪 Mano fuerte';
    if (sum >= 14) return '⚖️ Zona de riesgo';
    return '📉 Mano débil';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('🃏 Juega al Blackjack (21) usando tu economía')
        .addIntegerOption(o => o.setName('apuesta').setDescription('Cantidad a apostar').setRequired(true).setMinValue(1)),

    async execute(interaction) {
        const bet = interaction.options.getInteger('apuesta');
        const userId = interaction.user.id;

        const eco = stmts.getEconomy(userId);
        if (eco.balance < bet) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '🃏  Blackjack · Fondos Insuficientes' })
                    .setDescription(
                        `> ❌ **No tenés suficiente saldo.**\n\n` +
                        `> 💰 Apuesta: \`${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}\`\n` +
                        `> 💵 Tu saldo: \`${config.ECONOMIA.CURRENCY} ${eco.balance.toLocaleString()}\``
                    )
                    .setFooter({ text: 'Usá /daily o /work para ganar más coins' })
                ],
                ephemeral: true
            });
        }

        stmts.removeMoney(userId, bet, 'balance');

        let deck = createDeck();
        let playerHand = [deck.pop(), deck.pop()];
        let dealerHand = [deck.pop(), deck.pop()];

        const getGameEmbed = (status = 'playing', showDealer = false) => {
            const playerSum = calculateHand(playerHand);
            const dealerSum = showDealer ? calculateHand(dealerHand) : dealerHand[0].value;
            const dealerHandStr = showDealer ? formatHand(dealerHand) : `\`${dealerHand[0].name}\`  \`❓\``;

            let color = config.COLORES.INFO || 0x3498db;
            let statusText = '';
            let footer = `Apuesta: ${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}  ·  Elegí tu jugada`;

            switch (status) {
                case 'win':
                    color = config.COLORES.SUCCESS || 0x2ecc71;
                    statusText = `## 🏆 ¡GANASTE!\n> Recibís **+${config.ECONOMIA.CURRENCY} ${(bet * 2).toLocaleString()}**`;
                    footer = `Ganancia final: +${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}`;
                    break;
                case 'lose':
                    color = config.COLORES.ERROR || 0xe74c3c;
                    statusText = `## 💀 PERDISTE\n> Perdiste **${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}**`;
                    footer = `Pérdida: -${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}`;
                    break;
                case 'tie':
                    color = config.COLORES.WARN || 0xf1c40f;
                    statusText = `## 🤝 EMPATE\n> Recuperás tu apuesta de **${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}**`;
                    footer = 'Empate — sin ganancias ni pérdidas';
                    break;
                case 'blackjack':
                    color = 0xBB86FC;
                    statusText = `## 🎰 ¡BLACKJACK!\n> ¡21 exacto! Ganás **x2.5** = **${config.ECONOMIA.CURRENCY} ${Math.floor(bet * 2.5).toLocaleString()}**`;
                    footer = `Premio especial: +${config.ECONOMIA.CURRENCY} ${Math.floor(bet * 1.5).toLocaleString()} extra`;
                    break;
                case 'bust':
                    color = config.COLORES.ERROR || 0xe74c3c;
                    statusText = `## 💥 ¡TE PASASTE!\n> Superaste 21 y perdiste **${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}**`;
                    footer = `Te pasaste de 21 con ${playerSum} puntos`;
                    break;
                default:
                    statusText = `> ${handStrength(playerSum)} · Decidí tu próxima jugada`;
                    footer = `Apuesta: ${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}  ·  ¡Buena suerte!`;
            }

            return new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: '🃏  Blackjack · Prophet Casino', iconURL: interaction.user.displayAvatarURL() })
                .setTitle(status === 'playing' ? '🃏 En juego...' : null)
                .setDescription(status !== 'playing' ? statusText : statusText)
                .addFields(
                    {
                        name: `🎩 Crupier (${showDealer ? dealerSum : '?'})`,
                        value: dealerHandStr,
                        inline: false
                    },
                    {
                        name: `🙋 Tu mano (${playerSum}) ${status === 'playing' ? handStrength(playerSum) : ''}`,
                        value: formatHand(playerHand),
                        inline: false
                    }
                )
                .setFooter({ text: footer, iconURL: interaction.guild.iconURL() });
        };

        const getButtons = (disable = false) => {
            const currEco = stmts.getEconomy(userId);
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hit').setLabel('Pedir carta').setEmoji('🃏').setStyle(ButtonStyle.Success).setDisabled(disable),
                new ButtonBuilder().setCustomId('stand').setLabel('Plantarse').setEmoji('✋').setStyle(ButtonStyle.Primary).setDisabled(disable),
                new ButtonBuilder().setCustomId('double').setLabel('Doblar apuesta').setEmoji('💰').setStyle(ButtonStyle.Danger)
                    .setDisabled(disable || playerHand.length > 2 || currEco.balance < bet)
            );
        };

        const initialSum = calculateHand(playerHand);
        let finalStatus = 'playing';

        // Blackjack inmediato
        if (initialSum === 21) {
            const dealerSum = calculateHand(dealerHand);
            if (dealerSum === 21) {
                finalStatus = 'tie';
                stmts.addMoney(userId, bet, 'balance');
            } else {
                finalStatus = 'blackjack';
                stmts.addMoney(userId, Math.floor(bet * 2.5), 'balance');
            }
            return interaction.reply({ embeds: [getGameEmbed(finalStatus, true)], components: [] });
        }

        const msg = await interaction.reply({
            embeds: [getGameEmbed('playing', false)],
            components: [getButtons(false)],
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 90000,
            filter: i => i.user.id === interaction.user.id
        });

        let currentBet = bet;

        collector.on('collect', async i => {
            if (i.customId === 'hit') {
                playerHand.push(deck.pop());
                const sum = calculateHand(playerHand);
                if (sum > 21) {
                    collector.stop('ended');
                    await i.update({ embeds: [getGameEmbed('bust', true)], components: [getButtons(true)] });
                } else {
                    await i.update({ embeds: [getGameEmbed('playing', false)], components: [getButtons(false)] });
                }
            }
            else if (i.customId === 'double') {
                stmts.removeMoney(userId, currentBet, 'balance');
                currentBet *= 2;
                playerHand.push(deck.pop());
                const sum = calculateHand(playerHand);
                if (sum > 21) {
                    collector.stop('ended');
                    await i.update({ embeds: [getGameEmbed('bust', true)], components: [getButtons(true)] });
                } else {
                    playDealer();
                    collector.stop('ended');
                    await i.update({ embeds: [getGameEmbed(finalStatus, true)], components: [getButtons(true)] });
                }
            }
            else if (i.customId === 'stand') {
                playDealer();
                collector.stop('ended');
                await i.update({ embeds: [getGameEmbed(finalStatus, true)], components: [getButtons(true)] });
            }
        });

        function playDealer() {
            let pSum = calculateHand(playerHand);
            let dSum = calculateHand(dealerHand);
            while (dSum < 17) { dealerHand.push(deck.pop()); dSum = calculateHand(dealerHand); }

            if (dSum > 21) { finalStatus = 'win'; stmts.addMoney(userId, currentBet * 2, 'balance'); }
            else if (dSum > pSum) { finalStatus = 'lose'; }
            else if (dSum < pSum) { finalStatus = 'win'; stmts.addMoney(userId, currentBet * 2, 'balance'); }
            else { finalStatus = 'tie'; stmts.addMoney(userId, currentBet, 'balance'); }
        }

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                // Tiempo agotado: devolver apuesta
                stmts.addMoney(userId, currentBet, 'balance');
                interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(0x546E7A)
                        .setAuthor({ name: '🃏  Blackjack · Tiempo agotado' })
                        .setDescription(`> ⏰ Se acabó el tiempo — Tu apuesta de **${config.ECONOMIA.CURRENCY} ${currentBet.toLocaleString()}** fue devuelta.`)
                        .setFooter({ text: 'Prophet Casino  ·  Tiempo límite: 90 segundos' })
                    ],
                    components: []
                }).catch(() => { });
            }
        });
    }
};

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
    // Shuffle
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
    while (sum > 21 && aces > 0) {
        sum -= 10;
        aces--;
    }
    return sum;
}

function formatHand(hand) {
    return hand.map(c => c.name).join(' | ');
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
                content: `❌ **No tienes suficiente saldo.**\nTu saldo actual: ${config.ECONOMIA.CURRENCY} ${eco.balance.toLocaleString()}`,
                ephemeral: true
            });
        }

        // Cobrar apuesta initial
        stmts.removeMoney(userId, bet, 'balance');

        let deck = createDeck();
        let playerHand = [deck.pop(), deck.pop()];
        let dealerHand = [deck.pop(), deck.pop()];

        const getGameEmbed = (status = 'playing', showDealer = false) => {
            const playerSum = calculateHand(playerHand);
            let dealerSum = calculateHand(showDealer ? dealerHand : [dealerHand[0]]);
            let dealerHandStr = showDealer ? formatHand(dealerHand) : `${dealerHand[0].name} | ❓`;

            let color = config.COLORES.INFO || 0x3498db;
            let statusText = 'Elige tu jugada:';

            if (status === 'win') { color = config.COLORES.SUCCESS || 0x2ecc71; statusText = `🏆 **¡Ganaste!** (+${bet * 2})`; }
            else if (status === 'lose') { color = config.COLORES.ERROR || 0xe74c3c; statusText = `💀 **Perdiste...** (-${bet})`; }
            else if (status === 'tie') { color = config.COLORES.WARN || 0xf1c40f; statusText = `🤝 **Empate.** (Recuperas ${bet})`; }
            else if (status === 'blackjack') { color = config.COLORES.PRINCIPAL || 0xBB86FC; statusText = `🔥 **¡BLACKJACK!** (+${Math.floor(bet * 2.5)})`; }
            else if (status === 'bust') { color = config.COLORES.ERROR || 0xe74c3c; statusText = `💥 **¡Te pasaste de 21!** (-${bet})`; }

            const embed = new EmbedBuilder()
                .setTitle('🃏 Blackjack')
                .setColor(color)
                .setDescription(`**Apuesta:** ${config.ECONOMIA.CURRENCY} ${bet.toLocaleString()}\n\n${statusText}`)
                .addFields(
                    { name: `Crupier (${showDealer ? dealerSum : dealerHand[0].value})`, value: dealerHandStr, inline: false },
                    { name: `Tu Mano (${playerSum})`, value: formatHand(playerHand), inline: false }
                )
                .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

            return embed;
        };

        const getButtons = (disable = false) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('hit').setLabel('Pedir (Hit)').setStyle(ButtonStyle.Success).setDisabled(disable),
                new ButtonBuilder().setCustomId('stand').setLabel('Plantarse (Stand)').setStyle(ButtonStyle.Primary).setDisabled(disable),
                new ButtonBuilder().setCustomId('double').setLabel('Doblar (x2)').setStyle(ButtonStyle.Danger).setDisabled(disable || playerHand.length > 2 || (stmts.getEconomy(userId).balance < bet))
            );
        };

        const initialSum = calculateHand(playerHand);
        let finalStatus = 'playing';

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
            embeds: [getGameEmbed(finalStatus, false)],
            components: [getButtons(false)],
            fetchReply: true
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: i => i.user.id === interaction.user.id
        });

        let currentBet = bet;

        collector.on('collect', async i => {
            if (i.customId === 'hit') {
                playerHand.push(deck.pop());
                const sum = calculateHand(playerHand);

                if (sum > 21) {
                    collector.stop();
                    await i.update({ embeds: [getGameEmbed('bust', true)], components: [getButtons(true)] });
                } else {
                    await i.update({ embeds: [getGameEmbed('playing', false)], components: [getButtons(false)] });
                }
            }
            else if (i.customId === 'double') {
                // Doblar la apuesta
                stmts.removeMoney(userId, currentBet, 'balance');
                currentBet *= 2;
                playerHand.push(deck.pop());
                const sum = calculateHand(playerHand);

                if (sum > 21) {
                    collector.stop();
                    await i.update({ embeds: [getGameEmbed('bust', true)], components: [getButtons(true)] });
                } else {
                    // Turno del dealer (porque te plantas al doblar obligatoriamente)
                    playDealer();
                    collector.stop();
                    await i.update({ embeds: [getGameEmbed(finalStatus, true)], components: [getButtons(true)] });
                }
            }
            else if (i.customId === 'stand') {
                playDealer();
                collector.stop();
                await i.update({ embeds: [getGameEmbed(finalStatus, true)], components: [getButtons(true)] });
            }
        });

        function playDealer() {
            let pSum = calculateHand(playerHand);
            let dSum = calculateHand(dealerHand);

            while (dSum < 17) {
                dealerHand.push(deck.pop());
                dSum = calculateHand(dealerHand);
            }

            if (dSum > 21) {
                finalStatus = 'win';
                stmts.addMoney(userId, currentBet * 2, 'balance');
            } else if (dSum > pSum) {
                finalStatus = 'lose';
            } else if (dSum < pSum) {
                finalStatus = 'win';
                stmts.addMoney(userId, currentBet * 2, 'balance');
            } else {
                finalStatus = 'tie';
                stmts.addMoney(userId, currentBet, 'balance'); // Devuelve la apuesta
            }
        }

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({
                    content: '⏰ El tiempo se agotó para elegir tu jugada.',
                    components: [getButtons(true)]
                });
            }
        });
    }
};

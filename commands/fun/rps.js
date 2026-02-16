const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('✌️ Juega Piedra, Papel o Tijera contra el bot'),
    async execute(interaction) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('rock')
                    .setLabel('Piedra')
                    .setEmoji('🪨')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('paper')
                    .setLabel('Papel')
                    .setEmoji('📄')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('scissors')
                    .setLabel('Tijera')
                    .setEmoji('✂️')
                    .setStyle(ButtonStyle.Danger),
            );

        const embed = new EmbedBuilder()
            .setTitle('Piedra, Papel o Tijera')
            .setDescription('Elige tu movimiento:')
            .setColor(0x3498db);

        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15000,
            filter: i => i.user.id === interaction.user.id
        });

        collector.on('collect', async i => {
            const choice = i.customId;
            const botChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];

            let result;
            if (choice === botChoice) result = 'tie';
            else if (
                (choice === 'rock' && botChoice === 'scissors') ||
                (choice === 'paper' && botChoice === 'rock') ||
                (choice === 'scissors' && botChoice === 'paper')
            ) result = 'win';
            else result = 'lose';

            const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };

            let description = `Tú elegiste **${emojis[choice]}**\nEl bot eligió **${emojis[botChoice]}**\n\n`;

            if (result === 'tie') description += '🤝 **¡Es un empate!**';
            else if (result === 'win') description += '🏆 **¡Ganaste!**';
            else description += '🤖 **¡Perdiste!**';

            const resultEmbed = new EmbedBuilder()
                .setTitle('Resultado')
                .setDescription(description)
                .setColor(result === 'win' ? 0x2ecc71 : result === 'tie' ? 0xf1c40f : 0xe74c3c);

            await i.update({ embeds: [resultEmbed], components: [] });
            collector.stop('played');
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'played') {
                interaction.editReply({ content: '⏰ Tiempo agotado.', components: [] });
            }
        });
    }
};

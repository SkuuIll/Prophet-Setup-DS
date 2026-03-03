// ═══ COMANDO: /rps mejorado ═══
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const ELECCIONES = {
    rock: { emoji: '🪨', label: 'Piedra', gana: 'scissors' },
    paper: { emoji: '📄', label: 'Papel', gana: 'rock' },
    scissors: { emoji: '✂️', label: 'Tijera', gana: 'paper' },
};

const WIN_PHRASES = ['¡Sos tremendo!', '¡Dominaste!', '¡Increíble!', 'GG EZ 😤', '¡La mejor jugada!'];
const LOSE_PHRASES = ['¡Me ganaste la mente!', 'Buen intento...', 'Suerte la próxima.', 'El bot gana siempre. 🤖', '¡Revanchaaa!'];
const TIE_PHRASES = ['Gran mente piensa igual.', 'Nos copiamos mutuamente.', 'Como si nos conociéramos.', '¿Acordamos esto?'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('✌️ Jugar Piedra, Papel o Tijera contra el bot'),

    async execute(interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rock').setLabel('Piedra').setEmoji('🪨').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('paper').setLabel('Papel').setEmoji('📄').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('scissors').setLabel('Tijera').setEmoji('✂️').setStyle(ButtonStyle.Danger),
        );

        const embedEspera = new EmbedBuilder()
            .setColor(config.COLORES.INFO || 0x42A5F5)
            .setAuthor({ name: '✌️  Piedra, Papel o Tijera  ·  Prophet Fun', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `> ${interaction.user} **vs** 🤖 Prophet Bot\n\n` +
                `> Elegí tu movimiento. ¡Tenés **15 segundos**!`
            )
            .setFooter({ text: 'Prophet Fun  ·  ¡Suerte!' });

        const response = await interaction.reply({ embeds: [embedEspera], components: [row], fetchReply: true });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15000,
            filter: i => i.user.id === interaction.user.id,
        });

        collector.on('collect', async i => {
            const elegido = i.customId;
            const botElegido = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
            const eEl = ELECCIONES[elegido];
            const eBot = ELECCIONES[botElegido];

            let resultado, color, header, subPhrase;

            if (elegido === botElegido) {
                resultado = 'tie';
                color = 0xFFB74D;
                header = '🤝  ¡Empate!';
                subPhrase = TIE_PHRASES[Math.floor(Math.random() * TIE_PHRASES.length)];
            } else if (eEl.gana === botElegido) {
                resultado = 'win';
                color = config.COLORES.SUCCESS || 0x69F0AE;
                header = '🏆  ¡Ganaste!';
                subPhrase = WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)];
            } else {
                resultado = 'lose';
                color = config.COLORES.ERROR || 0xEF5350;
                header = '🤖  ¡El bot gana!';
                subPhrase = LOSE_PHRASES[Math.floor(Math.random() * LOSE_PHRASES.length)];
            }

            // Botones deshabilitados mostrando qué eligió cada uno
            const disabledRow = new ActionRowBuilder().addComponents(
                ['rock', 'paper', 'scissors'].map(op =>
                    new ButtonBuilder()
                        .setCustomId(op)
                        .setLabel(ELECCIONES[op].label)
                        .setEmoji(ELECCIONES[op].emoji)
                        .setStyle(
                            op === elegido ? ButtonStyle.Success :
                                op === botElegido ? ButtonStyle.Danger :
                                    ButtonStyle.Secondary
                        )
                        .setDisabled(true)
                )
            );

            const resultEmbed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: `✌️  Piedra, Papel o Tijera  ·  Prophet Fun`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `## ${header}\n\n` +
                    `> ${interaction.user} eligió **${eEl.emoji} ${eEl.label}**\n` +
                    `> 🤖 Bot eligió **${eBot.emoji} ${eBot.label}**\n\n` +
                    `> *${subPhrase}*`
                )
                .setFooter({ text: `${interaction.user.username}  ·  Prophet Fun` })
                .setTimestamp();

            await i.update({ embeds: [resultEmbed], components: [disabledRow] });
            collector.stop('played');
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'played') {
                const timeoutRow = new ActionRowBuilder().addComponents(
                    ['rock', 'paper', 'scissors'].map(op =>
                        new ButtonBuilder().setCustomId(op).setLabel(ELECCIONES[op].label).setEmoji(ELECCIONES[op].emoji).setStyle(ButtonStyle.Secondary).setDisabled(true)
                    )
                );
                interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(0x546E7A)
                        .setDescription('> ⏰ Tiempo agotado. No elegiste a tiempo.')
                    ],
                    components: [timeoutRow]
                }).catch(() => { });
            }
        });
    }
};

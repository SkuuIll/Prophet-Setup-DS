// ═══ COMANDO: /coinflip ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Lanzar una moneda — ¿Cara o Cruz?'),

    async execute(interaction) {
        // ── Suspense: mostrar moneda girando ──
        await interaction.deferReply();

        const spinEmbed = new EmbedBuilder()
            .setColor(0xFFB74D)
            .setAuthor({ name: '🪙  Coin Flip · Prophet Fun' })
            .setDescription(`> 🌀 **Lanzando la moneda...**\n> *¿Cara o Cruz?*`)
            .setFooter({ text: `Lanzada por ${interaction.user.username}` });

        await interaction.editReply({ embeds: [spinEmbed] });

        // ── Resultado con delay de suspenso ──
        await new Promise(r => setTimeout(r, 1800));

        const esCara = Math.random() > 0.5;
        const resultado = esCara ? 'Cara' : 'Cruz';
        const emoji = esCara ? '🌕' : '🌑';
        const colorRes = esCara ? 0xFFD700 : 0x78909C;
        const frase = esCara
            ? ['¡La moneda brilla al caer!', '¡El lado dorado al frente!', '¡Cara! ¡La suerte sonríe!'][Math.floor(Math.random() * 3)]
            : ['¡Cruz! El destino habló.', '¡El lado oscuro gana!', '¡Cruz! ¿Otra vez?'][Math.floor(Math.random() * 3)];

        const resultEmbed = new EmbedBuilder()
            .setColor(colorRes)
            .setAuthor({ name: '🪙  Coin Flip · Resultado', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `> ${emoji} **¡${resultado.toUpperCase()}!**\n` +
                `> *${frase}*`
            )
            .setFooter({ text: `Lanzada por ${interaction.user.username}  ·  Prophet Fun` })
            .setTimestamp();

        await interaction.editReply({ embeds: [resultEmbed] });
    }
};

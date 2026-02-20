// ═══ COMANDO: /coinflip ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Lanzar una moneda — ¿Cara o Cruz?'),

    async execute(interaction) {
        const esCara = Math.random() > 0.5;
        const resultado = esCara ? 'Cara' : 'Cruz';
        const emoji = esCara ? '🌕' : '🌑';

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: '🪙  Coin Flip' })
            .setDescription(`> La moneda giró y cayó en...\n\n> ${emoji} **¡${resultado}!**`)
            .setFooter({ text: `Lanzada por ${interaction.user.username}  ·  Prophet Fun` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

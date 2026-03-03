// ═══ COMANDO: /gamble ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const WIN_PHRASES = [
    '🎉 ¡La ruleta giró a tu favor!',
    '💫 ¡Los astros te sonrieron esta vez!',
    '🔥 ¡Instinto de campeón, puro juego!',
    '⚡ ¡Un golpe de suerte legendario!',
    '🤑 ¡El dinero llegó solo, rey!',
];

const LOSE_PHRASES = [
    '📉 La ruleta fue implacable...',
    '😬 La suerte te dio la espalda.',
    '💀 El casino siempre gana... hoy.',
    '🌧️ Mala racha, mañana mejor.',
    '🎲 El azar no perdonó esta vez.',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('🎰 Apostar dinero — ¡Doble o Nada!')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad a apostar').setMinValue(10).setRequired(true)),

    async execute(interaction) {
        const amount = interaction.options.getInteger('cantidad');
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);

        if (eco.balance < amount) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setAuthor({ name: '🎰  Fondos Insuficientes' })
                .setDescription(
                    `> ❌ **No tenés suficiente saldo.**\n\n` +
                    `> 💰 Apuesta: **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**\n` +
                    `> 💵 Tu saldo: **${config.ECONOMIA.CURRENCY} ${eco.balance.toLocaleString()}**`
                )
                .setFooter({ text: 'Prophet Economy  ·  Usá /work o /daily para ganar más' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ── Suspense ──
        await interaction.deferReply();

        const spinEmbed = new EmbedBuilder()
            .setColor(0x9C27B0)
            .setAuthor({ name: '🎰  Casino Prophet · Girando...' })
            .setDescription(
                `> 🎲 Apostando **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**...\n` +
                `> *Los dados están en el aire...*`
            );
        await interaction.editReply({ embeds: [spinEmbed] });

        await new Promise(r => setTimeout(r, 1600));

        const win = Math.random() > 0.5;
        const phrase = win
            ? WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)]
            : LOSE_PHRASES[Math.floor(Math.random() * LOSE_PHRASES.length)];

        if (win) {
            stmts.addMoney(userId, amount, 'balance');
            const newBal = eco.balance + amount;
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                .setAuthor({ name: '🎰  ¡GANASTE!' })
                .setDescription(
                    `> ${phrase}\n\n` +
                    `> 💰 **+${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**\n` +
                    `> 💵 Nuevo saldo: **${config.ECONOMIA.CURRENCY} ${newBal.toLocaleString()}**`
                )
                .setFooter({ text: 'Prophet Economy  ·  ¿Te animás a otra ronda?' })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        } else {
            stmts.removeMoney(userId, amount, 'balance');
            const newBal = Math.max(0, eco.balance - amount);
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setAuthor({ name: '🎰  PERDISTE...' })
                .setDescription(
                    `> ${phrase}\n\n` +
                    `> 💸 **-${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**\n` +
                    `> 💵 Nuevo saldo: **${config.ECONOMIA.CURRENCY} ${newBal.toLocaleString()}**`
                )
                .setFooter({ text: 'Prophet Economy  ·  Mejor suerte la próxima' })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    }
};

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
    cooldown: 5, // 5 segundos entre apuestas
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
            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        await interaction.deferReply();

        // ── Slot Machine ──
        const SYMBOLS = ['🍒', '🍋', '🍊', '💎', '7️⃣', '🔔', '⭐', '🍀'];
        const roll = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

        const s1 = roll(), s2 = roll(), s3 = roll();
        const slotDisplay = `\`╔══════════╗\`\n\`║\` ${s1} \`│\` ${s2} \`│\` ${s3} \`║\`\n\`╚══════════╝\``;

        // Animación de giro
        const spinEmbed = new EmbedBuilder()
            .setColor(0x9C27B0)
            .setAuthor({ name: '🎰  Casino Prophet · Girando...', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `> 🎲 Apostando **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**...\n\n` +
                `\`╔══════════╗\`\n\`║\` ❓ \`│\` ❓ \`│\` ❓ \`║\`\n\`╚══════════╝\`\n\n` +
                `> *Los rodillos están girando...*`
            );
        await interaction.editReply({ embeds: [spinEmbed] });
        await new Promise(r => setTimeout(r, 1800));

        // Determinar resultado
        let multiplier = 0;
        let resultLabel = '';

        if (s1 === s2 && s2 === s3) {
            // Triple — premio gordo
            multiplier = s1 === '7️⃣' ? 5 : s1 === '💎' ? 4 : 3;
            resultLabel = s1 === '7️⃣' ? '🎰 ¡¡¡JACKPOT!!!' : '🎰 ¡TRIPLE!';
        } else if (s1 === s2 || s2 === s3 || s1 === s3) {
            // Doble — gana x1.5
            multiplier = 1.5;
            resultLabel = '✨ ¡Par!';
        } else {
            // Nada
            multiplier = 0;
            resultLabel = '💀 Sin suerte';
        }

        const winnings = Math.floor(amount * multiplier);
        const netGain = winnings - amount;
        const phrase = multiplier > 0
            ? WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)]
            : LOSE_PHRASES[Math.floor(Math.random() * LOSE_PHRASES.length)];

        if (multiplier > 0) {
            // Ganó: agregar ganancia neta
            stmts.addMoney(userId, netGain, 'balance');
            const newBal = eco.balance + netGain;

            const embed = new EmbedBuilder()
                .setColor(multiplier >= 3 ? 0xFFD700 : config.COLORES.SUCCESS || 0x69F0AE)
                .setAuthor({ name: `🎰  ${resultLabel} (x${multiplier})`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `${slotDisplay}\n\n` +
                    `> ${phrase}\n\n` +
                    `> 💰 Apuesta: **${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**\n` +
                    `> 🏆 Ganancia: **+${config.ECONOMIA.CURRENCY} ${netGain.toLocaleString()}** (x${multiplier})\n` +
                    `> 💵 Nuevo saldo: **${config.ECONOMIA.CURRENCY} ${newBal.toLocaleString()}**`
                )
                .setFooter({ text: 'Prophet Casino  ·  ¿Otra ronda?' })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        } else {
            stmts.removeMoney(userId, amount, 'balance');
            const newBal = Math.max(0, eco.balance - amount);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setAuthor({ name: `🎰  ${resultLabel}`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `${slotDisplay}\n\n` +
                    `> ${phrase}\n\n` +
                    `> 💸 **-${config.ECONOMIA.CURRENCY} ${amount.toLocaleString()}**\n` +
                    `> 💵 Nuevo saldo: **${config.ECONOMIA.CURRENCY} ${newBal.toLocaleString()}**`
                )
                .setFooter({ text: 'Prophet Casino  ·  Mejor suerte la próxima' })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    }
};

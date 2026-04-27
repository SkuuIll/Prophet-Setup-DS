// ═══ COMANDO: /daily ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const DAILY_FRASES = [
    '☀️ ¡Nuevo día, nuevas oportunidades!',
    '🌟 ¡Tu streak sigue firme, sigue así!',
    '🎁 ¡El servidor te lo agradece!',
    '💪 ¡Consistencia es la clave del éxito!',
    '🔥 ¡Otro día, más poder económico!',
    '🎯 ¡Un día más, un paso más cerca del top!',
    '🏆 ¡Los campeones no faltan su daily!',
    '🎮 ¡GG, le caíste al bot a tiempo!',
    '⚡ ¡Sos un máquina de constancia!',
    '🦅 ¡El que madruga, coins cosecha!',
    '🎲 ¡La fortuna favorece a los constantes!',
    '🚀 ¡Otro daily, otro paso al ranking #1!',
    '🌙 ¡Tardaste pero llegaste, lo que importa!',
    '🧠 ¡Cerebro de gamer, nunca olvida el daily!',
    '🏅 ¡Sos de los que no fallan, puro pro!',
    '🪖 ¡Circle cerrado, coins ganadas!',
    '🔫 ¡Drop de coins, agárralo antes que otro!',
    '💥 ¡Boom! Coins cayendo del cielo.',
    '🎧 ¡Concentrado o no, el daily no espera!',
    '🌅 ¡Primera partida del día: reclamar el daily. Victoria!',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('📅 Reclamar tu recompensa diaria'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);
        const ahora = Date.now();
        const cooldown = config.ECONOMIA.DAILY_COOLDOWN;

        if (ahora - eco.last_daily < cooldown) {
            const restante = cooldown - (ahora - eco.last_daily);
            const horas = Math.floor(restante / 3600000);
            const minutos = Math.floor((restante % 3600000) / 60000);

            // Barra de progreso del cooldown
            const totalMs = cooldown;
            const pasado = totalMs - restante;
            const pct = Math.round((pasado / totalMs) * 10);
            const barraCD = '🟩'.repeat(pct) + '⬛'.repeat(10 - pct);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setAuthor({ name: '📅  Daily · Todavía no es la hora', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `> ⏳ **Volvé en ${horas > 0 ? `${horas}h ` : ''}${minutos}m** para reclamar tu próxima recompensa.\n\n` +
                    `> Progreso del cooldown:\n` +
                    `> ${barraCD} \`${Math.round((pasado / totalMs) * 100)}%\``
                )
                .setFooter({ text: 'Prophet Economy  ·  Una recompensa por día' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const reward = Math.floor(Math.random() * (config.ECONOMIA.DAILY_MAX - config.ECONOMIA.DAILY_MIN + 1)) + config.ECONOMIA.DAILY_MIN;
        const frase = DAILY_FRASES[Math.floor(Math.random() * DAILY_FRASES.length)];

        stmts.addMoney(userId, reward, 'balance');
        stmts.setEconomy(userId, 'last_daily', ahora);

        const nuevoSaldo = stmts.getEconomy(userId);

        // Racha de días consecutivos
        const user = stmts.getUser(userId);
        const streak = user?.message_streak || 0;
        const streakText = streak >= 7
            ? `\n> 🔥🔥 **Racha ÉPICA:** ${streak} días seguidos — ¡imparable!`
            : streak >= 3
            ? `\n> 🔥 **Racha activa:** ${streak} días seguidos — ¡así se hace!`
            : streak >= 1
            ? `\n> ✅ Llevas **${streak} día${streak > 1 ? 's' : ''}** seguido${streak > 1 ? 's' : ''}.`
            : '';

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '📅  Recompensa Diaria · ¡Reclamada!', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `> ${frase}\n\n` +
                `> 🎁 **+${config.ECONOMIA.CURRENCY} ${reward.toLocaleString()}** recibidos\n` +
                `> 💵 Saldo actual: **${config.ECONOMIA.CURRENCY} ${nuevoSaldo.balance.toLocaleString()}**` +
                streakText
            )
            .setFooter({ text: 'Prophet Economy  ·  Volvé mañana por más' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

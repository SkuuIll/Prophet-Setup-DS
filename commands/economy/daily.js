// ═══ COMANDO: /daily ═══
const { SlashCommandBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');
const { makeEmbed, notice } = require('../../utils/discordUI');

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
        .setDescription('Reclamar tu recompensa diaria'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const now = Date.now();
        const cooldown = config.ECONOMIA.DAILY_COOLDOWN;
        const wallet = stmts.getEconomy(userId);
        const until = (wallet.last_daily || 0) + cooldown;
        if (now < until) {
            return interaction.reply(notice({
                title: 'Recompensa diaria en espera',
                description: 'Ya reclamaste tu recompensa. Volvé <t:' + Math.floor(until / 1000) + ':R>.',
                tone: 'warning',
            }));
        }

        const coins = Math.floor(Math.random() *
            (config.ECONOMIA.DAILY_MAX - config.ECONOMIA.DAILY_MIN + 1)) + config.ECONOMIA.DAILY_MIN;
        const claim = stmts.claimTimedReward(userId, 'daily', coins, now, cooldown);
        if (!claim.success) {
            return interaction.reply(notice({
                title: 'No se pudo reclamar',
                description: 'Es posible que ya hayas cobrado tu recompensa o que tu saldo haya alcanzado el límite.',
                tone: 'warning',
            }));
        }
        const phrase = DAILY_FRASES[Math.floor(Math.random() * DAILY_FRASES.length)];
        return interaction.reply({
            embeds: [makeEmbed({
                title: 'Recompensa diaria recibida',
                tone: 'success',
                description: phrase + '\\nEl premio ya fue acreditado en tu cartera.',
                fields: [
                    { name: 'Recompensa', value: '**+' + config.ECONOMIA.CURRENCY + ' ' + coins.toLocaleString('es-AR') + '**', inline: true },
                    { name: 'Saldo disponible', value: '**' + config.ECONOMIA.CURRENCY + ' ' + claim.balance.toLocaleString('es-AR') + '**', inline: true },
                    { name: 'Próxima recompensa', value: '<t:' + Math.floor((now + cooldown) / 1000) + ':R>' },
                ],
                footer: 'Economía · /work · /balance',
                iconURL: interaction.user.displayAvatarURL?.(),
            })],
        });
    },
};

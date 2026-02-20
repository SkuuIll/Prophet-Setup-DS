// ═══ COMANDO: /work ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const TRABAJOS = [
    { text: '👵 Ayudaste a cruzar la calle a una anciana agradecida', emoji: '👵' },
    { text: '💻 Programaste un bot de Discord para un servidor', emoji: '💻' },
    { text: '🔧 Reparaste una PC gamer que no encendía', emoji: '🔧' },
    { text: '🏆 Ganaste un torneo de Valorant con tu equipo', emoji: '🏆' },
    { text: '⛏️ Minaste un bloque de diamante en Minecraft', emoji: '⛏️' },
    { text: '🍋 Pusiste un puesto de limonada y vendiste todo', emoji: '🍋' },
    { text: '🚗 Hiciste de Uber y llevaste a un streamer famoso', emoji: '🚗' },
    { text: '🎨 Diseñaste un logo épico para un clan de gaming', emoji: '🎨' },
    { text: '📦 Hiciste un delivery de comida en tiempo récord', emoji: '📦' },
    { text: '🎬 Editaste un video viral para un YouTuber', emoji: '🎬' },
    { text: '🛠️ Armaste un mueble de IKEA sin las instrucciones', emoji: '🛠️' },
    { text: '🐕 Paseaste perros en el parque toda la tarde', emoji: '🐕' },
    { text: '🎧 Fuiste DJ en una fiesta y la rompiste', emoji: '🎧' },
    { text: '📸 Sacaste fotos profesionales en un evento gamer', emoji: '📸' },
    { text: '🧹 Limpiaste el servidor de Discord y baneaste spam bots', emoji: '🧹' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('👷 Trabajar para ganar monedas'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);
        const ahora = Date.now();
        const cooldown = config.ECONOMIA.WORK_COOLDOWN;

        if (ahora - eco.last_work < cooldown) {
            const restante = cooldown - (ahora - eco.last_work);
            const minutos = Math.floor(restante / 60000);
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setDescription(`> ⏳ Estás cansado. Podés trabajar de nuevo en **${minutos} minutos**.`)
                .setFooter({ text: 'Prophet Economy' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const reward = Math.floor(Math.random() * (config.ECONOMIA.WORK_MAX - config.ECONOMIA.WORK_MIN + 1)) + config.ECONOMIA.WORK_MIN;
        const trabajo = TRABAJOS[Math.floor(Math.random() * TRABAJOS.length)];

        stmts.addMoney(userId, reward, 'balance');
        stmts.setEconomy(userId, 'last_work', ahora);

        const nuevoSaldo = stmts.getEconomy(userId);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '👷  Resultado del trabajo' })
            .setDescription(
                `> ${trabajo.text}\n\n` +
                `> 💰 **+${config.ECONOMIA.CURRENCY} ${reward.toLocaleString()}**\n` +
                `> 💵 Saldo actual: **${config.ECONOMIA.CURRENCY} ${nuevoSaldo.balance.toLocaleString()}**`
            )
            .setFooter({ text: 'Prophet Economy  ·  Trabajá cada 30 minutos' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

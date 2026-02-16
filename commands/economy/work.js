// ═══ COMANDO: /work ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const TRABAJOS = [
    '👵 Ayudaste a cruzar la calle a una anciana agradecida',
    '💻 Programaste un bot de Discord para un servidor',
    '🔧 Reparaste una PC gamer que no encendía',
    '🏆 Ganaste un torneo de Valorant con tu equipo',
    '⛏️ Minaste un bloque de diamante en Minecraft',
    '🍋 Pusiste un puesto de limonada y vendiste todo',
    '🚗 Hiciste de Uber y llevaste a un streamer famoso',
    '🎨 Diseñaste un logo épico para un clan de gaming',
    '📦 Hiciste un delivery de comida en tiempo récord',
    '🎬 Editaste un video viral para un YouTuber',
    '🛠️ Armaste un mueble de IKEA sin las instrucciones',
    '🐕 Paseaste perros en el parque toda la tarde',
    '🎧 Fuiste DJ en una fiesta y la rompiste',
    '📸 Sacaste fotos profesionales en un evento gamer',
    '🧹 Limpiaste el servidor de Discord y baneaste spam bots',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Trabajar para ganar monedas'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);
        const ahora = Date.now();
        const cooldown = config.ECONOMIA.WORK_COOLDOWN;

        if (ahora - eco.last_work < cooldown) {
            const restante = cooldown - (ahora - eco.last_work);
            const minutos = Math.floor(restante / 60000);
            return interaction.reply({
                content: `⏳ Estás cansado. Podés trabajar de nuevo en **${minutos} minutos**.`,
                ephemeral: true
            });
        }

        const reward = Math.floor(Math.random() * (config.ECONOMIA.WORK_MAX - config.ECONOMIA.WORK_MIN + 1)) + config.ECONOMIA.WORK_MIN;
        const trabajo = TRABAJOS[Math.floor(Math.random() * TRABAJOS.length)];

        stmts.addMoney(userId, reward, 'balance');
        stmts.setEconomy(userId, 'last_work', ahora);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS)
            .setTitle('👷 Trabajando...')
            .setDescription(`${trabajo} y ganaste **${config.ECONOMIA.CURRENCY} ${reward}**!`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

// ═══ COMANDO: /work ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const TRABAJOS = [
    'Ayudaste a cruzar la calle a una anciana',
    'Programaste un bot de Discord',
    'Reparaste una PC gamer',
    'Ganaste un torneo de Valorant',
    'Minaste un bloque de diamante',
    'Vendiste limonada',
    'Hiciste de Uber un rato'
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

// ═══ COMANDO: /8ball ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const RESPUESTAS = [
    'Sí, definitivamente.',
    'Es cierto.',
    'Sin duda.',
    'Sí.',
    'Probablemente.',
    'Tal vez.',
    'Preguntá de nuevo más tarde.',
    'Mejor no decurtelo ahora.',
    'No cuentes con ello.',
    'Mi respuesta es no.',
    'Mis fuentes dicen que no.',
    'Muy dudoso.'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Preguntale a la bola mágica')
        .addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta').setRequired(true)),

    async execute(interaction) {
        const pregunta = interaction.options.getString('pregunta');
        const respuesta = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle('🎱 Bola Mágica')
            .addFields(
                { name: 'Pregunta', value: pregunta },
                { name: 'Respuesta', value: respuesta }
            );

        await interaction.reply({ embeds: [embed] });
    }
};

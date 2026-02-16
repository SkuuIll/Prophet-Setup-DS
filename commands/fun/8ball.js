// ═══ COMANDO: /8ball ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const RESPUESTAS = [
    // Positivas
    'Sí, definitivamente. 🌟',
    'Es cierto, sin lugar a dudas.',
    'Sin duda alguna. ✅',
    '¡Por supuesto que sí!',
    'Todas las señales apuntan a que sí.',
    'Puedes contar con ello. 💯',
    // Neutrales
    'Probablemente.',
    'Tal vez... el destino es incierto. 🔮',
    'Preguntá de nuevo más tarde.',
    'Mejor no decírtelo ahora.',
    'Concentrate y volvé a preguntar.',
    'Las estrellas aún no se alinean. ⭐',
    // Negativas
    'No cuentes con ello.',
    'Mi respuesta es no. ❌',
    'Mis fuentes dicen que no.',
    'Muy dudoso.',
    'Las probabilidades no están a tu favor.',
    'Ni en sueños. 😬',
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

// ═══ COMANDO: /8ball ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const RESPUESTAS = [
    { text: 'Sí, definitivamente.', tipo: 'positivo' },
    { text: 'Sin duda alguna.', tipo: 'positivo' },
    { text: 'Probablemente sí.', tipo: 'positivo' },
    { text: 'Las señales apuntan a que sí.', tipo: 'positivo' },
    { text: '¡Por supuesto!', tipo: 'positivo' },
    { text: 'Todo indica que sí. 🎯', tipo: 'positivo' },
    { text: 'No puedo responder eso ahora...', tipo: 'neutro' },
    { text: 'Mejor no te lo digo.', tipo: 'neutro' },
    { text: 'Concéntrate y preguntá de nuevo.', tipo: 'neutro' },
    { text: 'Hmm, es complicado...', tipo: 'neutro' },
    { text: 'No cuentes con ello.', tipo: 'negativo' },
    { text: 'No, definitivamente no.', tipo: 'negativo' },
    { text: 'Mis fuentes dicen que no.', tipo: 'negativo' },
    { text: 'Muy dudoso. 🤔', tipo: 'negativo' },
    { text: 'Ni en un millón de años.', tipo: 'negativo' },
];

const COLORES = {
    positivo: 0x69F0AE,
    neutro: 0xFFB74D,
    negativo: 0xEF5350
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('🎱 Hacé una pregunta a la bola mágica')
        .addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta para la bola mágica').setRequired(true)),

    async execute(interaction) {
        const pregunta = interaction.options.getString('pregunta');
        const respuesta = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];

        const embed = new EmbedBuilder()
            .setColor(COLORES[respuesta.tipo])
            .setAuthor({ name: '🎱  Bola Mágica' })
            .setDescription(
                `> **Pregunta:** *${pregunta}*\n\n` +
                `> 🔮 **${respuesta.text}**`
            )
            .setFooter({ text: `Consultado por ${interaction.user.username}  ·  Prophet Fun` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

// ═══ COMANDO: /8ball mejorado ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const RESPUESTAS = {
    positivo: [
        '✨ Sí, definitivamente.',
        '🌟 Sin duda alguna.',
        '🎯 Las señales apuntan a que **sí**.',
        '🔥 ¡Por supuesto que sí!',
        '💫 Todo el universo conspira a tu favor.',
        '🚀 Mis visiones son claras: **¡sí!**',
        '⚡ Las estrellas lo confirman.',
    ],
    neutro: [
        '🌫️ No puedo responderte ahora. Las visiones son borrosas...',
        '🤷 Mejor no te lo digo.',
        '🔄 Concentráte y preguntá de nuevo.',
        '⏳ El tiempo lo dirá. Sé paciente.',
        '🎭 Error 404: respuesta no encontrada.',
        '🌀 Mis poderes están en mantenimiento.',
    ],
    negativo: [
        '💀 No. Jamás. Olvidalo.',
        '❌ Mis fuentes dicen que **no**.',
        '🌑 El oscuro destino dice que no.',
        '⛔ Ni en un millón de años.',
        '🪦 Esta idea ya está muerta.',
        '🎲 La suerte no está de tu lado.',
    ],
};

const COLORES = {
    positivo: 0x69F0AE,
    neutro: 0xFFB74D,
    negativo: 0xEF5350,
};

const ICONOS = {
    positivo: '🟢',
    neutro: '🟡',
    negativo: '🔴',
};

const TIPOS = ['positivo', 'positivo', 'positivo', 'positivo', 'neutro', 'neutro', 'negativo', 'negativo', 'negativo', 'negativo'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('🎱 Consultá a la bola mágica del Prophet')
        .addStringOption(o =>
            o.setName('pregunta')
                .setDescription('Tu pregunta (mejor si termina en ?)')
                .setRequired(true)
                .setMaxLength(200)),

    async execute(interaction) {
        await interaction.deferReply();

        // Animación "consultando..."
        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(0x4A148C)
                .setAuthor({ name: '🎱  Bola Mágica · Prophet' })
                .setDescription('> 🔮 *Consultando las fuerzas del universo...*\n> ⏳ Un momento...')
            ]
        });

        await new Promise(r => setTimeout(r, 2000));

        const pregunta = interaction.options.getString('pregunta');
        const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
        const pool = RESPUESTAS[tipo];
        const respuesta = pool[Math.floor(Math.random() * pool.length)];
        const icono = ICONOS[tipo];

        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(COLORES[tipo])
                .setAuthor({ name: '🎱  Bola Mágica · Prophet Fun' })
                .setDescription(
                    `**Pregunta:**\n> *${pregunta}*\n\n` +
                    `**La bola dice:**\n> ## ${respuesta}`
                )
                .addFields({ name: '📊 Veredicto', value: `${icono} ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`, inline: true })
                .setFooter({ text: `Consultado por ${interaction.user.username}  ·  Prophet Fun` })
                .setTimestamp()
            ]
        });
    }
};

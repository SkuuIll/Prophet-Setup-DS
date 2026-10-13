// ═══ COMANDO: /8ball mejorado ═══
const { SlashCommandBuilder } = require('discord.js');
const { makeEmbed } = require('../../utils/discordUI');
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
    data: new SlashCommandBuilder().setName('8ball')
        .setDescription('Preguntale a la bola mágica del Prophet')
        .addStringOption(o => o.setName('pregunta').setDescription('Tu pregunta')
            .setRequired(true).setMaxLength(200)),
    async execute(interaction) {
        const question = interaction.options.getString('pregunta');
        const kind = TIPOS[Math.floor(Math.random() * TIPOS.length)];
        const pool = RESPUESTAS[kind];
        const answer = pool[Math.floor(Math.random() * pool.length)];
        return interaction.reply({
            embeds: [makeEmbed({
                title: 'La bola mágica responde',
                description: '**Tu pregunta:** ' + question
                    + '\n\n**Respuesta:** ' + answer,
                tone: kind === 'positivo' ? 'success'
                    : kind === 'negativo' ? 'error' : 'warning',
                footer: 'Diversión · Respuesta aleatoria, no es una predicción',
                iconURL: interaction.user.displayAvatarURL?.(),
            })],
            allowedMentions: { parse: [] },
        });
    },
};

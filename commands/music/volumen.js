const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');
const { makeEmbed } = require('../../utils/discordUI');
const { ensureMusicController, musicNotice } = require('../../utils/musicAccess');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('volumen')
        .setDescription('Ajustar el volumen del reproductor').addIntegerOption(o => o.setName('nivel').setDescription('Volumen entre 1 y 100').setRequired(true).setMinValue(1).setMaxValue(100)),
    async execute(interaction) {
        const denied = ensureMusicController(interaction);
        if (denied) return interaction.reply(denied);
        const queue = useQueue(interaction.guild.id);
        
        const volume = interaction.options.getInteger('nivel');
        if (!Number.isInteger(volume) || volume < 1 || volume > 100) return interaction.reply(musicNotice('Volumen inválido', 'Usá un valor entre 1 y 100.', 'error'));
        stmts.setGuildVolume(interaction.guild.id, volume);
        if (queue?.isPlaying()) queue.node.setVolume(volume);
        const blocks = Math.round(volume / 10);
        const bar = '▰'.repeat(blocks) + '▱'.repeat(10 - blocks);
        return interaction.reply({ embeds: [makeEmbed({ title: 'Volumen actualizado', description: '**' + volume + '%**  ' + bar + '\nEl volumen se conservará en futuras reproducciones.', tone: 'music', footer: 'Prophet Music' })] });
    },
};

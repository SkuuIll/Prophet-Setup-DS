const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { makeEmbed, notice } = require('../../utils/discordUI');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder().setName('slowmode')
        .setDescription('Cambiar el intervalo mínimo entre mensajes')
        .addIntegerOption(o => o.setName('segundos').setDescription('De 0 a 21600 segundos')
            .setRequired(true).setMinValue(0).setMaxValue(21600))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
        if (!interaction.inGuild?.() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply(notice({
                title: 'Sin permisos',
                description: 'No tenés permisos para administrar canales para usar /slowmode.',
                tone: 'error',
            }));
        }
        const seconds = interaction.options.getInteger('segundos');
        try {
            await interaction.channel.setRateLimitPerUser(seconds);
        } catch (error) {
            console.error('[Slowmode] Error al actualizar intervalo:', error);
            return interaction.reply(notice({
                title: 'No se pudo cambiar el modo lento',
                description: 'Comprobá que el bot pueda administrar este canal.',
                tone: 'error',
            }));
        }
        const embed = makeEmbed({
            title: seconds ? 'Modo lento activado' : 'Modo lento desactivado',
            tone: seconds ? 'warning' : 'success',
            description: '**Canal:** ' + interaction.channel.toString()
                + '\n**Intervalo:** ' + (seconds ? seconds + ' segundos' : 'Sin demora')
                + '\n**Moderador:** ' + interaction.user.username,
            footer: 'Moderación · Configuración del canal',
        });
        await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
        try {
            stmts.addLog('SLOWMODE', {
                mod: interaction.user.tag, channel: interaction.channel.name, seconds,
            });
        } catch (error) {
            console.error('[Slowmode] Error registrando modificación:', error);
        }
        const logs = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logs && logs.id !== interaction.channelId) {
            logs.send({ embeds: [embed], allowedMentions: { parse: [] } })
                .catch(error => console.warn('[Slowmode] Log no disponible:', error.message));
        }
    },
};

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { makeEmbed, notice } = require('../../utils/discordUI');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banear a un miembro del servidor')
        .addUserOption(option => option.setName('usuario').setDescription('Miembro sobre el que actuar').setRequired(true))
        .addStringOption(option => option.setName('razon').setDescription('Motivo de la medida').setMaxLength(450))
        .addIntegerOption(option => option.setName('dias').setDescription('Días de mensajes a borrar (0-7)').setMinValue(0).setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction) {
        if (!interaction.inGuild?.() || !interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply(notice({
                title: 'No tenés permisos',
                description: 'Necesitás permisos de moderación para utilizar /ban.',
                tone: 'error',
            }));
        }
        const target = interaction.options.getMember('usuario');
        const reason = interaction.options.getString('razon')?.trim() || 'No se indicó un motivo';
        const days = interaction.options.getInteger('dias') ?? 0;

        if (!target) {
            return interaction.reply(notice({ title: 'Miembro no encontrado', description: 'La persona debe pertenecer al servidor.', tone: 'warning' }));
        }
        if (target.id === interaction.user.id) {
            return interaction.reply(notice({ title: 'Acción no permitida', description: 'No podés aplicar esta medida sobre vos mismo.', tone: 'error' }));
        }
        if (!target.bannable) {
            return interaction.reply(notice({
                title: 'Jerarquía o permisos insuficientes',
                description: 'No puedo aplicar esta medida a ese miembro. Revisá los permisos y la posición de los roles del bot.',
                tone: 'error',
            }));
        }

        try {
            await target.ban({ deleteMessageSeconds: days * 86400, reason });
        } catch (error) {
            console.error('[Moderación /ban]', error);
            return interaction.reply(notice({
                title: 'No se pudo completar la medida',
                description: 'Discord rechazó la operación. Comprobá roles y permisos e intentá nuevamente.',
                tone: 'error',
            }));
        }

        // Notificar solo después de completar la operación real.
        const resultEmbed = makeEmbed({
            title: 'Usuario baneado',
            tone: 'error',
            description: '**Miembro:** ' + target.user.tag + '\n**Motivo:** ' + reason
                + '\n**Moderador:** ' + interaction.user.tag + '\n**Días de historial borrados:** ' + days,
            footer: 'Moderación · Operación completada',
            iconURL: target.user.displayAvatarURL?.(),
        });
        const response = { embeds: [resultEmbed], allowedMentions: { parse: [] } };
        await interaction.reply(response);
        try {
            await target.user.send({
                embeds: [makeEmbed({
                    title: 'Medida de moderación en ' + interaction.guild.name,
                    tone: 'warning',
                    description: 'Fuiste baneado del servidor.\n**Motivo:** ' + reason
                        + '\n**Moderador:** ' + interaction.user.tag,
                    footer: 'Prophet Gaming · Moderación',
                })],
                allowedMentions: { parse: [] },
            });
        } catch {
            // La privacidad del usuario puede bloquear los mensajes directos.
        }
        try {
            stmts.addLog('BAN', {
                userId: target.id, userTag: target.user.tag,
                mod: interaction.user.tag, reason,
            });
        } catch (error) {
            console.error('[Moderación /ban] No se pudo guardar el log:', error);
        }
        const logs = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logs && logs.id !== interaction.channelId) {
            logs.send(response).catch(err => console.warn('[Moderación /ban] No se pudo publicar log:', err.message));
        }
    },
};

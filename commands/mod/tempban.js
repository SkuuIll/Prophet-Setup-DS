// ═══ COMANDO: /tempban ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');
const { makeEmbed, notice } = require('../../utils/discordUI');

function parseDuration(str) {
    if (typeof str !== 'string' || !/^(?:\d+[mhd]){1,4}$/i.test(str)) return 0;
    let total = 0;
    for (const match of str.matchAll(/(\d+)(m|h|d)/gi)) {
        const value = Number(match[1]);
        const factor = { m: 60000, h: 3600000, d: 86400000 }[match[2].toLowerCase()];
        if (!Number.isSafeInteger(value)) return 0;
        total += value * factor;
        if (!Number.isSafeInteger(total) || total > 30 * 86400000) return 0;
    }
    return total;
}

function formatDuration(ms) {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);
    return parts.join(' ') || '0m';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('🔨⏳ Banear temporalmente a un usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .addStringOption(o => o.setName('duracion').setDescription('Duración (ej: 30m, 2h, 1d, 1d12h)').setRequired(true))
        .addStringOption(o => o.setName('razon').setDescription('Razón del ban'))
        .addIntegerOption(o => o.setName('dias').setDescription('Días de mensajes a borrar (0-7)').setMinValue(0).setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        if (!interaction.inGuild?.() || !interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
            return interaction.reply(notice({
                title: 'No tenés permisos',
                description: 'Necesitás permisos de baneo para ejecutar esta acción.',
                tone: 'error',
            }));
        }
        const target = interaction.options.getUser('usuario');
        const duration = parseDuration(interaction.options.getString('duracion'));
        const reason = interaction.options.getString('razon')?.trim() || 'No se indicó un motivo';
        const days = interaction.options.getInteger('dias') ?? 0;
        if (!target || target.id === interaction.user.id || target.id === interaction.client.user.id) {
            return interaction.reply(notice({ title: 'Usuario inválido', description: 'No podés aplicar esta acción a ese usuario.', tone: 'error' }));
        }
        if (!duration) {
            return interaction.reply(notice({
                title: 'Duración incorrecta',
                description: 'Usá una combinación de minutos, horas o días, por ejemplo 30m, 2h o 1d12h (máximo 30 días).',
                tone: 'error',
            }));
        }
        const member = interaction.options.getMember('usuario');
        if (member && !member.bannable) {
            return interaction.reply(notice({
                title: 'No se puede banear',
                description: 'Revisá la jerarquía de roles y los permisos del bot.',
                tone: 'error',
            }));
        }

        const expiresAt = Date.now() + duration;
        const formatted = formatDuration(duration);
        try {
            await interaction.guild.members.ban(target.id, {
                reason: '[TEMPBAN ' + formatted + '] ' + reason,
                deleteMessageSeconds: days * 86400,
            });
        } catch (error) {
            console.error('[Tempban] Error al banear:', error);
            return interaction.reply(notice({
                title: 'No se pudo aplicar el ban',
                description: 'Discord rechazó la operación. Revisá los permisos del bot.',
                tone: 'error',
            }));
        }

        try {
            stmts.addTempban(interaction.guild.id, target.id, interaction.user.id, reason, expiresAt);
        } catch (error) {
            console.error('[Tempban] No se pudo guardar el desbaneo automático:', error);
            try {
                await interaction.guild.members.unban(target.id, 'Revirtiendo ban sin programación de desbaneo');
            } catch (rollbackError) {
                console.error('[Tempban] IMPORTANTE: falló la reversión del ban:', rollbackError);
            }
            return interaction.reply(notice({
                title: 'No se pudo programar el desbaneo',
                description: 'Falló el registro de la fecha de desbaneo. Avisá al Staff para que revise el estado del usuario.',
                tone: 'error',
            }));
        }

        const confirmation = makeEmbed({
            title: 'Ban temporal aplicado',
            tone: 'warning',
            description: '**Usuario:** ' + target.tag + '\\n**Motivo:** ' + reason
                + '\\n**Duración:** ' + formatted
                + '\\n**Desbaneo previsto:** <t:' + Math.floor(expiresAt / 1000) + ':R>',
            footer: 'Moderación · Seguimiento automático',
        });
        // El ban y la programación deben completarse ANTES del DM de aviso.
        await interaction.reply({ embeds: [confirmation], allowedMentions: { parse: [] } });
        try {
            await target.send({
                embeds: [makeEmbed({
                    title: 'Ban temporal en ' + interaction.guild.name,
                    tone: 'warning',
                    description: '**Motivo:** ' + reason + '\\n**Duración:** ' + formatted
                        + '\\n**Desbaneo previsto:** <t:' + Math.floor(expiresAt / 1000) + ':R>',
                    footer: 'Moderación',
                })],
                allowedMentions: { parse: [] },
            });
        } catch { /* Mensajes privados bloqueados o usuario inaccesible. */ }
        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel && logChannel.id !== interaction.channelId) {
            logChannel.send({ embeds: [confirmation], allowedMentions: { parse: [] } })
                .catch(error => console.warn('[Tempban] No se pudo publicar log:', error.message));
        }
    },
    _test: { parseDuration, formatDuration },
};

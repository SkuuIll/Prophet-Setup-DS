const {
    SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
    EmbedBuilder, AttachmentBuilder,
} = require('discord.js');
const config = require('../../config');
const { getPersistedValue } = require('../../utils/memberNotificationDiagnostics');
const {
    resolveMemberChannel, missingSendPermissions, sendWithImageFallback,
} = require('../../utils/memberNotifications');

// Prueba visual real del canal y de Canvas, sin simular un ingreso ni tocar roles.
module.exports = {
    data: new SlashCommandBuilder()
        .setName('probar-notificaciones')
        .setDescription('Comprobar permisos y mostrar un ejemplo de bienvenida o despedida')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(option => option
            .setName('tipo')
            .setDescription('Qué notificación querés comprobar')
            .setRequired(true)
            .addChoices(
                { name: 'Bienvenida', value: 'bienvenida' },
                { name: 'Despedida', value: 'despedida' },
            )),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        if (!interaction.inGuild() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.editReply('Solo un administrador o alguien con permiso para gestionar el servidor puede probar las notificaciones.');
        }

        const type = interaction.options.getString('tipo', true);
        const channel = await resolveMemberChannel(interaction.guild, {
            configValue: config.CHANNELS.BIENVENIDOS,
            persistedValue: getPersistedValue('BIENVENIDOS'),
            kind: 'welcome',
        });
        if (!channel) {
            return interaction.editReply('No encontré el canal de bienvenidas. Revisá su ID en el dashboard y su nombre en Discord.');
        }

        const missing = missingSendPermissions(channel, interaction.guild);
        if (missing.length) {
            return interaction.editReply(`Faltan permisos en <#${channel.id}>: ${missing.join(', ')}. Habilitalos para que las tarjetas se envíen.`);
        }

        try {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const { generarBienvenida, generarDespedida } = require('../../utils/canvas');
            const png = type === 'bienvenida' ? await generarBienvenida(member) : await generarDespedida(member);
            const fileName = type === 'bienvenida' ? 'bienvenida.png' : 'despedida.png';
            const embed = new EmbedBuilder()
                .setColor(type === 'bienvenida' ? config.COLORES.PRINCIPAL : config.COLORES.ERROR)
                .setTitle(type === 'bienvenida' ? 'Prueba de bienvenida' : 'Prueba de despedida')
                .setDescription(`Esta es una **prueba de ${type}**, no un ingreso ni una salida real. El sistema enviará las notificaciones a este canal cuando ocurra el evento.`)
                .setFooter({ text: 'Prophet Gaming · Diagnóstico de notificaciones' })
                .setTimestamp()
                .setImage(`attachment://${fileName}`);
            await sendWithImageFallback(channel, {
                embeds: [embed],
                files: [new AttachmentBuilder(png, { name: fileName })],
                allowedMentions: { parse: [] },
            });
            return interaction.editReply(`Prueba publicada en <#${channel.id}>. Si no aparecen mensajes en los ingresos reales, comprobá el **Server Members Intent** en el Discord Developer Portal y los logs de ProphetBot.`);
        } catch (error) {
            console.error('[probar-notificaciones] Error:', error);
            return interaction.editReply(`No se pudo completar la prueba en <#${channel.id}>. Revisá los permisos y los logs del bot.`);
        }
    },
};

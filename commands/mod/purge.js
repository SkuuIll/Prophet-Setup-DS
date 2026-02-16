// ═══ COMANDO: /purge ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Limpiar mensajes del canal con filtros avanzados')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad de mensajes (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(o => o.setName('usuario').setDescription('Solo mensajes de este usuario'))
        .addStringOption(o => o.setName('filtro').setDescription('Tipo de filtro')
            .addChoices(
                { name: '🤖 Solo bots', value: 'bots' },
                { name: '👤 Solo humanos', value: 'humanos' },
                { name: '📎 Con archivos adjuntos', value: 'archivos' },
                { name: '🔗 Con links', value: 'links' },
                { name: '📌 Sin mensajes fijados', value: 'no_pinned' },
            ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const cantidad = interaction.options.getInteger('cantidad');
        const usuario = interaction.options.getUser('usuario');
        const filtro = interaction.options.getString('filtro');

        await interaction.deferReply({ ephemeral: true });

        // Fetch mensajes
        let mensajes = await interaction.channel.messages.fetch({ limit: cantidad });

        // Solo mensajes de menos de 14 días
        const limite14d = Date.now() - 1209600000;
        mensajes = mensajes.filter(m => m.createdTimestamp > limite14d);

        // Aplicar filtro de usuario
        if (usuario) {
            mensajes = mensajes.filter(m => m.author.id === usuario.id);
        }

        // Aplicar filtros avanzados
        if (filtro === 'bots') {
            mensajes = mensajes.filter(m => m.author.bot);
        } else if (filtro === 'humanos') {
            mensajes = mensajes.filter(m => !m.author.bot);
        } else if (filtro === 'archivos') {
            mensajes = mensajes.filter(m => m.attachments.size > 0);
        } else if (filtro === 'links') {
            mensajes = mensajes.filter(m => /https?:\/\//i.test(m.content));
        } else if (filtro === 'no_pinned') {
            mensajes = mensajes.filter(m => !m.pinned);
        }

        if (mensajes.size === 0) {
            return interaction.editReply({ content: '⚠️ No se encontraron mensajes que coincidan con los filtros.' });
        }

        const borrados = await interaction.channel.bulkDelete(mensajes, true);

        // Construir resumen
        let descripcion = `🧹 Se eliminaron **${borrados.size}** mensajes`;
        if (usuario) descripcion += ` de **${usuario.tag}**`;
        if (filtro) descripcion += ` (filtro: ${filtro})`;

        await interaction.editReply({ content: `✅ ${descripcion}` });

        // Log
        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.INFO || 0x3498DB)
                .setTitle('🧹 Purge ejecutado')
                .addFields(
                    { name: '📍 Canal', value: `<#${interaction.channel.id}>`, inline: true },
                    { name: '🗑️ Mensajes', value: `${borrados.size}`, inline: true },
                    { name: '🛡️ Moderador', value: `<@${interaction.user.id}>`, inline: true },
                )
                .setTimestamp();
            if (usuario) embed.addFields({ name: '👤 Filtro usuario', value: `${usuario.tag}`, inline: true });
            if (filtro) embed.addFields({ name: '🔍 Filtro', value: filtro, inline: true });
            logChannel.send({ embeds: [embed] });
        }
    }
};

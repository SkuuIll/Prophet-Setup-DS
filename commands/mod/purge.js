// ═══ COMANDO: /purge ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const FILTROS_NOMBRES = {
    'bots': '🤖 Solo bots',
    'humanos': '👤 Solo humanos',
    'archivos': '📎 Con archivos',
    'links': '🔗 Con links',
    'no_pinned': '📌 Sin fijados'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('🧹 Limpiar mensajes del canal con filtros avanzados')
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

        let mensajes = await interaction.channel.messages.fetch({ limit: cantidad });

        // Solo mensajes de menos de 14 días
        const limite14d = Date.now() - 1209600000;
        mensajes = mensajes.filter(m => m.createdTimestamp > limite14d);

        if (usuario) mensajes = mensajes.filter(m => m.author.id === usuario.id);

        if (filtro === 'bots') mensajes = mensajes.filter(m => m.author.bot);
        else if (filtro === 'humanos') mensajes = mensajes.filter(m => !m.author.bot);
        else if (filtro === 'archivos') mensajes = mensajes.filter(m => m.attachments.size > 0);
        else if (filtro === 'links') mensajes = mensajes.filter(m => /https?:\/\//i.test(m.content));
        else if (filtro === 'no_pinned') mensajes = mensajes.filter(m => !m.pinned);

        if (mensajes.size === 0) {
            return interaction.editReply({ content: '> ⚠️ **Sin resultados** — No se encontraron mensajes que coincidan con los filtros.' });
        }

        const borrados = await interaction.channel.bulkDelete(mensajes, true);

        const filtrosAplicados = [];
        if (usuario) filtrosAplicados.push(`👤 ${usuario.tag}`);
        if (filtro) filtrosAplicados.push(FILTROS_NOMBRES[filtro] || filtro);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setDescription(
                `> ✅ Se eliminaron **${borrados.size}** mensajes en ${interaction.channel}.` +
                (filtrosAplicados.length > 0 ? `\n> **Filtros:** ${filtrosAplicados.join(' · ')}` : '')
            )
            .setFooter({ text: 'Prophet  ·  Moderación' });

        await interaction.editReply({ embeds: [embed] });

        // Log
        stmts.addLog('PURGE', {
            mod: interaction.user.tag,
            count: borrados.size,
            channel: interaction.channel.name,
            filter: filtro,
            targetUser: usuario?.tag || null
        });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(config.COLORES.INFO || 0x42A5F5)
                .setAuthor({ name: '🧹  Purge ejecutado' })
                .setDescription(
                    `> **Canal:** ${interaction.channel}\n` +
                    `> **Mensajes borrados:** \`${borrados.size}\`\n` +
                    `> **Moderador:** ${interaction.user}\n` +
                    (usuario ? `> **Filtro usuario:** ${usuario.tag}\n` : '') +
                    (filtro ? `> **Filtro tipo:** ${FILTROS_NOMBRES[filtro] || filtro}` : '')
                )
                .setFooter({ text: 'Prophet  ·  Log de moderación' })
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};

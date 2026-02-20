// ═══ COMANDO: /clear ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🗑️ Borrar mensajes de un canal')
        .addIntegerOption(o => o.setName('cantidad').setDescription('Cantidad (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
        .addUserOption(o => o.setName('usuario').setDescription('Solo mensajes de este usuario'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const cantidad = interaction.options.getInteger('cantidad');
        const usuario = interaction.options.getUser('usuario');

        await interaction.deferReply({ ephemeral: true });

        let mensajes = await interaction.channel.messages.fetch({ limit: cantidad });

        if (usuario) {
            mensajes = mensajes.filter(m => m.author.id === usuario.id);
        }

        // Solo borrar mensajes de menos de 14 días
        const ahora = Date.now();
        mensajes = mensajes.filter(m => ahora - m.createdTimestamp < 1209600000);

        if (mensajes.size === 0) {
            return interaction.editReply({ content: '> ⚠️ **Nada que borrar** — No se encontraron mensajes válidos (pueden tener >14 días).' });
        }

        const borrados = await interaction.channel.bulkDelete(mensajes, true);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setDescription(
                `> ✅ Se eliminaron **${borrados.size}** mensajes` +
                (usuario ? ` de **${usuario.tag}**` : '') +
                ` en ${interaction.channel}.`
            )
            .setFooter({ text: 'Prophet  ·  Moderación' });

        await interaction.editReply({ embeds: [embed] });

        // Log
        stmts.addLog('CLEAR', {
            mod: interaction.user.tag,
            count: borrados.size,
            channel: interaction.channel.name,
            targetUser: usuario?.tag || null
        });

        const logChannel = interaction.guild.channels.cache.get(config.CHANNELS.LOGS);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(config.COLORES.INFO || 0x42A5F5)
                .setAuthor({ name: '🗑️  Clear ejecutado' })
                .setDescription(
                    `> **Canal:** ${interaction.channel}\n` +
                    `> **Mensajes borrados:** \`${borrados.size}\`\n` +
                    `> **Moderador:** ${interaction.user}\n` +
                    (usuario ? `> **Filtro usuario:** ${usuario.tag}` : '')
                )
                .setFooter({ text: 'Prophet  ·  Log de moderación' })
                .setTimestamp();
            logChannel.send({ embeds: [logEmbed] });
        }
    }
};

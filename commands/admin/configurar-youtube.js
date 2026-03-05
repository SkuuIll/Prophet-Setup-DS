// ═══ COMANDO: /configurar-youtube ═══

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar-youtube')
        .setDescription('📺 Configura notificaciones de YouTube')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('agregar')
            .setDescription('Agregar un canal de YouTube para monitorear')
            .addStringOption(o => o.setName('channel-id').setDescription('ID del canal de YouTube (empieza con UC...)').setRequired(true))
            .addStringOption(o => o.setName('nombre').setDescription('Nombre del canal (para mostrar en la lista)').setRequired(true))
            .addChannelOption(o => o.setName('canal').setDescription('Canal de Discord donde postear notificaciones').setRequired(true))
            .addRoleOption(o => o.setName('rol-ping').setDescription('Rol a mencionar con cada video nuevo').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('quitar')
            .setDescription('Quitar un canal de YouTube del monitoreo')
            .addStringOption(o => o.setName('channel-id').setDescription('ID del canal de YouTube').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('lista')
            .setDescription('Ver todos los canales configurados')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'agregar') {
            const ytId = interaction.options.getString('channel-id').trim();
            const nombre = interaction.options.getString('nombre');
            const canal = interaction.options.getChannel('canal');
            const rol = interaction.options.getRole('rol-ping');

            // Verificar si empieza con UC (IDs de YouTube reales)
            if (!ytId.startsWith('UC') && !ytId.startsWith('HC')) {
                return interaction.editReply({
                    content: '❌ El Channel ID debe empezar con `UC...`. Podés encontrarlo en la URL del canal o en "Acerca de" → Compartir → Copiar ID.'
                });
            }

            const existentes = stmts.getYoutubeSubs(interaction.guild.id);
            if (existentes.find(s => s.yt_channel_id === ytId)) {
                return interaction.editReply({ content: `❌ Este canal ya está siendo monitoreado.` });
            }

            stmts.addYoutubeSub(interaction.guild.id, ytId, nombre, canal.id, rol?.id || null);

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setAuthor({ name: '📺  YouTube configurado' })
                .setDescription(
                    `> ✅ Notificaciones de **${nombre}** activadas\n` +
                    `> 🆔 **ID:** \`${ytId}\`\n` +
                    `> 📢 **Canal Discord:** ${canal}\n` +
                    (rol ? `> 🔔 **Ping:** ${rol}\n` : '> 🔔 **Ping:** Sin mención\n') +
                    `\n> ℹ️ Necesitás \`YOUTUBE_API_KEY\` en el \`.env\` para que funcione.`
                )
                .setFooter({ text: 'Prophet  ·  YouTube Monitor' });

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'quitar') {
            const ytId = interaction.options.getString('channel-id').trim();
            const removed = stmts.removeYoutubeSub(interaction.guild.id, ytId);
            return interaction.editReply({
                content: removed ? `✅ Canal eliminado del monitoreo.` : `❌ No encontré ese canal en la lista.`
            });
        }

        if (sub === 'lista') {
            const subs = stmts.getYoutubeSubs(interaction.guild.id);
            if (!subs.length) return interaction.editReply({ content: '> ℹ️ No hay canales de YouTube configurados.' });

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setAuthor({ name: '📺  Canales de YouTube monitoreados' })
                .setDescription(
                    subs.map((s, i) =>
                        `**${i + 1}.** **${s.yt_channel_name}**\n` +
                        `> \`${s.yt_channel_id}\`  →  <#${s.discord_channel}>${s.role_ping ? `  ·  <@&${s.role_ping}>` : ''}`
                    ).join('\n\n')
                )
                .setFooter({ text: `${subs.length} canal${subs.length !== 1 ? 'es' : ''}  ·  Chequeo cada 10 minutos` });

            return interaction.editReply({ embeds: [embed] });
        }
    }
};

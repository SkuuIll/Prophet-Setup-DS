// ═══ COMANDO: /configurar-twitch ═══

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar-twitch')
        .setDescription('📡 Configura notificaciones de Twitch')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('agregar')
            .setDescription('Agregar un streamer para monitorear')
            .addStringOption(o => o.setName('streamer').setDescription('Nombre de usuario en Twitch').setRequired(true))
            .addChannelOption(o => o.setName('canal').setDescription('Canal de Discord donde postear notificaciones').setRequired(true))
            .addRoleOption(o => o.setName('rol-ping').setDescription('Rol a mencionar cuando empiece el stream').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('quitar')
            .setDescription('Quitar un streamer del monitoreo')
            .addStringOption(o => o.setName('streamer').setDescription('Nombre de usuario en Twitch').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('lista')
            .setDescription('Ver todos los streamers configurados')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'agregar') {
            let streamer = interaction.options.getString('streamer').toLowerCase().trim();
            const canal = interaction.options.getChannel('canal');
            const rol = interaction.options.getRole('rol-ping');

            // Extraer nombre de usuario si se pasó una URL completa
            streamer = streamer.replace(/^https?:\/\/www\.twitch\.tv\//, '').replace(/^https?:\/\/twitch\.tv\//, '').replace(/\/$/, '');

            // Verificar duplicados
            const existentes = stmts.getTwitchSubs(interaction.guild.id);
            if (existentes.find(s => s.streamer === streamer)) {
                return interaction.editReply({ content: `❌ **${streamer}** ya está siendo monitoreado.` });
            }

            stmts.addTwitchSub(interaction.guild.id, streamer, canal.id, rol?.id || null);

            const embed = new EmbedBuilder()
                .setColor(0x9146FF)
                .setAuthor({ name: '📡  Twitch configurado' })
                .setDescription(
                    `> ✅ Notificaciones de **${streamer}** activadas\n` +
                    `> 📢 **Canal:** ${canal}\n` +
                    (rol ? `> 🔔 **Ping:** ${rol}\n` : '> 🔔 **Ping:** Sin mención\n') +
                    `\n> ℹ️ Necesitás \`TWITCH_CLIENT_ID\` y \`TWITCH_CLIENT_SECRET\` en el \`.env\` para que funcione.`
                )
                .setFooter({ text: 'Prophet  ·  Twitch Monitor' });

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'quitar') {
            let streamer = interaction.options.getString('streamer').toLowerCase().trim();
            // Extraer nombre de usuario si se pasó una URL completa
            streamer = streamer.replace(/^https?:\/\/www\.twitch\.tv\//, '').replace(/^https?:\/\/twitch\.tv\//, '').replace(/\/$/, '');
            const removed = stmts.removeTwitchSub(interaction.guild.id, streamer);
            return interaction.editReply({
                content: removed ? `✅ Dejé de monitorear a **${streamer}**.` : `❌ No encontré a **${streamer}** en la lista.`
            });
        }

        if (sub === 'lista') {
            const subs = stmts.getTwitchSubs(interaction.guild.id);
            if (!subs.length) return interaction.editReply({ content: '> ℹ️ No hay streamers configurados.' });

            const embed = new EmbedBuilder()
                .setColor(0x9146FF)
                .setAuthor({ name: '📡  Streamers monitoreados' })
                .setDescription(
                    subs.map((s, i) =>
                        `**${i + 1}.** \`${s.streamer}\`  →  <#${s.channel_id}>${s.role_ping ? `  ·  <@&${s.role_ping}>` : ''}\n` +
                        `> Estado: ${s.last_live ? '🔴 Live ahora' : '⚫ Offline'}`
                    ).join('\n\n')
                )
                .setFooter({ text: `${subs.length} streamer${subs.length !== 1 ? 's' : ''}  ·  Chequeo cada 2 minutos` });

            return interaction.editReply({ embeds: [embed] });
        }
    }
};

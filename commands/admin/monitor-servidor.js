// ═══ COMANDO: /monitor-servidor ═══

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const { checkServerNow } = require('../../modules/gameServerMonitor');

const GAME_ICONS = {
    minecraft: '⛏️', cs2: '🔫', csgo: '🔫', valorant: '💥',
    rust: '🌿', ark: '🦕', gmod: '🔧', tf2: '🎩'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('monitor-servidor')
        .setDescription('🎮 Monitorea servidores de juego')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('agregar')
            .setDescription('Agregar un servidor para monitorear')
            .addStringOption(o => o.setName('ip').setDescription('IP o hostname del servidor').setRequired(true))
            .addIntegerOption(o => o.setName('puerto').setDescription('Puerto TCP del servidor').setRequired(true).setMinValue(1).setMaxValue(65535))
            .addStringOption(o => o.setName('juego').setDescription('Juego (minecraft, cs2, rust, ark, etc.)').setRequired(true))
            .addChannelOption(o => o.setName('canal').setDescription('Canal de Discord para alertas').setRequired(true))
            .addStringOption(o => o.setName('nombre').setDescription('Nombre amigable del servidor').setRequired(false))
            .addRoleOption(o => o.setName('rol-ping').setDescription('Rol a mencionar en alertas').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('quitar')
            .setDescription('Quitar un servidor del monitoreo')
            .addStringOption(o => o.setName('ip').setDescription('IP del servidor').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('lista')
            .setDescription('Ver todos los servidores monitoreados')
        )
        .addSubcommand(sub => sub
            .setName('estado')
            .setDescription('Hacer un chequeo inmediato de todos los servidores')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'agregar') {
            const ip = interaction.options.getString('ip').trim();
            const port = interaction.options.getInteger('puerto');
            const game = interaction.options.getString('juego').toLowerCase();
            const canal = interaction.options.getChannel('canal');
            const label = interaction.options.getString('nombre') || `${ip}:${port}`;
            const rol = interaction.options.getRole('rol-ping');

            stmts.addGameServer(interaction.guild.id, ip, port, game, canal.id, rol?.id || null, label);

            const icon = GAME_ICONS[game] || '🎮';
            const embed = new EmbedBuilder()
                .setColor(0x69F0AE)
                .setAuthor({ name: `${icon}  Servidor agregado` })
                .setDescription(
                    `> ✅ **${label}** ahora está siendo monitoreado\n` +
                    `> 🌐 **IP:** \`${ip}:${port}\`\n` +
                    `> 🎮 **Juego:** ${game}\n` +
                    `> 📢 **Canal de alertas:** ${canal}\n` +
                    (rol ? `> 🔔 **Ping:** ${rol}` : '')
                )
                .setFooter({ text: 'Prophet  ·  Game Monitor  ·  Chequeo cada 3 minutos' });

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'quitar') {
            const ip = interaction.options.getString('ip').trim();
            const removed = stmts.removeGameServer(interaction.guild.id, ip);
            return interaction.editReply({
                content: removed ? `✅ Servidor \`${ip}\` eliminado del monitoreo.` : `❌ No encontré ese servidor en la lista.`
            });
        }

        if (sub === 'lista') {
            const servers = stmts.getGameServers(interaction.guild.id);
            if (!servers.length) return interaction.editReply({ content: '> ℹ️ No hay servidores configurados.' });

            const embed = new EmbedBuilder()
                .setColor(0x42A5F5)
                .setAuthor({ name: '🎮  Servidores monitoreados' })
                .setDescription(
                    servers.map((s, i) => {
                        const icon = GAME_ICONS[s.game?.toLowerCase()] || '🎮';
                        return `**${i + 1}.** ${icon} **${s.label}** — \`${s.ip}:${s.port}\`\n` +
                            `> Estado: ${s.last_status ? '✅ Online' : '🔴 Offline'}  ·  Canal: <#${s.discord_channel}>`;
                    }).join('\n\n')
                )
                .setFooter({ text: `${servers.length} servidor${servers.length !== 1 ? 'es' : ''}  ·  Chequeo cada 3 minutos` });

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'estado') {
            const servers = stmts.getGameServers(interaction.guild.id);
            if (!servers.length) return interaction.editReply({ content: '> ℹ️ No hay servidores configurados.' });

            await interaction.editReply({ content: '⏳ Chequeando servidores...' });

            const resultados = await Promise.all(servers.map(async s => {
                const { online, latency } = await checkServerNow(s.ip, s.port);
                return { ...s, online, latency };
            }));

            const embed = new EmbedBuilder()
                .setColor(0x42A5F5)
                .setAuthor({ name: '🎮  Estado actual de servidores' })
                .setDescription(
                    resultados.map(s => {
                        const icon = GAME_ICONS[s.game?.toLowerCase()] || '🎮';
                        const status = s.online ? `✅ Online (\`${s.latency}ms\`)` : '🔴 Offline';
                        return `${icon} **${s.label}** — ${status}\n> \`${s.ip}:${s.port}\``;
                    }).join('\n\n')
                )
                .setTimestamp()
                .setFooter({ text: 'Prophet  ·  Chequeo en tiempo real' });

            return interaction.editReply({ content: '', embeds: [embed] });
        }
    }
};

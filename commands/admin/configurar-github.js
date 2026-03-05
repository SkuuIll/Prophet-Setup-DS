// ═══ COMANDO: /configurar-github ═══

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configurar-github')
        .setDescription('⚙️ Configura notificaciones de GitHub')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('agregar')
            .setDescription('Agregar un repositorio de GitHub para monitorear')
            .addStringOption(o => o.setName('repo').setDescription('Repositorio en formato owner/repo (ej: torvalds/linux)').setRequired(true))
            .addChannelOption(o => o.setName('canal').setDescription('Canal de Discord para las notificaciones').setRequired(true))
            .addRoleOption(o => o.setName('rol-ping').setDescription('Rol a mencionar').setRequired(false))
            .addBooleanOption(o => o.setName('commits').setDescription('Notificar nuevos commits (default: sí)').setRequired(false))
            .addBooleanOption(o => o.setName('releases').setDescription('Notificar nuevos releases (default: sí)').setRequired(false))
        )
        .addSubcommand(sub => sub
            .setName('quitar')
            .setDescription('Quitar un repositorio del monitoreo')
            .addStringOption(o => o.setName('repo').setDescription('Repositorio en formato owner/repo').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('lista')
            .setDescription('Ver todos los repositorios configurados')
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const sub = interaction.options.getSubcommand();

        if (sub === 'agregar') {
            const repo = interaction.options.getString('repo').trim();
            const canal = interaction.options.getChannel('canal');
            const rol = interaction.options.getRole('rol-ping');
            const trackCommits = interaction.options.getBoolean('commits') ?? true;
            const trackReleases = interaction.options.getBoolean('releases') ?? true;

            // Validar formato owner/repo
            if (!repo.includes('/') || repo.split('/').length !== 2) {
                return interaction.editReply({ content: '❌ El formato debe ser `owner/repo` (ej: `microsoft/vscode`).' });
            }

            // Verificar que el repo existe en GitHub
            try {
                const res = await fetch(`https://api.github.com/repos/${repo}`, {
                    headers: { 'Accept': 'application/vnd.github+json' }
                });
                if (!res.ok) return interaction.editReply({ content: `❌ No encontré el repositorio \`${repo}\`. ¿Es público?` });
            } catch (e) {
                return interaction.editReply({ content: '❌ No pude verificar el repositorio. Revisá tu conexión.' });
            }

            const existentes = stmts.getGithubSubs(interaction.guild.id);
            if (existentes.find(s => s.repo === repo)) {
                return interaction.editReply({ content: `❌ \`${repo}\` ya está siendo monitoreado.` });
            }

            stmts.addGithubSub(interaction.guild.id, repo, canal.id, rol?.id || null, trackCommits, trackReleases);

            const embed = new EmbedBuilder()
                .setColor(0x24292E)
                .setAuthor({ name: '⚙️  GitHub configurado' })
                .setDescription(
                    `> ✅ Monitoreo de **${repo}** activado\n` +
                    `> 📢 **Canal:** ${canal}\n` +
                    (rol ? `> 🔔 **Ping:** ${rol}\n` : '') +
                    `> 📦 **Commits:** ${trackCommits ? '✅' : '❌'}  ·  **Releases:** ${trackReleases ? '✅' : '❌'}`
                )
                .setFooter({ text: 'Prophet  ·  GitHub Monitor  ·  Chequeo cada 15 minutos' });

            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'quitar') {
            const repo = interaction.options.getString('repo').trim();
            const removed = stmts.removeGithubSub(interaction.guild.id, repo);
            return interaction.editReply({
                content: removed ? `✅ Dejé de monitorear \`${repo}\`.` : `❌ No encontré \`${repo}\` en la lista.`
            });
        }

        if (sub === 'lista') {
            const subs = stmts.getGithubSubs(interaction.guild.id);
            if (!subs.length) return interaction.editReply({ content: '> ℹ️ No hay repositorios configurados.' });

            const embed = new EmbedBuilder()
                .setColor(0x24292E)
                .setAuthor({ name: '⚙️  Repositorios GitHub monitoreados' })
                .setDescription(
                    subs.map((s, i) =>
                        `**${i + 1}.** \`${s.repo}\`  →  <#${s.discord_channel}>${s.role_ping ? `  ·  <@&${s.role_ping}>` : ''}\n` +
                        `> ${s.track_commits ? '📦 Commits' : ''}${s.track_commits && s.track_releases ? '  ·  ' : ''}${s.track_releases ? '🚀 Releases' : ''}`
                    ).join('\n\n')
                )
                .setFooter({ text: `${subs.length} repo${subs.length !== 1 ? 's' : ''}  ·  Chequeo cada 15 minutos` });

            return interaction.editReply({ embeds: [embed] });
        }
    }
};

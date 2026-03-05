// ═══ MÓDULO: githubMonitor.js — Notificaciones de commits y releases de GitHub ═══

const { EmbedBuilder, WebhookClient } = require('discord.js');
const { stmts } = require('../database');

const GITHUB_HEADERS = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(process.env.GITHUB_TOKEN ? { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` } : {})
};

async function sendNotification(client, channelId, embed, content) {
    const storedWebhook = stmts.getDiscordWebhook(channelId);
    if (storedWebhook) {
        try {
            const wh = new WebhookClient({ url: storedWebhook });
            await wh.send({ content, embeds: [embed] });
            return;
        } catch (e) {
            stmts.removeDiscordWebhook(channelId);
        }
    }
    const channel = client.channels.cache.get(channelId);
    if (channel) channel.send({ content: content || '', embeds: [embed] }).catch(() => { });
}

async function verificarGithub(client) {
    const subs = stmts.getAllGithubSubs();
    if (!subs.length) return;

    for (const sub of subs) {
        try {
            // ── Commits ─────────────────────────────────────────────
            if (sub.track_commits) {
                const res = await fetch(`https://api.github.com/repos/${sub.repo}/commits?per_page=1`, { headers: GITHUB_HEADERS });
                if (res.ok) {
                    const data = await res.json();
                    if (data.length > 0) {
                        const commit = data[0];
                        if (commit.sha !== sub.last_commit_sha) {
                            const ping = sub.role_ping ? `<@&${sub.role_ping}> ` : '';
                            const msg = commit.commit.message.split('\n')[0].slice(0, 256);
                            const author = commit.commit.author.name;
                            const date = new Date(commit.commit.author.date);

                            const embed = new EmbedBuilder()
                                .setColor(0x24292E) // Negro GitHub
                                .setAuthor({
                                    name: `⬆️  Nuevo commit — ${sub.repo}`,
                                    iconURL: 'https://github.githubassets.com/favicons/favicon.png',
                                    url: `https://github.com/${sub.repo}`
                                })
                                .setDescription(
                                    `> **[\`${commit.sha.slice(0, 7)}\`](${commit.html_url})** ${msg}\n\n` +
                                    `> 👤 **Autor:** ${author}\n` +
                                    `> 📅 <t:${Math.floor(date.getTime() / 1000)}:R>`
                                )
                                .setFooter({ text: `github.com/${sub.repo}  ·  Prophet Dev` })
                                .setTimestamp();

                            await sendNotification(client, sub.discord_channel, embed, `${ping}📦 Nuevo commit en **${sub.repo}**`);
                            stmts.updateGithubSub(sub.id, commit.sha, sub.last_release_tag);
                        }
                    }
                }
            }

            // ── Releases ─────────────────────────────────────────────
            if (sub.track_releases) {
                const res = await fetch(`https://api.github.com/repos/${sub.repo}/releases/latest`, { headers: GITHUB_HEADERS });
                if (res.ok) {
                    const release = await res.json();
                    if (release.tag_name && release.tag_name !== sub.last_release_tag) {
                        const ping = sub.role_ping ? `<@&${sub.role_ping}> ` : '';
                        const embed = new EmbedBuilder()
                            .setColor(0x2EA44F) // Verde GitHub
                            .setAuthor({
                                name: `🚀  Nuevo release — ${sub.repo}`,
                                iconURL: 'https://github.githubassets.com/favicons/favicon.png',
                                url: release.html_url
                            })
                            .setTitle(`${release.tag_name} — ${release.name || 'Sin título'}`)
                            .setURL(release.html_url)
                            .setDescription(
                                release.body ? release.body.slice(0, 1000) + (release.body.length > 1000 ? '...' : '') : '*Sin descripción*'
                            )
                            .addFields(
                                { name: '📦 Assets', value: `\`${release.assets?.length || 0}\` archivos`, inline: true },
                                { name: '🏷️ Tag', value: `\`${release.tag_name}\``, inline: true },
                                { name: '🌿 Branch', value: `\`${release.target_commitish}\``, inline: true }
                            )
                            .setFooter({ text: `github.com/${sub.repo}  ·  Prophet Dev` })
                            .setTimestamp(new Date(release.published_at));

                        await sendNotification(client, sub.discord_channel, embed, `${ping}🚀 Nuevo release de **${sub.repo}**: \`${release.tag_name}\``);
                        stmts.updateGithubSub(sub.id, sub.last_commit_sha, release.tag_name);
                    }
                }
            }
        } catch (e) {
            console.error(`[GitHub] Error verificando ${sub.repo}:`, e.message);
        }
    }
}

module.exports = { verificarGithub };

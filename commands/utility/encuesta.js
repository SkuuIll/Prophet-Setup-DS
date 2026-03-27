// ═══ COMANDO: /encuesta — Encuestas con botones y resultados en vivo ═══

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

// En memoria: track de votos
const activePollVotes = new Map();

const OPTION_COLORS = ['🔵', '🟢', '🟡', '🟠', '🔴', '🟣', '⚪', '🟤', '⬛', '🩵'];

module.exports = {
    cooldown: 15,
    data: new SlashCommandBuilder()
        .setName('encuesta')
        .setDescription('📊 Crear encuesta interactiva con botones y resultados en vivo')
        .addStringOption(o => o.setName('pregunta').setDescription('Pregunta de la encuesta').setRequired(true))
        .addStringOption(o => o.setName('opciones').setDescription('Opciones separadas por | (2-8 opciones)').setRequired(false))
        .addStringOption(o =>
            o.setName('duracion')
                .setDescription('Duración (ej: 5m, 1h, 1d)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const pregunta = interaction.options.getString('pregunta');
        const opcionesStr = interaction.options.getString('opciones');
        const duracionStr = interaction.options.getString('duracion');

        // Parsear duración
        let duracionMs = 300000; // 5 min default
        if (duracionStr) {
            const match = duracionStr.match(/^(\d+)(s|m|h|d)$/i);
            if (match) {
                const mul = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
                duracionMs = parseInt(match[1]) * mul[match[2].toLowerCase()];
                duracionMs = Math.min(duracionMs, 7 * 86400000); // max 7 días
            }
        }

        const opciones = opcionesStr
            ? opcionesStr.split('|').map(o => o.trim()).filter(Boolean).slice(0, 8)
            : ['Sí', 'No'];

        if (opciones.length < 2) {
            return interaction.reply({ content: '❌ Necesitás al menos 2 opciones.', ephemeral: true });
        }

        const pollId = `poll_${Date.now()}`;
        const endTime = Date.now() + duracionMs;
        const endTs = Math.floor(endTime / 1000);

        // Inicializar votos
        const votes = {};
        opciones.forEach((_, i) => { votes[i] = new Set(); });
        activePollVotes.set(pollId, { votes, opciones, pregunta, endTime, creatorId: interaction.user.id });

        function buildResultEmbed(final = false) {
            const totalVotes = Object.values(votes).reduce((sum, set) => sum + set.size, 0);

            const results = opciones.map((opt, i) => {
                const count = votes[i].size;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const barLen = 12;
                const filled = Math.round((pct / 100) * barLen);
                const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
                return `${OPTION_COLORS[i]} **${opt}**\n\`${bar}\` ${pct}% (${count} voto${count !== 1 ? 's' : ''})`;
            }).join('\n\n');

            return new EmbedBuilder()
                .setColor(final ? 0x37474F : config.COLORES.INFO || 0x42A5F5)
                .setAuthor({ name: final ? '📊  Encuesta Finalizada' : '📊  Encuesta Activa', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `**${pregunta}**\n\n` +
                    results + '\n\n' +
                    (final
                        ? `> 🏁 **Finalizada** — ${totalVotes} voto${totalVotes !== 1 ? 's' : ''} totales`
                        : `> ⏳ Finaliza <t:${endTs}:R> — ${totalVotes} voto${totalVotes !== 1 ? 's' : ''}`
                    )
                )
                .setFooter({ text: `Creada por ${interaction.user.username}  ·  Prophet Encuestas` })
                .setTimestamp();
        }

        function buildButtons(disabled = false) {
            const rows = [];
            const chunks = [];
            for (let i = 0; i < opciones.length; i += 4) {
                chunks.push(opciones.slice(i, i + 4));
            }

            chunks.forEach((chunk, chunkIdx) => {
                const row = new ActionRowBuilder();
                chunk.forEach((opt, i) => {
                    const globalIdx = chunkIdx * 4 + i;
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`${pollId}_vote_${globalIdx}`)
                            .setLabel(`${opt} (${votes[globalIdx].size})`)
                            .setEmoji(OPTION_COLORS[globalIdx])
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(disabled)
                    );
                });
                rows.push(row);
            });

            return rows;
        }

        await interaction.deferReply();
        const msg = await interaction.editReply({
            embeds: [buildResultEmbed()],
            components: buildButtons(),
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: duracionMs,
            filter: i => i.customId.startsWith(pollId)
        });

        collector.on('collect', async i => {
            const optIdx = parseInt(i.customId.split('_vote_')[1]);
            const userId = i.user.id;

            // Quitar voto anterior si votó otra opción
            for (const [idx, set] of Object.entries(votes)) {
                if (parseInt(idx) !== optIdx) set.delete(userId);
            }

            // Toggle voto
            if (votes[optIdx].has(userId)) {
                votes[optIdx].delete(userId);
                await i.reply({ content: `🗳️ Voto retirado de **${opciones[optIdx]}**.`, ephemeral: true });
            } else {
                votes[optIdx].add(userId);
                await i.reply({ content: `🗳️ Votaste por **${opciones[optIdx]}**!`, ephemeral: true });
            }

            // Actualizar embed y botones
            await interaction.editReply({
                embeds: [buildResultEmbed()],
                components: buildButtons()
            }).catch(() => { });
        });

        collector.on('end', async () => {
            activePollVotes.delete(pollId);
            await interaction.editReply({
                embeds: [buildResultEmbed(true)],
                components: buildButtons(true)
            }).catch(() => { });
        });
    }
};

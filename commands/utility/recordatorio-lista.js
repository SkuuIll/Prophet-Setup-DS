// ═══ COMANDO: /recordatorio-lista ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../../config');
const { recordatorios } = require('./recordatorio');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recordatorio-lista')
        .setDescription('📋 Ver y cancelar tus recordatorios activos'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const userId = interaction.user.id;
        const lista = recordatorios.get(userId) || [];

        if (lista.length === 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.INFO || 0x42A5F5)
                    .setAuthor({ name: '⏰  Tus Recordatorios', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription('> 📭 No tenés recordatorios activos.\n> Usá `/recordatorio <tiempo> <mensaje>` para crear uno.')
                    .setFooter({ text: 'Prophet Bot  ·  Máximo 10 recordatorios' })
                ]
            });
        }

        const ahora = Date.now();
        const desc = lista
            .sort((a, b) => a.expira - b.expira)
            .map(r => {
                const expiraTs = Math.floor(r.expira / 1000);
                const restanteMs = r.expira - ahora;
                const restante = restanteMs > 0 ? `<t:${expiraTs}:R>` : '*(ya enviado)*';
                return `> \`#${r.id}\` ${restante}\n> 📌 *${r.texto.length > 60 ? r.texto.slice(0, 57) + '...' : r.texto}*`;
            })
            .join('\n\n');

        // Botones de cancel por cada recordatorio (hasta 5 a la vez)
        const rows = [];
        const chunks = lista.slice(0, 5);
        if (chunks.length > 0) {
            const row = new ActionRowBuilder().addComponents(
                ...chunks.map(r =>
                    new ButtonBuilder()
                        .setCustomId(`rec_cancel_${r.id}`)
                        .setLabel(`Cancelar #${r.id}`)
                        .setEmoji('🗑️')
                        .setStyle(ButtonStyle.Danger)
                )
            );
            rows.push(row);
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: '⏰  Tus Recordatorios', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(desc)
            .addFields({ name: '📊 Total activos', value: `\`${lista.length}/10\``, inline: true })
            .setFooter({ text: 'Usá los botones para cancelar  ·  Prophet Bot' })
            .setTimestamp();

        const msg = await interaction.editReply({ embeds: [embed], components: rows, fetchReply: true });

        if (rows.length === 0) return;

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: i => i.user.id === userId
        });

        collector.on('collect', async i => {
            const recId = parseInt(i.customId.replace('rec_cancel_', ''));
            const userList = recordatorios.get(userId) || [];
            const idx = userList.findIndex(r => r.id === recId);

            if (idx === -1) {
                return i.reply({ content: '> ⚠️ Ese recordatorio ya no existe.', ephemeral: true });
            }

            // Cancelar el timer
            clearTimeout(userList[idx].timer);
            userList.splice(idx, 1);

            if (userList.length === 0) recordatorios.delete(userId);
            else recordatorios.set(userId, userList);

            await i.reply({ content: `> ✅ Recordatorio \`#${recId}\` cancelado.`, ephemeral: true });

            // Actualizar el embed
            if (userList.length === 0) {
                await interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.INFO || 0x42A5F5)
                        .setAuthor({ name: '⏰  Tus Recordatorios', iconURL: interaction.user.displayAvatarURL() })
                        .setDescription('> 📭 No tenés más recordatorios activos.')
                    ],
                    components: []
                });
                collector.stop();
            } else {
                const newDesc = userList
                    .sort((a, b) => a.expira - b.expira)
                    .map(r => {
                        const expiraTs = Math.floor(r.expira / 1000);
                        return `> \`#${r.id}\` <t:${expiraTs}:R>\n> 📌 *${r.texto.length > 60 ? r.texto.slice(0, 57) + '...' : r.texto}*`;
                    })
                    .join('\n\n');
                embed.setDescription(newDesc);
                embed.setFields({ name: '📊 Total activos', value: `\`${userList.length}/10\``, inline: true });
                const newRow = new ActionRowBuilder().addComponents(
                    ...userList.slice(0, 5).map(r =>
                        new ButtonBuilder()
                            .setCustomId(`rec_cancel_${r.id}`)
                            .setLabel(`Cancelar #${r.id}`)
                            .setEmoji('🗑️')
                            .setStyle(ButtonStyle.Danger)
                    )
                );
                await interaction.editReply({ embeds: [embed], components: [newRow] });
            }
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => { });
        });
    }
};

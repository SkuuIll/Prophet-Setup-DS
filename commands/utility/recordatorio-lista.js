const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../../config');
const { getUserReminders, cancelReminder } = require('../../modules/reminders');

function buildEmbed(interaction, reminders) {
    const ahora = Date.now();
    const descripcion = reminders
        .sort((a, b) => a.remind_at - b.remind_at)
        .map(reminder => {
            const expiraTs = Math.floor(reminder.remind_at / 1000);
            const restante = reminder.remind_at > ahora ? `<t:${expiraTs}:R>` : '*(pendiente de envío)*';
            const texto = reminder.message.length > 60 ? `${reminder.message.slice(0, 57)}...` : reminder.message;
            return `> \`#${reminder.id}\` ${restante}\n> 📌 *${texto}*`;
        })
        .join('\n\n');

    return new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
        .setAuthor({ name: '⏰  Tus Recordatorios', iconURL: interaction.user.displayAvatarURL() })
        .setDescription(descripcion)
        .addFields({ name: '📊 Total activos', value: `\`${reminders.length}/10\``, inline: true })
        .setFooter({ text: 'Usá los botones para cancelar · Se muestran 5 acciones por vez' })
        .setTimestamp();
}

function buildComponents(reminders) {
    const visibleReminders = reminders.slice(0, 5);
    if (!visibleReminders.length) return [];

    return [new ActionRowBuilder().addComponents(
        ...visibleReminders.map(reminder =>
            new ButtonBuilder()
                .setCustomId(`rec_cancel_${reminder.id}`)
                .setLabel(`Cancelar #${reminder.id}`)
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
        )
    )];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recordatorio-lista')
        .setDescription('📋 Ver y cancelar tus recordatorios activos'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let reminders = getUserReminders(interaction.user.id);
        if (reminders.length === 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.INFO || 0x42A5F5)
                    .setAuthor({ name: '⏰  Tus Recordatorios', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription('> 📭 No tenés recordatorios activos.\n> Usá `/recordatorio <tiempo> <mensaje>` para crear uno.')
                    .setFooter({ text: 'Prophet Bot · Máximo 10 recordatorios' })]
            });
        }

        const msg = await interaction.editReply({
            embeds: [buildEmbed(interaction, reminders)],
            components: buildComponents(reminders),
            fetchReply: true,
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: i => i.user.id === interaction.user.id,
        });

        collector.on('collect', async i => {
            const reminderId = Number.parseInt(i.customId.replace('rec_cancel_', ''), 10);
            const deleted = cancelReminder(reminderId, interaction.user.id);

            if (!deleted) {
                return i.reply({ content: '> ⚠️ Ese recordatorio ya no existe.', ephemeral: true });
            }

            await i.reply({ content: `> ✅ Recordatorio \`#${reminderId}\` cancelado.`, ephemeral: true });

            reminders = getUserReminders(interaction.user.id);
            if (reminders.length === 0) {
                collector.stop('empty');
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.INFO || 0x42A5F5)
                        .setAuthor({ name: '⏰  Tus Recordatorios', iconURL: interaction.user.displayAvatarURL() })
                        .setDescription('> 📭 No tenés más recordatorios activos.')],
                    components: [],
                });
            }

            await interaction.editReply({
                embeds: [buildEmbed(interaction, reminders)],
                components: buildComponents(reminders),
            });
        });

        collector.on('end', () => {
            interaction.editReply({ components: [] }).catch(() => { });
        });
    },
};

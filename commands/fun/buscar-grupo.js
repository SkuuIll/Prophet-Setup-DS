// ═══ COMANDO: /buscar-grupo ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buscar-grupo')
        .setDescription('🔍 Busca gente para armar un grupo y jugar')
        .addStringOption(o => o.setName('juego').setDescription('¿Qué juego vas a jugar?').setRequired(true))
        .addIntegerOption(o => o.setName('jugadores').setDescription('¿Cuántos jugadores te faltan?').setRequired(true).setMinValue(1).setMaxValue(20))
        .addStringOption(o => o.setName('info').setDescription('Información extra (Rango, Región, etc)ásticas').setRequired(false)),

    async execute(interaction) {
        const juego = interaction.options.getString('juego');
        const faltantes = interaction.options.getInteger('jugadores');
        const info = interaction.options.getString('info') || 'Ninguna especificada';

        let usersJoined = [interaction.user.id]; // El creador ya está adentro por defecto
        const slotsTotales = faltantes + 1; // +1 porque el creador cuenta

        const updateEmbed = () => {
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                .setTitle(`🎮 Buscando Grupo — ${juego}`)
                .setDescription(`**${interaction.user.username}** está buscando gente para jugar.\n\n` +
                    `> 📋 **Detalles:** ${info}\n` +
                    `> 👥 **Jugadores:** ${usersJoined.length} / ${slotsTotales}\n\n` +
                    `**Miembros confirmados:**\n` +
                    usersJoined.map((id, i) => `${i + 1}. <@${id}>`).join('\n'))
                .setFooter({ text: 'Prophet LFG (Looking For Group)' })
                .setTimestamp();

            // Progress bar simple visual
            const filled = '🟩'.repeat(usersJoined.length);
            const empty = '⬜'.repeat(slotsTotales - usersJoined.length);
            embed.addFields({ name: 'Progreso', value: filled + empty });

            return embed;
        };

        const getButtons = (disabled = false) => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('lfg_join')
                    .setLabel('Me Uno!')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('lfg_leave')
                    .setLabel('Salgo')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled)
            );
        };

        const msg = await interaction.reply({
            content: `¡Ey <@&${config.ROLES.MIEMBRO || ''}>! Nueva partida armándose.`, // Opcional ping a Everyone o un Rol
            embeds: [updateEmbed()],
            components: [getButtons(false)],
            fetchReply: true
        });

        // Colector dura 15 minutos (900000 ms) buscando gente
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 900000
        });

        collector.on('collect', async i => {
            if (i.customId === 'lfg_join') {
                if (usersJoined.includes(i.user.id)) {
                    return i.reply({ content: '❌ Ya estás en la lista.', ephemeral: true });
                }
                if (usersJoined.length >= slotsTotales) {
                    return i.reply({ content: '❌ El grupo ya está lleno.', ephemeral: true });
                }

                usersJoined.push(i.user.id);

                if (usersJoined.length >= slotsTotales) {
                    // SE LLENÓ EL GRUPO
                    collector.stop('lleno');
                    const readyMsg = usersJoined.map(id => `<@${id}>`).join(', ');
                    await i.update({ embeds: [updateEmbed()], components: [getButtons(true)] });
                    return await i.followUp({ content: `🔔 ¡**GRUPO LLENO**! 🔔\n\nEl equipo ya está completo: ${readyMsg}.\n¡Mucha suerte en su partida de **${juego}**! 🎮` });
                } else {
                    await i.update({ embeds: [updateEmbed()], components: [getButtons(false)] });
                }
            }
            else if (i.customId === 'lfg_leave') {
                if (!usersJoined.includes(i.user.id)) {
                    return i.reply({ content: '❌ No estás en la lista.', ephemeral: true });
                }
                if (i.user.id === interaction.user.id) {
                    return i.reply({ content: '❌ Eres el anfitrión, si te vas se cancela. Usa otro comando para cancelar (ej: borrar el msj).', ephemeral: true });
                }

                usersJoined = usersJoined.filter(id => id !== i.user.id);
                await i.update({ embeds: [updateEmbed()], components: [getButtons(false)] });
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                const timeoutEmbed = updateEmbed().setColor(config.COLORES.ERROR || 0xEF5350).setTitle(`🔴 Búsqueda Expirada — ${juego}`);
                interaction.editReply({ embeds: [timeoutEmbed], components: [getButtons(true)] }).catch(() => { });
            }
        });
    }
};

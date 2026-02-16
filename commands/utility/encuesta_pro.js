const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../../config');

// Base de datos en memoria para esto (idealmente usar SQLite para persistencia real)
// Key: MessageID, Value: PollData
const activePolls = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('encuesta_pro')
        .setDescription('📊 Crea una encuesta avanzada con gráficos en tiempo real')
        .addStringOption(o => o.setName('pregunta').setDescription('¿Qué quieres preguntar?').setRequired(true))
        .addStringOption(o => o.setName('opcion1').setDescription('Opción 1').setRequired(true))
        .addStringOption(o => o.setName('opcion2').setDescription('Opción 2').setRequired(true))
        .addStringOption(o => o.setName('opcion3').setDescription('Opción 3'))
        .addStringOption(o => o.setName('opcion4').setDescription('Opción 4'))
        .addStringOption(o => o.setName('opcion5').setDescription('Opción 5')),

    async execute(interaction) {
        const pregunta = interaction.options.getString('pregunta');
        const opciones = [];

        for (let i = 1; i <= 5; i++) {
            const opt = interaction.options.getString(`opcion${i}`);
            if (opt) opciones.push({ label: opt, votes: 0 });
        }

        // Generar barra de progreso visual
        const generateBar = (percentage) => {
            const totalBars = 20;
            const filled = Math.round((percentage / 100) * totalBars);
            const empty = totalBars - filled;
            return '█'.repeat(filled) + '░'.repeat(empty);
        };

        const updateEmbed = () => {
            const totalVotes = opciones.reduce((acc, curr) => acc + curr.votes, 0);

            let description = '';
            opciones.forEach((opt, index) => {
                const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
                description += `**${index + 1}. ${opt.label}**\n`;
                description += `\`${generateBar(percentage)}\` ${percentage}% (${opt.votes})\n\n`;
            });

            return new EmbedBuilder()
                .setTitle(`📊 ${pregunta}`)
                .setDescription(description)
                .setColor(config.COLORES.PRINCIPAL)
                .setFooter({ text: `Total de votos: ${totalVotes} • Prophet Gaming` })
                .setTimestamp();
        };

        const row = new ActionRowBuilder();
        opciones.forEach((opt, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`poll_${index}`)
                    .setLabel(`${index + 1}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        const msg = await interaction.reply({
            embeds: [updateEmbed()],
            components: [row],
            fetchReply: true
        });

        // Guardar estado
        const pollData = {
            owner: interaction.user.id,
            options: opciones,
            voters: new Set() // Para evitar votos dobles
        };

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 86400000 // 24 horas
        });

        collector.on('collect', async i => {
            if (pollData.voters.has(i.user.id)) {
                return i.reply({ content: '❌ Ya votaste en esta encuesta.', ephemeral: true });
            }

            const index = parseInt(i.customId.split('_')[1]);
            pollData.options[index].votes++;
            pollData.voters.add(i.user.id);

            await i.update({ embeds: [updateEmbed()] });
        });

        collector.on('end', () => {
            const finalEmbed = updateEmbed()
                .setFooter({ text: 'Encuesta finalizada • Prophet Gaming' })
                .setColor(0x95A5A6); // Gris

            const disabledRow = new ActionRowBuilder();
            msg.components[0].components.forEach(c => {
                disabledRow.addComponents(ButtonBuilder.from(c).setDisabled(true));
            });

            interaction.editReply({ embeds: [finalEmbed], components: [disabledRow] }).catch(() => { });
        });
    }
};

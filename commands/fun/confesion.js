const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('confesion')
        .setDescription('🤫 Envía una confesión anónima al servidor'),

    async execute(interaction) {
        // Verificar si hay canal configurado
        const channelConfig = stmts.getConfig('CONFESIONES_CHANNEL');
        if (!channelConfig || !channelConfig.value) {
            return interaction.reply({ content: '❌ El sistema de confesiones no está configurado. Un admin debe usar `/setup-confesiones`.', ephemeral: true });
        }

        // Crear el Modal (Formulario emergente)
        const modal = new ModalBuilder()
            .setCustomId('modal_confesion')
            .setTitle('Tu Confesión Anónima');

        const input = new TextInputBuilder()
            .setCustomId('confesion_texto')
            .setLabel("¿Qué quieres confesar?")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Escribe aquí tu secreto... nadie sabrá que fuiste tú.")
            .setMaxLength(1000)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        await interaction.showModal(modal);
    },

    // Esta función se llamará desde interactionCreate.js cuando se envíe el modal
    async handleModal(interaction) {
        const texto = interaction.fields.getTextInputValue('confesion_texto');
        const channelId = stmts.getConfig('CONFESIONES_CHANNEL').value;
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.reply({ content: '❌ El canal de confesiones fue borrado o no existe.', ephemeral: true });
        }

        // Crear Embed Anónimo
        const embed = new EmbedBuilder()
            .setColor('#2f3136') // Color oscuro/discreto
            .setTitle('🕵️‍♂️ Nueva Confesión')
            .setDescription(`"${texto}"`)
            .setFooter({ text: 'Confesión Anónima | Prophet Gaming' })
            .setTimestamp();

        try {
            await channel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ Tu confesión ha sido enviada anónimamente.', ephemeral: true });
        } catch (e) {
            console.error(e);
            await interaction.reply({ content: '❌ Hubo un error al enviar la confesión.', ephemeral: true });
        }
    }
};

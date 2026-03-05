// ═══ COMANDO: /ai — Chat con ProphetBot usando Gemini ═══

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { preguntarAGemini, limpiarContexto } = require('../../modules/aiChat');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('🤖 Chateá con ProphetBot (IA con memoria de conversación)')
        .addSubcommand(sub => sub
            .setName('preguntar')
            .setDescription('Hacé una pregunta o escribí algo')
            .addStringOption(o => o.setName('mensaje').setDescription('Escribí tu pregunta o mensaje').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('limpiar')
            .setDescription('Limpiá el historial de conversación de este canal')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'limpiar') {
            limpiarContexto(interaction.channel.id);
            return interaction.reply({ content: '🧹 Historial limpiado. Nueva conversación desde cero.', ephemeral: true });
        }

        // sub === 'preguntar'
        await interaction.deferReply();

        const pregunta = interaction.options.getString('mensaje');

        // Contexto extra con info del servidor
        const contextoServidor = `Servidor: ${interaction.guild.name}, ${interaction.guild.memberCount} miembros. Usuario que pregunta: ${interaction.user.username} (nivel ${interaction.client.guilds?.cache?.get(interaction.guild.id) ? '' : ''})`;

        // Indicador de "escribiendo..."
        const respuesta = await preguntarAGemini(interaction.channel.id, pregunta, contextoServidor);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setAuthor({
                name: '🤖  ProphetBot AI',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .addFields(
                { name: '❓ Pregunta', value: pregunta.slice(0, 1024) },
                { name: '💬 Respuesta', value: respuesta.slice(0, 1024) }
            )
            .setFooter({
                text: `${interaction.user.username}  ·  Gemini 2.5 Flash  ·  Usá /ai limpiar para nueva conversación`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};

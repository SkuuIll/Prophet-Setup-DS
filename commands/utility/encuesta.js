// ═══ COMANDO: /encuesta ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('encuesta')
        .setDescription('Crear una encuesta con reacciones')
        .addStringOption(o => o.setName('pregunta').setDescription('Pregunta de la encuesta').setRequired(true))
        .addStringOption(o => o.setName('opciones').setDescription('Opciones separadas por | (máx 10)'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const pregunta = interaction.options.getString('pregunta');
        const opcionesStr = interaction.options.getString('opciones');

        if (!opcionesStr) {
            // Encuesta Sí/No
            const embed = new EmbedBuilder()
                .setColor(config.COLORES.INFO)
                .setTitle('📊 Encuesta')
                .setDescription(pregunta)
                .setFooter({ text: `Encuesta de ${interaction.user.displayName}` })
                .setTimestamp();

            const msg = await interaction.channel.send({ embeds: [embed] });
            await msg.react('✅');
            await msg.react('❌');
            await interaction.reply({ content: '✅ Encuesta creada!', ephemeral: true });
        } else {
            const opciones = opcionesStr.split('|').map(o => o.trim()).slice(0, 10);
            const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

            const desc = opciones.map((o, i) => `${emojis[i]} ${o}`).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.INFO)
                .setTitle('📊 Encuesta')
                .setDescription(`**${pregunta}**\n\n${desc}`)
                .setFooter({ text: `Encuesta de ${interaction.user.displayName} • ${opciones.length} opciones` })
                .setTimestamp();

            const msg = await interaction.channel.send({ embeds: [embed] });
            for (let i = 0; i < opciones.length; i++) {
                await msg.react(emojis[i]);
            }
            await interaction.reply({ content: '✅ Encuesta creada!', ephemeral: true });
        }
    }
};

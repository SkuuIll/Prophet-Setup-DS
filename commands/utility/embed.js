// ═══ COMANDO: /embed ═══
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Crear un embed personalizado')
        .addStringOption(o => o.setName('titulo').setDescription('Título del embed').setRequired(true))
        .addStringOption(o => o.setName('descripcion').setDescription('Descripción del embed').setRequired(true))
        .addStringOption(o => o.setName('color').setDescription('Color hex (ej: #FF5733)'))
        .addStringOption(o => o.setName('imagen').setDescription('URL de imagen'))
        .addStringOption(o => o.setName('thumbnail').setDescription('URL de thumbnail'))
        .addStringOption(o => o.setName('footer').setDescription('Texto del footer'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion').replace(/\\n/g, '\n');
        const color = interaction.options.getString('color') || '#F5C542';
        const imagen = interaction.options.getString('imagen');
        const thumbnail = interaction.options.getString('thumbnail');
        const footer = interaction.options.getString('footer');

        const embed = new EmbedBuilder()
            .setTitle(titulo)
            .setDescription(descripcion)
            .setTimestamp();

        try {
            embed.setColor(parseInt(color.replace('#', ''), 16));
        } catch {
            embed.setColor(0xF5C542);
        }

        if (imagen) embed.setImage(imagen);
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (footer) embed.setFooter({ text: footer });

        await interaction.channel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ Embed enviado.', ephemeral: true });
    }
};

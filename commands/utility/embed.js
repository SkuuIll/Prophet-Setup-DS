const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { notice } = require('../../utils/discordUI');

function safeImageUrl(input) {
    if (!input) return null;
    try {
        const url = new URL(input);
        return url.protocol === 'https:' && url.hostname.length > 3 ? url.toString() : null;
    } catch { return null; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Publicar un anuncio con formato')
        .addStringOption(o => o.setName('titulo').setDescription('Título del anuncio').setRequired(true).setMaxLength(256))
        .addStringOption(o => o.setName('descripcion').setDescription('Texto del anuncio').setRequired(true).setMaxLength(4000))
        .addStringOption(o => o.setName('color').setDescription('Color hexadecimal (ej: #FF5733)').setMaxLength(7))
        .addStringOption(o => o.setName('imagen').setDescription('URL HTTPS de la imagen'))
        .addStringOption(o => o.setName('thumbnail').setDescription('URL HTTPS de la miniatura'))
        .addStringOption(o => o.setName('footer').setDescription('Texto al pie').setMaxLength(500))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        if (!interaction.inGuild?.() || !interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply(notice({ title: 'Sin permisos', description: 'Solo el Staff puede publicar anuncios.', tone: 'error' }));
        }
        const title = interaction.options.getString('titulo');
        const description = interaction.options.getString('descripcion').replace(/\\n/g, '\n');
        const color = interaction.options.getString('color') || '#BB86FC';
        const image = interaction.options.getString('imagen');
        const thumb = interaction.options.getString('thumbnail');
        const footer = interaction.options.getString('footer');
        if (!/^#[a-f\d]{6}$/i.test(color) ||
            (image && !safeImageUrl(image)) || (thumb && !safeImageUrl(thumb))) {
            return interaction.reply(notice({
                title: 'Formato inválido',
                description: 'El color debe tener seis cifras hexadecimales y las imágenes deben usar HTTPS.',
                tone: 'error',
            }));
        }

        const embed = new EmbedBuilder()
            .setColor(Number.parseInt(color.slice(1), 16))
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: footer || 'Prophet Gaming · Anuncios' })
            .setTimestamp();
        if (image) embed.setImage(safeImageUrl(image));
        if (thumb) embed.setThumbnail(safeImageUrl(thumb));

        try {
            await interaction.channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
        } catch (error) {
            console.error('[Anuncios /embed] No se pudo publicar:', error);
            return interaction.reply(notice({
                title: 'No se pudo publicar',
                description: 'Revisá que tenga permisos para enviar mensajes y embeds en este canal.',
                tone: 'error',
            }));
        }
        return interaction.reply(notice({
            title: 'Anuncio publicado',
            description: 'El mensaje se envió correctamente en este canal.',
            tone: 'success',
        }));
    },
    _test: { safeImageUrl },
};

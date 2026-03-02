const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pixelate')
        .setDescription('Aplica un filtro pixelado extremo (estilo flav-save-pixels) a tu avatar o de otro usuario')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario a pixelar')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const user = interaction.options.getUser('usuario') || interaction.user;
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 512 });

        try {
            const avatar = await Canvas.loadImage(avatarUrl);

            // Creamos un canvas pequeño (muy pixelado) y luego uno grande para "Save Pixels"
            const PIXELATION_LEVEL = 10;
            const smallCanvas = Canvas.createCanvas(512 / PIXELATION_LEVEL, 512 / PIXELATION_LEVEL);
            const smallCtx = smallCanvas.getContext('2d');
            smallCtx.drawImage(avatar, 0, 0, smallCanvas.width, smallCanvas.height);

            const canvas = Canvas.createCanvas(512, 512);
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false; // Desactivar el suavizado para mantener el efecto pixelado
            ctx.drawImage(smallCanvas, 0, 0, canvas.width, canvas.height);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'pixelated_avatar.png' });

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`🖼️ Imagen Pixelada: ${user.username}`)
                .setDescription('Filtro de reducción de resolución (flav-save-pixels style) aplicado correctamente.')
                .setImage('attachment://pixelated_avatar.png')
                .setFooter({ text: 'Prophet Bot - Image Engine' });

            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            console.error('Error pixelating image:', error);
            await interaction.editReply({ content: '❌ Ocurrió un error al manipular la imagen.' });
        }
    }
};

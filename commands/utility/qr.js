// ═══ COMANDO: /qr ═══
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const config = require('../../config');

// Usar la API pública de QR Server (no requiere instalación)
const QR_API = 'https://api.qrserver.com/v1/create-qr-code/';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('qr')
        .setDescription('📱 Generar un código QR a partir de texto o URL')
        .addStringOption(o =>
            o.setName('contenido')
                .setDescription('Texto, URL o lo que quieras guardar en el QR')
                .setRequired(true)
                .setMaxLength(500))
        .addStringOption(o =>
            o.setName('tamaño')
                .setDescription('Tamaño del QR (por defecto: Mediano)')
                .addChoices(
                    { name: '📦 Pequeño (150px)', value: '150x150' },
                    { name: '📐 Mediano (300px)', value: '300x300' },
                    { name: '🖼️ Grande (500px)', value: '500x500' },
                )
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const contenido = interaction.options.getString('contenido').trim();
        const tamaño = interaction.options.getString('tamaño') || '300x300';

        // Construir URL del QR
        const params = new URLSearchParams({
            data: contenido,
            size: tamaño,
            color: 'BB86FC',     // violeta Prophet
            bgcolor: '1A1A2E',     // fondo oscuro
            format: 'png',
            qzone: '2',          // margen
            ecc: 'M',          // corrección de errores media
        });

        const qrUrl = `${QR_API}?${params.toString()}`;

        // Detectar si es URL
        const esURL = /^https?:\/\//i.test(contenido);
        const tipo = esURL ? '🔗 URL' : '📝 Texto';

        // Preview del contenido (truncado si es largo)
        const preview = contenido.length > 60
            ? contenido.slice(0, 57) + '...'
            : contenido;

        const [w, h] = tamaño.split('x').map(Number);

        await interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                .setAuthor({ name: '📱  QR Generator · Prophet Bot', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `> ${tipo}: \`${preview}\`\n` +
                    `> 📐 Resolución: \`${w} × ${h} px\`\n\n` +
                    `> Escaneá el código con la cámara de tu celular.`
                )
                .setImage(qrUrl)
                .setFooter({ text: `Generado por ${interaction.user.username}  ·  Prophet Bot` })
                .setTimestamp()
            ]
        });
    }
};

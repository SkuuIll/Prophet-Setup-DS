// ════════════════════════════════════════════════════════════════
// 🔗 ENLACES - Comando Utility
// Acortador de URLs + QR automático
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const QRCode = require('qrcode');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enlaces')
        .setDescription('🔗 Acortador de URLs y generador de QR')
        .addSubcommand(sub =>
            sub.setName('acortar')
                .setDescription('✂️ Acortar una URL')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL a acortar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('qr')
                .setDescription('📱 Generar código QR')
                .addStringOption(opt =>
                    opt.setName('contenido')
                        .setDescription('Texto o URL para el QR')
                        .setRequired(true))
                .addBooleanOption(opt =>
                    opt.setName('ocultar')
                        .setDescription('Ocultar el contenido del mensaje')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('expandir')
                .setDescription('🔍 Expandir URL acortada')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL acortada')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'acortar':
                return this.acortarUrl(interaction);
            case 'qr':
                return this.generarQR(interaction);
            case 'expandir':
                return this.expandirUrl(interaction);
        }
    },

    async acortarUrl(interaction) {
        await interaction.deferReply();

        const url = interaction.options.getString('url');

        // Validar URL
        try {
            new URL(url);
        } catch {
            return interaction.editReply({ content: '❌ URL inválida.', ephemeral: true });
        }

        try {
            // Usar is.gd (gratuito, sin API key)
            const response = await axios.get('https://is.gd/create.php', {
                params: { format: 'json', url: url }
            });

            if (response.data.errormessage) {
                throw new Error(response.data.errormessage);
            }

            const shortUrl = response.data.shorturl;

            const embed = new EmbedBuilder()
                .setTitle('✂️ URL Acortada')
                .addFields(
                    { name: '📌 Original', value: `\`${url.substring(0, 100)}${url.length > 100 ? '...' : ''}\``, inline: false },
                    { name: '🔗 Acortada', value: `**${shortUrl}**`, inline: false }
                )
                .setColor(0x4CAF50)
                .setTimestamp();

            // Generar QR para la URL acortada
            const qrBuffer = await QRCode.toBuffer(shortUrl, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
            });
            const attachment = new AttachmentBuilder(qrBuffer, { name: 'qr.png' });
            embed.setImage('attachment://qr.png');

            return interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('Error acortando URL:', error);
            return interaction.editReply({ 
                content: `❌ Error al acortar la URL: ${error.message}`, 
                ephemeral: true 
            });
        }
    },

    async generarQR(interaction) {
        await interaction.deferReply({ ephemeral: interaction.options.getBoolean('ocultar') ?? false });

        const contenido = interaction.options.getString('contenido');

        try {
            const qrBuffer = await QRCode.toBuffer(contenido, {
                width: 300,
                margin: 2,
                color: { dark: '#1a1a2e', light: '#ffffff' }
            });

            const attachment = new AttachmentBuilder(qrBuffer, { name: 'qrcode.png' });

            const embed = new EmbedBuilder()
                .setTitle('📱 Código QR Generado')
                .setDescription(`Escanea el código para acceder al contenido`)
                .addFields({ name: '📝 Contenido', value: `\`${contenido.substring(0, 50)}${contenido.length > 50 ? '...' : ''}\``, inline: false })
                .setImage('attachment://qrcode.png')
                .setColor(0x9C27B0)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('Error generando QR:', error);
            return interaction.editReply({ 
                content: `❌ Error al generar el QR: ${error.message}`, 
                ephemeral: true 
            });
        }
    },

    async expandirUrl(interaction) {
        await interaction.deferReply();

        const url = interaction.options.getString('url');

        try {
            // Seguir redirecciones para obtener URL final
            const response = await axios.head(url, {
                maxRedirects: 10,
                validateStatus: () => true
            });

            const finalUrl = response.request.res.responseUrl || url;
            const redirectChain = response.request._redirect?.redirects?.length || 0;

            const embed = new EmbedBuilder()
                .setTitle('🔍 URL Expandida')
                .addFields(
                    { name: '📌 Original', value: `\`${url}\``, inline: false },
                    { name: '🎯 Destino Final', value: `\`${finalUrl}\``, inline: false },
                    { name: '🔄 Redirecciones', value: `${redirectChain}`, inline: true }
                )
                .setColor(0x2196F3)
                .setTimestamp();

            if (url !== finalUrl) {
                embed.addFields({ 
                    name: '⚠️ Advertencia', 
                    value: 'Esta URL acortada redirige a un destino diferente. Verificá que sea seguro antes de acceder.', 
                    inline: false 
                });
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error expandiendo URL:', error);
            return interaction.editReply({ 
                content: `❌ Error al expandir la URL. Puede que no sea accesible o esté caída.`, 
                ephemeral: true 
            });
        }
    }
};

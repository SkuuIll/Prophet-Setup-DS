// ════════════════════════════════════════════════════════════════
// 🔗 ENLACES - Comando Utility
// Acortador de URLs + QR automático
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const dns = require('dns').promises;
const net = require('net');
const QRCode = require('qrcode');

const REQUEST_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 5;
const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    'metadata',
    'metadata.google.internal',
    'metadata.amazonaws.com',
]);
const BLOCKED_SUFFIXES = ['.local', '.internal', '.home', '.lan'];

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

        const rawUrl = interaction.options.getString('url');

        try {
            const validatedUrl = await validatePublicHttpUrl(rawUrl);
            const response = await axios.get('https://is.gd/create.php', {
                params: { format: 'json', url: validatedUrl.toString() },
                timeout: REQUEST_TIMEOUT_MS,
            });

            if (response.data.errormessage) {
                throw new Error(response.data.errormessage);
            }

            const shortUrl = response.data.shorturl;
            const embed = new EmbedBuilder()
                .setTitle('✂️ URL Acortada')
                .addFields(
                    { name: '📌 Original', value: `\`${truncate(validatedUrl.toString(), 100)}\``, inline: false },
                    { name: '🔗 Acortada', value: `**${shortUrl}**`, inline: false }
                )
                .setColor(0x4CAF50)
                .setTimestamp();

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
                .setDescription('Escaneá el código para acceder al contenido')
                .addFields({ name: '📝 Contenido', value: `\`${truncate(contenido, 50)}\``, inline: false })
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

        const rawUrl = interaction.options.getString('url');

        try {
            const { originalUrl, finalUrl, redirectChain } = await expandUrlSafely(rawUrl);
            const embed = new EmbedBuilder()
                .setTitle('🔍 URL Expandida')
                .addFields(
                    { name: '📌 Original', value: `\`${truncate(originalUrl, 250)}\``, inline: false },
                    { name: '🎯 Destino Final', value: `\`${truncate(finalUrl, 250)}\``, inline: false },
                    { name: '🔄 Redirecciones', value: `${redirectChain}`, inline: true }
                )
                .setColor(0x2196F3)
                .setTimestamp();

            if (originalUrl !== finalUrl) {
                embed.addFields({
                    name: '⚠️ Advertencia',
                    value: 'Esta URL redirige a un destino diferente. Verificá que sea seguro antes de abrirla.',
                    inline: false
                });
            }

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error expandiendo URL:', error);
            return interaction.editReply({
                content: `❌ Error al expandir la URL: ${error.message}`,
                ephemeral: true
            });
        }
    }
};

function truncate(value, max) {
    return value.length > max ? `${value.substring(0, max)}...` : value;
}

function isBlockedHostname(hostname) {
    const normalized = hostname.toLowerCase();
    return BLOCKED_HOSTNAMES.has(normalized) || BLOCKED_SUFFIXES.some(suffix => normalized.endsWith(suffix));
}

function isPrivateIpv4(address) {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN)) return true;

    const [a, b] = parts;
    return a === 0
        || a === 10
        || a === 127
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168);
}

function isPrivateIpv6(address) {
    const normalized = address.toLowerCase();
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (/^fe[89ab]/.test(normalized)) return true;

    if (normalized.startsWith('::ffff:')) {
        const mappedIpv4 = normalized.slice(7);
        if (net.isIPv4(mappedIpv4)) {
            return isPrivateIpv4(mappedIpv4);
        }
        return true;
    }

    return false;
}

function isPrivateAddress(address) {
    const version = net.isIP(address);
    if (version === 4) return isPrivateIpv4(address);
    if (version === 6) return isPrivateIpv6(address);
    return true;
}

async function validatePublicHttpUrl(rawUrl) {
    let parsedUrl;
    try {
        parsedUrl = new URL(rawUrl);
    } catch {
        throw new Error('URL inválida');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Solo se permiten URLs http/https');
    }

    if (!parsedUrl.hostname) {
        throw new Error('La URL no tiene host válido');
    }

    if (parsedUrl.username || parsedUrl.password) {
        throw new Error('No se permiten credenciales embebidas en la URL');
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (isBlockedHostname(hostname)) {
        throw new Error('No se permiten hosts locales o internos');
    }

    if (net.isIP(hostname)) {
        if (isPrivateAddress(hostname)) {
            throw new Error('No se permiten IPs privadas o locales');
        }
        return parsedUrl;
    }

    let records;
    try {
        records = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch {
        throw new Error('No se pudo resolver el dominio');
    }

    if (!records.length) {
        throw new Error('El dominio no resolvió ninguna IP');
    }

    if (records.some(record => isPrivateAddress(record.address))) {
        throw new Error('El dominio apunta a una red privada o local');
    }

    return parsedUrl;
}

async function requestMetadata(url, method) {
    const response = await axios({
        url,
        method,
        maxRedirects: 0,
        timeout: REQUEST_TIMEOUT_MS,
        validateStatus: () => true,
        responseType: method === 'GET' ? 'stream' : 'text',
    });

    if (method === 'GET' && response.data?.destroy) {
        response.data.destroy();
    }

    return response;
}

async function expandUrlSafely(rawUrl) {
    let currentUrl = await validatePublicHttpUrl(rawUrl);
    const originalUrl = currentUrl.toString();
    let redirects = 0;

    while (redirects < MAX_REDIRECTS) {
        let response = await requestMetadata(currentUrl.toString(), 'HEAD');
        if ([405, 501].includes(response.status)) {
            response = await requestMetadata(currentUrl.toString(), 'GET');
        }

        const location = response.headers.location;
        if (!location || ![301, 302, 303, 307, 308].includes(response.status)) {
            return {
                originalUrl,
                finalUrl: currentUrl.toString(),
                redirectChain: redirects,
            };
        }

        let nextLocationUrl;
        try {
            nextLocationUrl = new URL(location, currentUrl).toString();
        } catch {
            throw new Error('La redirección apunta a una URL inválida');
        }

        currentUrl = await validatePublicHttpUrl(nextLocationUrl);
        redirects += 1;
    }

    throw new Error('La URL supera el máximo de redirecciones permitidas');
}

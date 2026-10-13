const { EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');

const PALETTE = Object.freeze({
    primary: config.COLORES?.PRINCIPAL || 0xBB86FC,
    success: config.COLORES?.SUCCESS || 0x69F0AE,
    error: config.COLORES?.ERROR || 0xEF5350,
    warning: config.COLORES?.WARN || 0xFFB74D,
    info: config.COLORES?.INFO || 0x42A5F5,
    music: config.COLORES?.MUSICA || 0x9C89FF,
});

function safeText(text, max = 4096) {
    const content = String(text ?? '').trim();
    return content.length > max ? content.slice(0, max - 1) + '…' : content;
}

function makeEmbed({ title, description, tone = 'primary', footer, iconURL, fields = [] } = {}) {
    const embed = new EmbedBuilder()
        .setColor(PALETTE[tone] || PALETTE.primary)
        .setDescription(safeText(description || 'Sin información disponible.'));
    if (title) {
        const heading = safeText(title, 256);
        if (iconURL && /^https?:\/\//.test(iconURL)) {
            embed.setAuthor({ name: heading, iconURL });
        } else {
            embed.setTitle(heading);
        }
    }
    if (Array.isArray(fields) && fields.length) {
        embed.addFields(fields.slice(0, 25).map(field => ({
            name: safeText(field.name, 256) || 'Detalle',
            value: safeText(field.value, 1024) || 'Sin datos',
            inline: Boolean(field.inline),
        })));
    }
    embed.setFooter({ text: safeText(footer ? 'Prophet Gaming · ' + footer : 'Prophet Gaming', 2048) });
    return embed;
}

function notice({ title, description, tone = 'info', privateReply = true, iconURL } = {}) {
    return {
        embeds: [makeEmbed({ title, description, tone, iconURL })],
        ...(privateReply ? { flags: MessageFlags.Ephemeral } : {}),
    };
}

function parseCoinAmount(input, available) {
    const raw = String(input ?? '').trim().toLowerCase();
    if (raw === 'todo' || raw === 'all') {
        return Number.isSafeInteger(available) && available > 0 ? available : null;
    }
    // Separadores de miles válidos, no aceptar exponente ni números malformados.
    if (!/^(?:[1-9]\d*|[1-9]\d{0,2}(?:[., ]\d{3})+)$/.test(raw)) return null;
    const value = Number(raw.replace(/[., ]/g, ''));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function walletFields(balance, bank, currency = '💰') {
    return [
        { name: 'Efectivo', value: '**' + currency + ' ' + Number(balance || 0).toLocaleString('es-AR') + '**', inline: true },
        { name: 'Banco', value: '**' + currency + ' ' + Number(bank || 0).toLocaleString('es-AR') + '**', inline: true },
        { name: 'Patrimonio', value: '**' + currency + ' ' + Number((balance || 0) + (bank || 0)).toLocaleString('es-AR') + '**', inline: true },
    ];
}

module.exports = { PALETTE, safeText, makeEmbed, notice, parseCoinAmount, walletFields };

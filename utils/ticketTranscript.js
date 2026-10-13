const { AttachmentBuilder } = require('discord.js');

const MAX_MESSAGES = 500;

function renderTranscriptLine(message) {
    const time = new Date(message.createdTimestamp || Date.now()).toISOString();
    const author = message.author?.tag || message.author?.id || 'Usuario desconocido';
    const content = String(message.content || '[Sin texto]').replace(/\r/g, '');
    const links = message.attachments
        ? Array.from(message.attachments.values()).map(a => a.url).filter(Boolean)
        : [];
    return `[${time}] ${author}: ${content}${links.length ? '\nAdjuntos: ' + links.join(' ') : ''}`;
}

/**
 * Fallback sin paquetes de render HTML. Protege el historial si la
 * dependencia discord-html-transcripts falla con un mensaje complejo.
 */
async function createPlainTicketTranscript(channel, userId, maxMessages = MAX_MESSAGES) {
    const cap = Math.min(MAX_MESSAGES, Math.max(1, Number(maxMessages) || MAX_MESSAGES));
    const messages = [];
    let before;
    while (messages.length < cap) {
        const limit = Math.min(100, cap - messages.length);
        const batch = await channel.messages.fetch({
            limit,
            ...(before ? { before } : {}),
        });
        if (!batch?.size) break;
        const page = Array.from(batch.values());
        messages.push(...page);
        before = batch.last()?.id || page[page.length - 1]?.id;
        if (!before || page.length < limit) break;
    }
    const header = `Ticket: ${channel.id}\nUsuario: ${userId}\nExportado: ${new Date().toISOString()}\nMensajes incluidos: ${messages.length} (máximo ${cap})\n\n`;
    const content = header + messages.reverse().map(renderTranscriptLine).join('\n\n');
    return new AttachmentBuilder(Buffer.from(content, 'utf8'), {
        name: `ticket-${userId}.txt`,
    });
}

module.exports = { renderTranscriptLine, createPlainTicketTranscript };

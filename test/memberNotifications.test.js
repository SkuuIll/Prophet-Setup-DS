const test = require('node:test');
const assert = require('node:assert/strict');
const {
    resolveMessageChannel,
    resolveMemberChannel,
    missingSendPermissions,
    sendWithImageFallback,
} = require('../utils/memberNotifications');

const silent = { warn() {}, error() {} };
const channel = (id, name, send = async () => ({})) => ({
    id, name, send, isTextBased: () => true,
});
const makeGuild = list => ({
    channels: {
        cache: new Map(list.map(c => [c.id, c])),
        fetch: async id => list.find(c => c.id === id) || null,
    },
});

test('Bienvenida: un ID borrado no impide recuperar el canal por nombre', async () => {
    const good = channel('123456789012345678', '👋・bienvenidos');
    const result = await resolveMemberChannel(makeGuild([good]), {
        configValue: '999999999999999999',
        persistedValue: '888888888888888888',
        log: silent,
    });
    assert.equal(result, good);
});

test('Despedida: se permite el canal configurado por su ID vigente', async () => {
    const good = channel('123456789012345678', 'entradas-salidas');
    const result = await resolveMemberChannel(makeGuild([good]), {
        configValue: good.id, kind: 'welcome', log: silent,
    });
    assert.equal(result, good);
});

test('Solo se elige un canal que permita enviar mensajes', async () => {
    const bad = { id: '123456789012345678', name: 'bienvenidos', isTextBased: () => false };
    const good = channel('222222222222222222', 'bienvenida');
    const result = await resolveMessageChannel(makeGuild([bad, good]), {
        ids: [bad.id], names: ['bienvenida'], log: silent,
    });
    assert.equal(result, good);
});

test('Si falta un canal, no se envía a uno desconocido', async () => {
    const result = await resolveMemberChannel(makeGuild([channel('123456789012345678', 'chat')]), {
        configValue: 'no-existe', log: silent,
    });
    assert.equal(result, null);
});

test('Detecta falta de permisos para imagen y embeds', () => {
    const guild = { members: { me: { id: '999999999999999999' } } };
    const missing = missingSendPermissions({
        permissionsFor: () => ({ has: flag => false }),
    }, guild);
    assert.deepEqual(missing, ['ViewChannel', 'SendMessages', 'EmbedLinks', 'AttachFiles']);
});

test('Si falla la subida de imagen se reintenta como embed sin imagen', async () => {
    const payloads = [];
    const ch = channel('123456789012345678', 'bienvenidos', async payload => {
        payloads.push(payload);
        if (payload.files?.length) throw new Error('Attachment upload failed');
        return { id: 'message' };
    });
    const sent = await sendWithImageFallback(ch, {
        embeds: [{ title: 'Bienvenida', image: { url: 'attachment://bienvenida.png' } }],
        files: [{ name: 'bienvenida.png' }],
    }, { log: silent });
    assert.equal(sent.id, 'message');
    assert.equal(payloads.length, 2);
    assert.deepEqual(payloads[1].files, []);
    assert.equal(payloads[1].embeds[0].image, undefined);
});

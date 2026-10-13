const test = require('node:test');
const assert = require('node:assert/strict');
const { fetchDiscordUser, exchangeCodeForToken } = require('../games/common/discordActivityAuth');

test('Discord OAuth: input no válido se rechaza antes de llamar a la red', async () => {
    const oldFetch = global.fetch;
    let requests = 0;
    global.fetch = async () => { requests++; throw new Error('No debería usarse'); };
    try {
        assert.equal((await fetchDiscordUser('a')).success, false);
        assert.equal((await fetchDiscordUser({ token: 'abc' })).success, false);
        assert.equal((await exchangeCodeForToken('x'.repeat(2049))).success, false);
        assert.equal(requests, 0);
    } finally {
        global.fetch = oldFetch;
    }
});

test('Discord OAuth: respuesta sin Snowflake válido no crea identidad', async () => {
    const original = global.fetch;
    global.fetch = async (uri, options) => {
        assert.match(uri, /discord\.com\/api\/v10\/users\/@me/);
        assert.equal(options.signal instanceof AbortSignal, true);
        return { ok: true, json: async () => ({ id: '__proto__', username: 'test' }) };
    };
    try {
        const result = await fetchDiscordUser('token_valido_para_testing');
        assert.equal(result.success, false);
        assert.match(result.error, /inválida/);
    } finally {
        global.fetch = original;
    }
});

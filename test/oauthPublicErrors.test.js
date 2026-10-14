const test = require('node:test');
const assert = require('node:assert/strict');
const { exchangeCodeForToken } = require('../games/common/discordActivityAuth');

test('OAuth: a Discord provider error description never reaches the public response', async () => {
    const originalFetch = global.fetch;
    const originalClientId = process.env.DISCORD_CLIENT_ID;
    const originalClientSecret = process.env.DISCORD_CLIENT_SECRET;
    try {
        process.env.DISCORD_CLIENT_ID = '123456789012345678';
        process.env.DISCORD_CLIENT_SECRET = 'only-a-test-credential';
        global.fetch = async () => ({
            ok: false,
            status: 400,
            json: async () => ({
                error: 'invalid_grant',
                error_description: 'PRIVATE_PROVIDER_DIAGNOSTIC_SHOULD_NEVER_BE_RETURNED',
            }),
        });
        const result = await exchangeCodeForToken('invalid-code');
        assert.equal(result.success, false);
        assert.equal(result.status, 400);
        assert.equal(result.error, 'No se pudo validar el código de Discord. Reabrí la Activity.');
        assert.doesNotMatch(JSON.stringify(result), /PRIVATE_PROVIDER_DIAGNOSTIC|invalid_grant/);
    } finally {
        global.fetch = originalFetch;
        if (originalClientId === undefined) delete process.env.DISCORD_CLIENT_ID;
        else process.env.DISCORD_CLIENT_ID = originalClientId;
        if (originalClientSecret === undefined) delete process.env.DISCORD_CLIENT_SECRET;
        else process.env.DISCORD_CLIENT_SECRET = originalClientSecret;
    }
});

test('OAuth: missing credentials do not reveal environment variable names to users', async () => {
    const keys = [
        'DISCORD_CLIENT_ID', 'VITE_DISCORD_CLIENT_ID', 'ACTIVITY_CLIENT_ID',
        'DISCORD_CLIENT_SECRET', 'ACTIVITY_CLIENT_SECRET', 'DISCORD_TOKEN',
    ];
    const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    try {
        for (const key of keys) process.env[key] = '';
        const result = await exchangeCodeForToken('some-code');
        assert.equal(result.success, false);
        assert.equal(result.error, 'Autenticación de Discord no disponible');
        assert.doesNotMatch(JSON.stringify(result), /DISCORD_CLIENT_ID|DISCORD_CLIENT_SECRET/);
    } finally {
        for (const key of keys) {
            if (previous[key] === undefined) delete process.env[key];
            else process.env[key] = previous[key];
        }
    }
});

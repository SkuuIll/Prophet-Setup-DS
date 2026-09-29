const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../config');
const { generarBienvenida, generarDespedida } = require('../utils/canvas');

test('Config: AI está deshabilitada por defecto', () => {
    assert.equal(config.AI?.ENABLED, false, 'AI.ENABLED debe ser false');
    assert.equal(config.ONBOARDING?.ENABLED, false, 'ONBOARDING.ENABLED debe ser false');
});

test('Canvas: generarBienvenida genera un buffer PNG válido sin colgarse', async () => {
    const mockMember = {
        id: '123456789012345678',
        user: {
            id: '123456789012345678',
            username: 'TestUser',
            displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
        },
        guild: {
            memberCount: 198
        }
    };

    const buffer = await generarBienvenida(mockMember);
    assert.ok(buffer instanceof Buffer, 'Debe retornar un Buffer');
    assert.ok(buffer.length > 1000, 'El buffer debe contener datos de imagen');
});

test('Canvas: generarDespedida genera un buffer PNG válido sin colgarse', async () => {
    const mockMember = {
        id: '123456789012345678',
        user: {
            id: '123456789012345678',
            username: 'TestUser',
            displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png'
        },
        guild: {
            memberCount: 197
        }
    };

    const buffer = await generarDespedida(mockMember);
    assert.ok(buffer instanceof Buffer, 'Debe retornar un Buffer');
    assert.ok(buffer.length > 1000, 'El buffer debe contener datos de imagen');
});

test('Canvas: tolera fallos de red en avatar usando el degradado de fallback', async () => {
    const mockMemberBrokenAvatar = {
        id: '999999999999999999',
        user: {
            id: '999999999999999999',
            username: 'BrokenAvatarUser',
            displayAvatarURL: () => 'http://192.0.2.1/nonexistent.png' // IP reservada para TEST-NET-1 (nunca responde)
        },
        guild: {
            memberCount: 198
        }
    };

    const t0 = Date.now();
    const buffer = await generarBienvenida(mockMemberBrokenAvatar);
    const duration = Date.now() - t0;

    assert.ok(buffer instanceof Buffer, 'Debe retornar un Buffer incluso si el avatar falla');
    assert.ok(duration < 4000, `El timeout debe resolver en menos de 4s (duró ${duration}ms)`);
});

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    TROLL_NICKNAMES_POOL,
    getRandomTrollNickname,
    isTrollEnabled,
    setTrollEnabled,
    getMinLevel,
    setMinLevel,
    canManageMember,
    shouldApplyTrollNickname,
    restoreNickname
} = require('../modules/trollNicknames');
const { stmts } = require('../database');

test('los apodos del pool respetan el límite de 32 caracteres de Discord', () => {
    assert.ok(TROLL_NICKNAMES_POOL.length >= 30, 'El pool debe tener al menos 30 apodos');
    for (const nick of TROLL_NICKNAMES_POOL) {
        assert.ok(nick.length <= 32, `El apodo "${nick}" supera los 32 caracteres (${nick.length})`);
        assert.ok(nick.trim().length > 0, 'El apodo no debe estar vacío');
    }
});

test('getRandomTrollNickname genera apodos válidos <= 32 caracteres incluso con nombres largos', () => {
    const longName = 'SuperMegaNombreExtremadamenteLargoParaDiscord12345';
    for (let i = 0; i < 50; i++) {
        const nick = getRandomTrollNickname(longName);
        assert.ok(nick.length <= 32, `El apodo generado "${nick}" supera los 32 caracteres (${nick.length})`);
        assert.ok(nick.length > 0, 'El apodo generado debe tener contenido');
    }
});

test('configuración de nivel mínimo funciona y persiste', () => {
    const original = getMinLevel();
    setMinLevel(15);
    assert.equal(getMinLevel(), 15);
    setMinLevel(10);
    assert.equal(getMinLevel(), 10);
});

test('toggle de activación/desactivación funciona y persiste', () => {
    setTrollEnabled(false);
    assert.equal(isTrollEnabled(), false);
    setTrollEnabled(true);
    assert.equal(isTrollEnabled(), true);
});

test('base de datos persiste y recupera datos de troll_nicknames', () => {
    const testUserId = 'test_user_99999';
    stmts.removeTrollNickData(testUserId);

    stmts.saveTrollNickData(testUserId, 'OriginalGamer', 'El Pibe 0/15', 1234567890);
    const data = stmts.getTrollNickData(testUserId);

    assert.ok(data !== null, 'Debe devolver registro de troll nick');
    assert.equal(data.user_id, testUserId);
    assert.equal(data.original_nickname, 'OriginalGamer');
    assert.equal(data.last_troll_nickname, 'El Pibe 0/15');
    assert.equal(data.last_applied, 1234567890);
    assert.equal(data.applied_count, 1);

    // Actualizar nuevamente y verificar que preserva el original y suma applied_count
    stmts.saveTrollNickData(testUserId, 'NuevoIntentoOriginal', 'Termo de Manaos', 1234567899);
    const updated = stmts.getTrollNickData(testUserId);
    assert.equal(updated.original_nickname, 'OriginalGamer');
    assert.equal(updated.last_troll_nickname, 'Termo de Manaos');
    assert.equal(updated.applied_count, 2);

    stmts.removeTrollNickData(testUserId);
    assert.equal(stmts.getTrollNickData(testUserId), null);
});

test('canManageMember y shouldApplyTrollNickname validan bots y permisos', () => {
    // Miembro bot
    const botMember = {
        id: 'bot_id',
        user: { bot: true },
        guild: { ownerId: 'owner_id', members: { me: { permissions: { has: () => true }, roles: { highest: { position: 10 } } } } }
    };
    assert.equal(canManageMember(botMember), false);
    assert.equal(shouldApplyTrollNickname(botMember), false);

    // Dueño del servidor
    const ownerMember = {
        id: 'owner_id',
        user: { bot: false },
        guild: { ownerId: 'owner_id', members: { me: { permissions: { has: () => true }, roles: { highest: { position: 10 } } } } }
    };
    assert.equal(canManageMember(ownerMember), false);
    assert.equal(shouldApplyTrollNickname(ownerMember), false);
});

test('restoreNickname restaura apodo original y limpia la base de datos', async () => {
    const testUserId = 'test_user_restore_123';
    stmts.saveTrollNickData(testUserId, 'OriginalPlayer', 'Gordo Tetón', Date.now());

    let nicknameSetTo = undefined;
    const mockMember = {
        id: testUserId,
        user: { bot: false, username: 'PlayerBase' },
        guild: {
            ownerId: 'different_owner',
            channels: { cache: new Map() },
            members: {
                me: {
                    permissions: { has: () => true },
                    roles: { highest: { position: 50 } }
                }
            }
        },
        roles: { highest: { position: 10 } },
        setNickname: async (newNick) => {
            nicknameSetTo = newNick;
        }
    };

    const result = await restoreNickname(mockMember);
    assert.equal(result.success, true);
    assert.equal(result.restoredNickname, 'OriginalPlayer');
    assert.equal(nicknameSetTo, 'OriginalPlayer');
    assert.equal(stmts.getTrollNickData(testUserId), null);
});

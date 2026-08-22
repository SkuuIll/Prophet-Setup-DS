'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
    convertText,
    canManageMember,
    applyClanFont,
    applyClanFontToAll,
    restoreMemberFont,
    restoreAllMembersFont,
    getFontStylesList,
    FONT_MAPS
} = require('../modules/clanFont');
const { stmts } = require('../database');
const fuenteCommand = require('../commands/admin/fuente');

test('convertText convierte correctamente a Small Caps', () => {
    const original = 'Elias LP';
    const converted = convertText(original, 'small-caps');
    assert.equal(converted, 'ᴇʟɪᴀs ʟᴘ');

    const clanName = 'Prophet Gaming [Clan]';
    const clanConverted = convertText(clanName, 'small-caps');
    assert.equal(clanConverted, 'ᴘʀᴏᴘʜᴇᴛ ɢᴀᴍɪɴɢ [ᴄʟᴀɴ]');

    // Letras con acentos y ñ
    const special = 'Ángel Niño';
    const specialConverted = convertText(special, 'small-caps');
    assert.equal(specialConverted, 'ᴀɴɢᴇʟ ɴɪɴᴏ');
});

test('convertText respeta el límite máximo de 32 caracteres de Discord', () => {
    const superLong = 'UnNombreDeUsuarioExtremadamenteLargoQueSuperaElLimiteDeDiscord12345';
    const converted = convertText(superLong, 'small-caps');
    assert.ok(converted.length <= 32, `El apodo supera 32 caracteres: ${converted.length}`);
});

test('getFontStylesList devuelve todos los estilos con previews válidos', () => {
    const list = getFontStylesList();
    assert.ok(list.length >= 6);
    for (const style of list) {
        assert.ok(style.id);
        assert.ok(style.name);
        assert.ok(style.preview);
        assert.ok(style.preview.length <= 32);
    }
});

test('Database persiste y recupera datos de font_nicknames', () => {
    const testUserId = 'test_font_user_123';
    stmts.removeFontNickData(testUserId);

    stmts.saveFontNickData(testUserId, 'Original Player', 'ᴏʀɪɢɪɴᴀʟ ᴘʟᴀʏᴇʀ', 'small-caps', 123456789);
    const data = stmts.getFontNickData(testUserId);

    assert.ok(data !== null);
    assert.equal(data.user_id, testUserId);
    assert.equal(data.original_display_name, 'Original Player');
    assert.equal(data.applied_font_nickname, 'ᴏʀɪɢɪɴᴀʟ ᴘʟᴀʏᴇʀ');
    assert.equal(data.font_style, 'small-caps');

    const all = stmts.getAllFontNickData();
    assert.ok(all.some(r => r.user_id === testUserId));

    stmts.removeFontNickData(testUserId);
    assert.equal(stmts.getFontNickData(testUserId), null);
});

test('canManageMember valida correctamente bots, dueños y jerarquía de roles', () => {
    assert.equal(canManageMember(null), false);
    assert.equal(canManageMember({ user: { bot: true } }), false);

    // Servidor donde el usuario es el dueño
    const ownerMember = {
        id: 'owner_123',
        user: { bot: false },
        guild: {
            ownerId: 'owner_123',
            members: { me: { permissions: { has: () => true }, roles: { highest: { position: 10 } } } }
        },
        roles: { highest: { position: 5 } }
    };
    assert.equal(canManageMember(ownerMember), false);

    // Miembro con rol inferior al bot
    const manageableMember = {
        id: 'user_456',
        user: { bot: false },
        guild: {
            ownerId: 'owner_123',
            members: { me: { permissions: { has: () => true }, roles: { highest: { position: 10 } } } }
        },
        roles: { highest: { position: 5 } }
    };
    assert.equal(canManageMember(manageableMember), true);
});

test('applyClanFont y restoreMemberFont aplican y restauran el nombre de vista', async () => {
    const userId = 'font_test_lifecycle_1';
    stmts.removeFontNickData(userId);

    let currentNickname = null;
    const member = {
        id: userId,
        displayName: 'MegaGamer 2026',
        user: { bot: false, username: 'megagamer' },
        nickname: null,
        guild: {
            ownerId: 'owner_999',
            members: { me: { permissions: { has: () => true }, roles: { highest: { position: 100 } } } }
        },
        roles: { highest: { position: 10 } },
        setNickname: async (newNick) => {
            currentNickname = newNick;
            member.nickname = newNick;
        }
    };

    const applyRes = await applyClanFont(member, 'small-caps');
    assert.equal(applyRes.success, true);
    assert.equal(applyRes.newNickname, 'ᴍᴇɢᴀɢᴀᴍᴇʀ 2026');
    assert.equal(currentNickname, 'ᴍᴇɢᴀɢᴀᴍᴇʀ 2026');

    // Verificar en DB
    const dbData = stmts.getFontNickData(userId);
    assert.equal(dbData.original_display_name, 'MegaGamer 2026');

    // Restaurar
    const restoreRes = await restoreMemberFont(member);
    assert.equal(restoreRes.success, true);
    assert.equal(restoreRes.restoredName, 'MegaGamer 2026');
    assert.equal(currentNickname, 'MegaGamer 2026');

    // Verificar que se limpió de DB
    assert.equal(stmts.getFontNickData(userId), null);
});

test('El comando /fuente tiene estructura y opciones válidas', () => {
    assert.equal(fuenteCommand.data.name, 'fuente');
    assert.ok(fuenteCommand.data.description);
    assert.ok(fuenteCommand.execute);
    assert.ok(fuenteCommand.data.options.length >= 6);
});

test('isAutoClanFontEnabled y setClanFontStyle persisten y configuran el modo automático', () => {
    const { isAutoClanFontEnabled, setAutoClanFontEnabled, getClanFontStyle, setClanFontStyle } = require('../modules/clanFont');
    setAutoClanFontEnabled(false);
    assert.equal(isAutoClanFontEnabled(), false);

    setAutoClanFontEnabled(true);
    assert.equal(isAutoClanFontEnabled(), true);

    setClanFontStyle('bold-sans');
    assert.equal(getClanFontStyle(), 'bold-sans');

    setClanFontStyle('small-caps');
    assert.equal(getClanFontStyle(), 'small-caps');
});

test('normalizeToPlainText y convertText permiten cambiar entre múltiples fuentes estilizadas sin perder texto', () => {
    const { normalizeToPlainText } = require('../modules/clanFont');

    const original = 'Prophet Gaming 2026';
    const smallCaps = convertText(original, 'small-caps');
    assert.equal(smallCaps, 'ᴘʀᴏᴘʜᴇᴛ ɢᴀᴍɪɴɢ 2026');

    // Cambiar de small-caps a bold-sans directamente
    const boldSans = convertText(smallCaps, 'bold-sans');
    assert.equal(boldSans, '𝗽𝗿𝗼𝗽𝗵𝗲𝘁 𝗴𝗮𝗺𝗶𝗻𝗴 𝟮𝟬𝟮𝟲');

    // Cambiar de bold-sans a gothic
    const gothic = convertText(boldSans, 'gothic');
    assert.equal(gothic, '𝔭𝔯𝔬𝔭𝔥𝔢𝔱 𝔤𝔞𝔪𝔦𝔫𝔤 2026');

    // Cambiar de gothic a double-struck
    const doubleStruck = convertText(gothic, 'double-struck');
    assert.equal(doubleStruck, '𝕡𝕣𝕠𝕡𝕙𝕖𝕥 𝕘𝕒𝕞𝕚𝕟𝕘 𝟚𝟘𝟚𝟞');

    // Volver a normalizar a texto plano
    const plain = normalizeToPlainText(doubleStruck);
    assert.equal(plain, 'prophet gaming 2026');
});


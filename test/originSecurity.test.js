const test = require('node:test');
const assert = require('node:assert/strict');
const { isAllowedGamesOrigin } = require('../games/common/originSecurity');

test('CORS permite Discord y subdominios genuinos solo con HTTPS', () => {
    for (const origin of [
        'https://discord.com',
        'https://client.discord.com',
        'https://discordapp.com',
        'https://game.discordsays.com',
    ]) {
        assert.equal(isAllowedGamesOrigin(origin, 'localhost:3850'), true, origin);
    }
    for (const origin of [
        'https://discord.com.evil.example',
        'https://notdiscordsays.com',
        'https://evil.example',
        'http://discord.com',
        'null',
        'file:///etc/passwd',
        'https://discord.com/path',
    ]) {
        assert.equal(isAllowedGamesOrigin(origin, 'localhost:3850'), false, origin);
    }
});

test('CORS deja funcionar mismo origen HTTPS y solo permite HTTP local en desarrollo', () => {
    assert.equal(isAllowedGamesOrigin(undefined, undefined), true);
    assert.equal(isAllowedGamesOrigin('https://games.example.com', 'games.example.com', '', 'production'), true);
    assert.equal(isAllowedGamesOrigin('https://evil.example', 'games.example.com', '', 'production'), false);
    assert.equal(isAllowedGamesOrigin('http://localhost:3850', 'localhost:3850', '', 'development'), true);
    assert.equal(isAllowedGamesOrigin('http://localhost:3850', 'localhost:3850', '', 'production'), false);
    assert.equal(isAllowedGamesOrigin('http://evil.example', 'evil.example', '', 'development'), false);
});

test('Orígenes personalizados necesitan coincidencia exacta, HTTPS y configuración', () => {
    assert.equal(isAllowedGamesOrigin('https://staging.example.com', 'other.example', 'https://staging.example.com', 'production'), true);
    assert.equal(isAllowedGamesOrigin('https://staging.example.com.evil', 'other.example', 'https://staging.example.com', 'production'), false);
    assert.equal(isAllowedGamesOrigin('http://staging.example.com', 'other.example', 'http://staging.example.com', 'production'), false);
});

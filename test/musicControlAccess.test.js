const test = require('node:test');
const assert = require('node:assert/strict');
const { musicControlError, ensureMusicController } = require('../utils/musicAccess');

function makeInteraction(userVoiceId, botVoiceId) {
    return {
        user: { id: '100' },
        member: { voice: userVoiceId ? { channelId: userVoiceId } : {} },
        guild: { members: { me: { voice: { channelId: botVoiceId } }, cache: new Map() } },
    };
}

test('Controles de música solo funcionan en el mismo canal de voz', () => {
    assert.equal(musicControlError(makeInteraction('123', '123')), null);
    assert.match(musicControlError(makeInteraction('123', '456')), /mismo canal/);
    assert.match(musicControlError(makeInteraction(null, '123')), /conectarte/);
    assert.match(musicControlError(makeInteraction('123', null)), /todavía no está/);
    assert.equal(ensureMusicController(makeInteraction('123','123')), null);
    assert.equal(ensureMusicController(makeInteraction(null,'123')).flags, 64);
});

test('La pausa no depende de queue.isPlaying, para poder reanudar', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const src = fs.readFileSync(path.resolve(__dirname,'../commands/music/pause.js'),'utf8');
    assert.match(src, /!queue\.currentTrack/);
    assert.match(src, /setPaused\(!isPaused\)/);
});

test('Todos los controles de música restringen el canal de voz', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    for (const command of ['pause','skip','stop','shuffle','loop','filter','volumen']) {
        const src = fs.readFileSync(path.resolve(__dirname,'../commands/music',command+'.js'),'utf8');
        assert.match(src, /ensureMusicController\(interaction\)/, command);
        assert.match(src, /makeEmbed\(/, command);
        assert.doesNotMatch(src, /ephemeral:\s*true/, command);
    }
});

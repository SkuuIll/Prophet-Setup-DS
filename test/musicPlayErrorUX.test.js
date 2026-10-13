const test = require('node:test');
const assert = require('node:assert/strict');
const resolver = require('../utils/musicResolver');
const { stmts } = require('../database');

test('/play: canal de voz ausente no provoca TypeError', async () => {
    const cmd = require('../commands/music/play');
    let reply;
    await cmd.execute({
        user: { id: '123' }, member: null, guild: null,
        reply: async data => { reply = data; },
    }, { player: {} });
    assert.equal(reply.flags, 64);
    assert.match(reply.embeds[0].toJSON().title, /Conectate/);
});

test('/play: falla de extractor se comunica sin detalles privados', async t => {
    const oldResolve = resolver.resolveMusicQuery;
    const oldGuild = stmts.getGuildSettings;
    const oldError = console.error;
    resolver.resolveMusicQuery = async () => {
        throw new Error('INTERNAL_YOUTUBE_SECRET=super-secret-credentials');
    };
    stmts.getGuildSettings = () => ({ music_volume: 10 });
    console.error = () => {};
    const entry = require.resolve('../commands/music/play');
    delete require.cache[entry];
    t.after(() => {
        resolver.resolveMusicQuery = oldResolve;
        stmts.getGuildSettings = oldGuild;
        console.error = oldError;
        delete require.cache[entry];
    });

    const play = require('../commands/music/play');
    let output;
    await play.execute({
        member: { voice: { channel: {
            permissionsFor: () => ({ has: () => true }),
        } } },
        client: { user: { id: 'musicbot' } },
        guildId: '12345678',
        user: { id: '99999' },
        options: { getString: () => 'tema' },
        deferReply: async () => {},
        editReply: async data => { output = data; },
    }, {
        player: {
            extractors: { store: new Map([['yt', {}]]) },
        },
    });
    assert.ok(output.embeds?.length === 1);
    const text = JSON.stringify(output.embeds[0].toJSON());
    assert.match(text, /No se pudo reproducir/);
    assert.doesNotMatch(text, /INTERNAL_YOUTUBE_SECRET|super-secret-credentials/);
});

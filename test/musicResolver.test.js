const test = require('node:test');
const assert = require('node:assert/strict');
const {
    canonicalYouTubeUrl,
    getYouTubeVideoId,
    parseSearchResult,
    resolveMusicQuery,
} = require('../utils/musicResolver');

test('normaliza enlaces directos de YouTube sin mezclar playlists ni radios', () => {
    const id = 'pRpeEdMmmQ0';
    assert.equal(canonicalYouTubeUrl(`https://youtu.be/${id}?si=test`), `https://www.youtube.com/watch?v=${id}`);
    assert.equal(canonicalYouTubeUrl(`https://www.youtube.com/watch?v=${id}&list=RDxyz&index=4`), `https://www.youtube.com/watch?v=${id}`);
    assert.equal(canonicalYouTubeUrl(`https://music.youtube.com/watch?v=${id}&list=PL123`), `https://www.youtube.com/watch?v=${id}`);
    assert.equal(canonicalYouTubeUrl(`https://youtube.com/shorts/${id}`), `https://www.youtube.com/watch?v=${id}`);
    assert.equal(getYouTubeVideoId('https://notyoutube.com/watch?v=pRpeEdMmmQ0'), null);
});

test('convierte la salida de yt-dlp en una URL exacta', () => {
    const result = parseSearchResult(JSON.stringify({
        entries: [{
            id: 'pRpeEdMmmQ0',
            title: 'Shakira - Waka Waka',
            url: 'https://www.youtube.com/watch?v=pRpeEdMmmQ0',
        }],
    }));
    assert.equal(result.query, 'https://www.youtube.com/watch?v=pRpeEdMmmQ0');
    assert.equal(result.title, 'Shakira - Waka Waka');
});

test('resuelve texto con el buscador inyectado y conserva URLs no YouTube', async () => {
    const result = await resolveMusicQuery('tema exacto', {
        searchYouTube: async query => ({
            query: 'https://www.youtube.com/watch?v=pRpeEdMmmQ0',
            title: query,
            videoId: 'pRpeEdMmmQ0',
            source: 'test',
        }),
    });
    assert.equal(result.title, 'tema exacto');

    const spotify = await resolveMusicQuery('https://open.spotify.com/track/123');
    assert.equal(spotify.query, 'https://open.spotify.com/track/123');
    assert.equal(spotify.source, 'direct-url');
});

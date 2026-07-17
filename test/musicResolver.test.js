const test = require('node:test');
const assert = require('node:assert/strict');
const {
    canonicalYouTubeUrl,
    buildDiscordPlaylist,
    formatDuration,
    getYouTubeVideoId,
    getYouTubePlaylistId,
    parsePlaylistResult,
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
    assert.equal(
        getYouTubePlaylistId('https://music.youtube.com/playlist?list=PL4fGSI1pDJn7fvWchioTU4Hr694rakoFq'),
        'PL4fGSI1pDJn7fvWchioTU4Hr694rakoFq'
    );
});

test('convierte playlists de yt-dlp en pistas exactas y con duración', () => {
    const result = parsePlaylistResult({
        id: 'PL4fGSI1pDJn7fvWchioTU4Hr694rakoFq',
        title: 'Daily Top Music Videos - Argentina',
        playlist_count: 2,
        entries: [
            { id: 'fcnDmrtj6Sk', title: 'Dai Dai', channel: 'Shakira', duration: 241 },
            { id: 'hUzW0SM3YtI', title: 'Para la gilada', channel: 'Meta Guacha', duration: 177 },
        ],
    }, 'https://music.youtube.com/playlist?list=PL4fGSI1pDJn7fvWchioTU4Hr694rakoFq');

    assert.equal(result.kind, 'playlist');
    assert.equal(result.tracks.length, 2);
    assert.equal(result.tracks[0].url, 'https://www.youtube.com/watch?v=fcnDmrtj6Sk');
    assert.equal(result.tracks[0].duration, '4:01');
    assert.equal(formatDuration(3661), '1:01:01');

    const playlist = buildDiscordPlaylist({}, result, null);
    assert.equal(playlist.tracks.length, 2);
    assert.equal(playlist.tracks[0].playlist, playlist);
    assert.equal(playlist.tracks[0].queryType, 'youtubeVideo');
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

    const playlist = await resolveMusicQuery(
        'https://music.youtube.com/playlist?list=PL4fGSI1pDJn7fvWchioTU4Hr694rakoFq',
        {
            resolveYouTubePlaylist: async url => ({
                kind: 'playlist',
                url,
                tracks: [{ videoId: 'fcnDmrtj6Sk' }],
            }),
        }
    );
    assert.equal(playlist.kind, 'playlist');
});

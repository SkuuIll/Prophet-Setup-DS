const { spawn } = require('child_process');

const YOUTUBE_HOSTS = new Set([
    'youtube.com',
    'www.youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be',
    'www.youtu.be',
]);
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,100}$/;
const MAX_PLAYLIST_TRACKS = 100;

function parseUrl(value) {
    try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        return url;
    } catch {
        return null;
    }
}

function getYouTubeVideoId(value) {
    const url = parseUrl(value);
    if (!url || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;

    let videoId = null;
    if (url.hostname.toLowerCase().endsWith('youtu.be')) {
        [videoId] = url.pathname.split('/').filter(Boolean);
    } else if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v');
    } else {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['shorts', 'live', 'embed'].includes(parts[0])) videoId = parts[1];
    }

    return VIDEO_ID_PATTERN.test(videoId || '') ? videoId : null;
}

function canonicalYouTubeUrl(value) {
    const videoId = getYouTubeVideoId(value);
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

function getYouTubePlaylistId(value) {
    const url = parseUrl(value);
    if (!url || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) return null;
    const playlistId = url.searchParams.get('list');
    return PLAYLIST_ID_PATTERN.test(playlistId || '') ? playlistId : null;
}

function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
        : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function parseSearchResult(output) {
    const payload = JSON.parse(output);
    const result = Array.isArray(payload.entries) ? payload.entries[0] : payload;
    const videoId = result?.id || getYouTubeVideoId(result?.webpage_url || result?.url || '');
    if (!VIDEO_ID_PATTERN.test(videoId || '')) {
        throw new Error('YouTube no devolvió un video válido');
    }

    return {
        query: `https://www.youtube.com/watch?v=${videoId}`,
        title: result.title || null,
        videoId,
        source: 'yt-dlp-search',
    };
}

function runYtDlpJson(target, {
    timeoutMs = 20000,
    spawnFn = spawn,
    playlistEnd = 1,
} = {}) {
    return new Promise((resolve, reject) => {
        const child = spawnFn('yt-dlp', [
            '--dump-single-json',
            '--flat-playlist',
            '--playlist-end', String(playlistEnd),
            '--no-warnings',
            '--',
            target,
        ]);
        let stdout = '';
        let stderr = '';
        let settled = false;
        let timer;

        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            callback(value);
        };

        child.stdout.on('data', chunk => {
            stdout += chunk.toString();
            if (stdout.length > 10 * 1024 * 1024) {
                child.kill('SIGKILL');
                finish(reject, new Error('La respuesta de YouTube fue demasiado grande'));
            }
        });
        child.stderr.on('data', chunk => {
            if (stderr.length < 4000) stderr += chunk.toString();
        });
        child.on('error', error => finish(reject, error));
        child.on('close', code => {
            if (code !== 0) {
                finish(reject, new Error(stderr.trim() || `yt-dlp terminó con código ${code}`));
                return;
            }
            try {
                finish(resolve, JSON.parse(stdout));
            } catch (error) {
                finish(reject, error);
            }
        });

        timer = setTimeout(() => {
            child.kill('SIGKILL');
            finish(reject, new Error('YouTube superó el tiempo límite de respuesta'));
        }, timeoutMs);
    });
}

async function searchYouTube(query, options = {}) {
    const payload = await runYtDlpJson(`ytsearch1:${query}`, {
        ...options,
        playlistEnd: 1,
    });
    return parseSearchResult(JSON.stringify(payload));
}

function parsePlaylistResult(payload, originalUrl, maxTracks = MAX_PLAYLIST_TRACKS) {
    const entries = (payload?.entries || [])
        .filter(entry => VIDEO_ID_PATTERN.test(entry?.id || ''))
        .slice(0, maxTracks)
        .map(entry => ({
            videoId: entry.id,
            title: entry.title || 'Tema sin título',
            author: entry.channel || entry.uploader || entry.artist || 'Artista desconocido',
            url: `https://www.youtube.com/watch?v=${entry.id}`,
            thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
            duration: formatDuration(entry.duration),
            views: Number(entry.view_count) || 0,
        }));

    if (!entries.length) throw new Error('La playlist no contiene videos reproducibles');

    return {
        kind: 'playlist',
        source: 'yt-dlp-playlist',
        playlistId: payload.id || getYouTubePlaylistId(originalUrl),
        title: payload.title || 'Playlist de YouTube',
        author: payload.channel || payload.uploader || 'YouTube',
        url: originalUrl,
        thumbnail: payload.thumbnail || entries[0].thumbnail,
        tracks: entries,
        truncated: (payload.playlist_count || entries.length) > entries.length,
    };
}

async function resolveYouTubePlaylist(url, options = {}) {
    const maxTracks = Math.min(
        MAX_PLAYLIST_TRACKS,
        Math.max(1, Number(options.maxPlaylistTracks) || MAX_PLAYLIST_TRACKS)
    );
    const payload = await runYtDlpJson(url, {
        ...options,
        timeoutMs: options.timeoutMs || 30000,
        playlistEnd: maxTracks,
    });
    return parsePlaylistResult(payload, url, maxTracks);
}

async function resolveMusicQuery(input, options = {}) {
    const query = String(input || '').trim();
    if (!query) throw new Error('La consulta está vacía');

    const url = parseUrl(query);
    if (url) {
        const playlistId = getYouTubePlaylistId(query);
        const canonicalUrl = canonicalYouTubeUrl(query);
        if (playlistId && !canonicalUrl) {
            const resolvePlaylist = options.resolveYouTubePlaylist || resolveYouTubePlaylist;
            return resolvePlaylist(query, options);
        }
        return {
            kind: 'track',
            query: canonicalUrl || query,
            title: null,
            videoId: canonicalUrl ? getYouTubeVideoId(canonicalUrl) : null,
            source: canonicalUrl ? 'youtube-url' : 'direct-url',
        };
    }

    const search = options.searchYouTube || searchYouTube;
    return { kind: 'track', ...await search(query, options) };
}

function buildDiscordPlaylist(player, resolved, requestedBy) {
    const { Playlist, QueryType, Track } = require('discord-player');
    const tracks = resolved.tracks.map(item => new Track(player, {
        title: item.title,
        author: item.author,
        url: item.url,
        thumbnail: item.thumbnail,
        duration: item.duration,
        views: item.views,
        requestedBy,
        source: 'youtube',
        queryType: QueryType.YOUTUBE_VIDEO,
        raw: { source: 'youtube', videoId: item.videoId },
    }));
    const playlist = new Playlist(player, {
        tracks,
        title: resolved.title,
        description: `${tracks.length} temas resueltos por yt-dlp`,
        thumbnail: resolved.thumbnail,
        type: 'playlist',
        source: 'youtube',
        author: { name: resolved.author, url: resolved.url },
        id: resolved.playlistId,
        url: resolved.url,
    });
    for (const track of tracks) track.playlist = playlist;
    return playlist;
}

module.exports = {
    MAX_PLAYLIST_TRACKS,
    buildDiscordPlaylist,
    canonicalYouTubeUrl,
    formatDuration,
    getYouTubeVideoId,
    getYouTubePlaylistId,
    parsePlaylistResult,
    parseSearchResult,
    resolveMusicQuery,
    resolveYouTubePlaylist,
    runYtDlpJson,
    searchYouTube,
};

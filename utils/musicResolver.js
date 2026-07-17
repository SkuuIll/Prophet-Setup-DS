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

function searchYouTube(query, { timeoutMs = 20000, spawnFn = spawn } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawnFn('yt-dlp', [
            '--dump-single-json',
            '--flat-playlist',
            '--playlist-end', '1',
            '--no-warnings',
            '--',
            `ytsearch1:${query}`,
        ]);
        let stdout = '';
        let stderr = '';
        let settled = false;

        const finish = (callback, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            callback(value);
        };

        child.stdout.on('data', chunk => {
            stdout += chunk.toString();
            if (stdout.length > 5 * 1024 * 1024) {
                child.kill('SIGKILL');
                finish(reject, new Error('La respuesta de búsqueda fue demasiado grande'));
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
                finish(resolve, parseSearchResult(stdout));
            } catch (error) {
                finish(reject, error);
            }
        });

        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            finish(reject, new Error('La búsqueda de YouTube superó el tiempo límite'));
        }, timeoutMs);
    });
}

async function resolveMusicQuery(input, options = {}) {
    const query = String(input || '').trim();
    if (!query) throw new Error('La consulta está vacía');

    const url = parseUrl(query);
    if (url) {
        const canonicalUrl = canonicalYouTubeUrl(query);
        return {
            query: canonicalUrl || query,
            title: null,
            videoId: canonicalUrl ? getYouTubeVideoId(canonicalUrl) : null,
            source: canonicalUrl ? 'youtube-url' : 'direct-url',
        };
    }

    const search = options.searchYouTube || searchYouTube;
    return search(query, options);
}

module.exports = {
    canonicalYouTubeUrl,
    getYouTubeVideoId,
    parseSearchResult,
    resolveMusicQuery,
    searchYouTube,
};

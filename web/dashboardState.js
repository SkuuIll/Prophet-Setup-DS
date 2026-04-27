const fs = require('fs');
const os = require('os');
const path = require('path');

const { ChannelType } = require('discord.js');
const config = require('../config');
const pkg = require('../package.json');
const { _db, stmts } = require('../database');
const { getContextStats } = require('../modules/aiChat');
const { getBaseChannelId, applyChannelOverridesToConfig, getChannel: getRuntimeChannel, getChannelId } = require('../utils/runtimeConfig');

const DB_PATH = path.join(__dirname, '..', 'data', 'prophet.sqlite');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');
const ANALYTICS_TIMEZONE = 'America/Argentina/Buenos_Aires';
const EDITABLE_CONFIG_FIELDS = [
    {
        key: 'SUGERENCIAS_CHANNEL',
        label: 'Canal de sugerencias',
        description: 'Canal donde `/suggest` publica propuestas y votaciones.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => config.SUGERENCIAS.CHANNEL_ID,
    },
    {
        key: 'CONFESIONES_CHANNEL',
        label: 'Canal de confesiones',
        description: 'Destino de las confesiones anónimas enviadas por `/confesion`.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
    },
    {
        key: 'COUNTING_CHANNEL',
        label: 'Canal de counting',
        description: 'Canal usado por el juego de contar. Al cambiarlo se reinicia la racha.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
    },
    {
        key: 'voice_generator_id',
        label: 'Generador de salas temporales',
        description: 'Canal de voz que crea salas temporales al entrar.',
        expectedChannelTypes: [ChannelType.GuildVoice],
        expectedTypeLabel: 'Canal de voz',
    },
    {
        key: 'voice_category_id',
        label: 'Categoría de salas temporales',
        description: 'Categoría donde se crean y limpian las salas temporales.',
        expectedChannelTypes: [ChannelType.GuildCategory],
        expectedTypeLabel: 'Categoría',
    },
    {
        key: 'LOGS',
        label: 'Canal de logs',
        description: 'Destino principal de auditoría, moderación, AutoMod y transcripts de tickets.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => getBaseChannelId('LOGS'),
    },
    {
        key: 'COMANDOS_BOT',
        label: 'Canal de comandos',
        description: 'Canal por defecto donde usuarios no staff pueden ejecutar slash commands.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => getBaseChannelId('COMANDOS_BOT'),
    },
    {
        key: 'REPORTES',
        label: 'Canal de reportes',
        description: 'Canal preferido para recibir reportes privados enviados con `/reporte`.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => getBaseChannelId('REPORTES'),
    },
    {
        key: 'STAFF',
        label: 'Canal de staff',
        description: 'Canal alternativo para staff y fallback operativo cuando faltan otros destinos internos.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => getBaseChannelId('STAFF'),
    },
    {
        key: 'BIENVENIDOS',
        label: 'Canal de bienvenidas',
        description: 'Canal donde se publican las tarjetas de bienvenida y anuncios de boosts.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => getBaseChannelId('BIENVENIDOS'),
    },
    {
        key: 'ANUNCIOS',
        label: 'Canal de anuncios',
        description: 'Canal alternativo para anuncios comunitarios y fallback de boosts.',
        expectedChannelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
        expectedTypeLabel: 'Canal de texto o anuncios',
        fallbackValue: () => getBaseChannelId('ANUNCIOS'),
    },
    {
        key: 'CHAT',
        label: 'Canal principal de chat',
        description: 'Canal general donde el bot puede intervenir con IA y publicar cumpleaños.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => getBaseChannelId('CHAT'),
    },
    {
        key: 'REGLAS',
        label: 'Canal de reglas',
        description: 'Referencia usada en mensajes de bienvenida y recursos de onboarding.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => getBaseChannelId('REGLAS'),
    },
    {
        key: 'ROLES',
        label: 'Canal de roles',
        description: 'Canal donde se publica el mensaje manual de roles y rangos del servidor.',
        expectedChannelTypes: [ChannelType.GuildText],
        expectedTypeLabel: 'Canal de texto',
        fallbackValue: () => getBaseChannelId('ROLES'),
    },
];
const EDITABLE_CONFIG_KEYS = new Set(EDITABLE_CONFIG_FIELDS.map(field => field.key));

function normalizeDiscordId(value) {
    if (value == null) return null;
    const normalized = String(value).trim();
    return normalized === '' ? null : normalized;
}

function isDiscordSnowflake(value) {
    return /^\d{17,20}$/.test(String(value || ''));
}

function getEditableConfigField(key) {
    return EDITABLE_CONFIG_FIELDS.find(field => field.key === key) || null;
}

function getEditableConfigStoredValue(key) {
    return stmts.getConfig(key)?.value ?? null;
}

function getEditableConfigFallbackValue(field) {
    return typeof field.fallbackValue === 'function' ? normalizeDiscordId(field.fallbackValue()) : null;
}

function resolveChannelSummary(guild, channelId) {
    const normalizedId = normalizeDiscordId(channelId);
    if (!normalizedId) {
        return {
            id: null,
            exists: false,
            name: null,
            mention: '-',
            type: null,
        };
    }

    const channel = guild?.channels?.cache?.get(normalizedId) || null;
    if (!channel) {
        return {
            id: normalizedId,
            exists: false,
            name: null,
            mention: `ID ${normalizedId}`,
            type: null,
        };
    }

    return {
        id: channel.id,
        exists: true,
        name: channel.name,
        mention: `#${channel.name}`,
        type: channel.type,
    };
}

function getEditableConfig() {
    return EDITABLE_CONFIG_FIELDS.map(field => {
        const storedValue = getEditableConfigStoredValue(field.key);
        const fallbackValue = getEditableConfigFallbackValue(field);
        const effectiveValue = storedValue ?? fallbackValue;
        const source = storedValue != null ? 'sqlite' : fallbackValue != null ? 'config' : 'unset';

        return {
            key: field.key,
            label: field.label,
            description: field.description,
            expectedTypeLabel: field.expectedTypeLabel,
            value: effectiveValue ?? '',
            persistedValue: storedValue,
            fallbackValue,
            source,
        };
    });
}

function getRuntimeConfig() {
    return stmts.getAllConfig().filter(row => !EDITABLE_CONFIG_KEYS.has(row.key));
}

function getEditableConfigSnapshot(client) {
    const guild = getGuild(client);

    return getEditableConfig().map(field => ({
        ...field,
        resolved: resolveChannelSummary(guild, field.value),
    }));
}

function validateEditableConfigUpdate(client, update) {
    const key = typeof update?.key === 'string' ? update.key.trim() : '';
    const field = getEditableConfigField(key);

    if (!field) {
        throw new Error(`La clave \`${key || '(vacía)'}\` no es editable desde el dashboard.`);
    }

    const normalizedValue = normalizeDiscordId(update?.value);
    if (!normalizedValue) {
        return { field, key, value: null };
    }

    if (!isDiscordSnowflake(normalizedValue)) {
        throw new Error(`${field.label}: el valor debe ser un ID de Discord válido o quedar vacío.`);
    }

    const guild = getGuild(client);
    if (!guild) {
        return { field, key, value: normalizedValue };
    }

    const channel = guild.channels.cache.get(normalizedValue);
    if (!channel) {
        throw new Error(`${field.label}: no se encontró ningún canal con ese ID en el servidor.`);
    }

    const expectedTypes = Array.isArray(field.expectedChannelTypes)
        ? field.expectedChannelTypes
        : field.expectedChannelType != null
            ? [field.expectedChannelType]
            : [];

    if (expectedTypes.length > 0 && !expectedTypes.includes(channel.type)) {
        throw new Error(`${field.label}: el canal debe ser de tipo ${field.expectedTypeLabel.toLowerCase()}.`);
    }

    return { field, key, value: normalizedValue };
}

function updateEditableConfig(client, updates = []) {
    const normalizedUpdates = Array.isArray(updates) ? updates : [];
    if (!normalizedUpdates.length) {
        throw new Error('No se recibieron cambios para guardar.');
    }

    const previousCountingChannel = getEditableConfigStoredValue('COUNTING_CHANNEL');
    const seenKeys = new Set();

    for (const update of normalizedUpdates) {
        if (seenKeys.has(update?.key)) {
            throw new Error(`La clave \`${update.key}\` fue enviada más de una vez.`);
        }
        seenKeys.add(update?.key);
    }

    const validatedUpdates = normalizedUpdates.map(update => validateEditableConfigUpdate(client, update));

    for (const update of validatedUpdates) {
        if (update.value == null) {
            stmts.deleteConfig(update.key);
        } else {
            stmts.setConfig(update.key, update.value);
        }
    }

    const updatedCountingChannel = getEditableConfigStoredValue('COUNTING_CHANNEL');
    if ((previousCountingChannel || null) !== (updatedCountingChannel || null)) {
        stmts.setConfig('COUNTING_CURRENT', 0);
        stmts.setConfig('COUNTING_LAST_USER', null);
    }

    applyChannelOverridesToConfig();

    const snapshot = getEditableConfigSnapshot(client);
    return validatedUpdates.map(update => snapshot.find(item => item.key === update.key)).filter(Boolean);
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 2)} ${units[exponent]}`;
}

function formatUptime(seconds) {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function formatDateKey(timestamp = Date.now()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: ANALYTICS_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(timestamp));
}

function buildDateRange(days = 7) {
    return Array.from({ length: days }, (_, index) => {
        const daysAgo = days - index - 1;
        return formatDateKey(Date.now() - (daysAgo * 24 * 60 * 60 * 1000));
    });
}

function getScalar(query, fallback = 0, ...params) {
    try {
        const row = _db.prepare(query).get(...params);
        const value = row ? Object.values(row)[0] : fallback;
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function safePreview(value, maxLength = 180) {
    if (value == null) return '-';
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function getGuild(client) {
    return client.guilds.cache.get(config.GUILD_ID) || client.guilds.cache.first() || null;
}

function getChannel(guild, key) {
    return getRuntimeChannel(guild, key);
}

function getBackupInfo() {
    try {
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith('.sqlite'))
            .sort()
            .reverse();

        return {
            count: backups.length,
            latest: backups[0] || null,
        };
    } catch {
        return { count: 0, latest: null };
    }
}

function getDatabaseStats() {
    let dbSizeBytes = 0;

    try {
        dbSizeBytes = fs.statSync(DB_PATH).size;
    } catch { }

    const backupInfo = getBackupInfo();

    return {
        sizeBytes: dbSizeBytes,
        sizeFormatted: formatBytes(dbSizeBytes),
        backups: backupInfo,
        counts: {
            users: getScalar('SELECT COUNT(*) as count FROM users'),
            activeUsers: getScalar('SELECT COUNT(*) as count FROM users WHERE messages > 0 OR voice_minutes > 0'),
            warns: getScalar('SELECT COUNT(*) as count FROM warns'),
            logs: getScalar('SELECT COUNT(*) as count FROM logs'),
            tickets: getScalar('SELECT COUNT(*) as count FROM tickets'),
            tempbans: getScalar('SELECT COUNT(*) as count FROM tempbans'),
            tempChannels: getScalar('SELECT COUNT(*) as count FROM temp_channels'),
            reminders: getScalar('SELECT COUNT(*) as count FROM reminders'),
            pendingReminders: getScalar('SELECT COUNT(*) as count FROM reminders WHERE remind_at >= ?', 0, Date.now()),
            giveaways: getScalar('SELECT COUNT(*) as count FROM giveaways WHERE ended = 0'),
            twitchSubs: getScalar('SELECT COUNT(*) as count FROM twitch_subs'),
            youtubeSubs: getScalar('SELECT COUNT(*) as count FROM youtube_subs'),
            githubSubs: getScalar('SELECT COUNT(*) as count FROM github_subs'),
            gameServers: getScalar('SELECT COUNT(*) as count FROM game_servers'),
            webhooks: getScalar('SELECT COUNT(*) as count FROM discord_webhooks'),
        },
    };
}

function getSystemStats() {
    const memory = process.memoryUsage();

    return {
        node: process.version,
        platform: `${os.type()} ${os.release()}`,
        uptimeSeconds: Math.floor(process.uptime()),
        uptimeFormatted: formatUptime(process.uptime()),
        loadAverage: os.loadavg(),
        memory: {
            rssBytes: memory.rss,
            rssFormatted: formatBytes(memory.rss),
            heapUsedBytes: memory.heapUsed,
            heapUsedFormatted: formatBytes(memory.heapUsed),
            heapTotalBytes: memory.heapTotal,
            heapTotalFormatted: formatBytes(memory.heapTotal),
            externalBytes: memory.external,
            externalFormatted: formatBytes(memory.external),
        },
    };
}

function getDiscordStats(client) {
    const guild = getGuild(client);
    const channels = guild?.channels?.cache;
    const roles = guild?.roles?.cache;
    const contextStats = getContextStats();

    return {
        ready: client.isReady(),
        ping: Math.round(client.ws.ping || 0),
        commands: client.commands?.size || 0,
        guilds: client.guilds.cache.size,
        voiceSessions: client.voiceSessions?.size || 0,
        cooldownBuckets: client.cooldowns?.size || 0,
        aiContexts: contextStats,
        guild: guild ? {
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            channelCount: channels?.size || 0,
            roleCount: roles?.size || 0,
            boosts: guild.premiumSubscriptionCount || 0,
            boostTier: guild.premiumTier || 0,
        } : null,
    };
}

function getLeaderboards(guild, limit = 5) {
    const resolveName = (userId) => guild?.members?.cache?.get(userId)?.user?.username || `ID ${String(userId).slice(-6)}`;

    return {
        xp: stmts.getTop(limit).map(user => ({
            id: user.id,
            username: resolveName(user.id),
            level: user.level,
            xp: user.xp,
            messages: user.messages,
        })),
        economy: stmts.getEcoTop(limit).map(user => ({
            id: user.id,
            username: resolveName(user.id),
            balance: user.balance,
            bank: user.bank,
            total: user.total,
        })),
        voice: stmts.getTopVoice(limit).map(user => ({
            id: user.id,
            username: resolveName(user.id),
            voiceMinutes: user.voice_minutes,
            level: user.level,
            xp: user.xp,
        })),
    };
}

function getMonitorStats() {
    return {
        twitch: stmts.getAllTwitchSubs(),
        youtube: stmts.getAllYoutubeSubs(),
        github: stmts.getAllGithubSubs(),
        gameServers: stmts.getAllGameServers(),
    };
}

function getRecentLogs(limit = 20) {
    return stmts.getLogs(limit);
}

function getStaticConfig() {
    return {
        channels: config.CHANNELS,
        roles: config.ROLES,
        levels: {
            xpMin: config.NIVELES.XP_MIN,
            xpMax: config.NIVELES.XP_MAX,
            cooldownMs: config.NIVELES.COOLDOWN,
            voiceXpPerMinute: config.NIVELES.VOICE_XP_POR_MINUTO,
            rolesByLevel: config.NIVELES.ROLES_POR_NIVEL,
        },
        economy: config.ECONOMIA,
        moderation: config.MODERACION,
        music: config.MUSICA,
        lavalink: {
            url: config.LAVALINK.URL,
            secure: config.LAVALINK.SECURE,
            usingDefaultPassword: config.LAVALINK.PASSWORD === 'youshallnotpass',
        },
        dashboard: {
            enabled: config.DASHBOARD.ENABLED,
            host: config.DASHBOARD.HOST,
            port: config.DASHBOARD.PORT,
            tokenProtected: Boolean(config.DASHBOARD.TOKEN),
            refreshMs: config.DASHBOARD.REFRESH_MS,
        },
        antispam: {
            maxMensajes: config.ANTISPAM.MAX_MENSAJES,
            intervalo: config.ANTISPAM.INTERVALO,
            muteDuracion: config.ANTISPAM.MUTE_DURACION,
            maxMenciones: config.ANTISPAM.MAX_MENCIONES,
            maxMayusculas: config.ANTISPAM.MAX_MAYUSCULAS,
            filtrarInvites: config.ANTISPAM.FILTRAR_INVITES,
            filtrarLinks: config.ANTISPAM.FILTRAR_LINKS,
            whitelistDomainsCount: config.ANTISPAM.WHITELIST_DOMAINS.length,
            palabrasProhibidasCount: config.ANTISPAM.PALABRAS_PROHIBIDAS.length,
        },
    };
}

function getDynamicConfig() {
    return stmts.getAllConfig();
}

function getMusicStats(client) {
    const nodes = client.shoukaku?.nodes ? Array.from(client.shoukaku.nodes.values()) : [];

    return {
        discordPlayerReady: Boolean(client.player),
        shoukakuReady: Boolean(client.shoukaku),
        nodes: nodes.map(node => ({
            name: node.name,
            state: node.state || 'unknown',
        })),
    };
}

function getAnalyticsSnapshot(client, days = 7) {
    const guild = getGuild(client);
    const rows = stmts.getAnalyticsMetrics(days);
    const dates = buildDateRange(days);
    const totalsByDateMetric = new Map();

    for (const row of rows) {
        const key = `${row.date}:${row.metric}`;
        totalsByDateMetric.set(key, (totalsByDateMetric.get(key) || 0) + row.value);
    }

    const getMetric = (date, metric) => totalsByDateMetric.get(`${date}:${metric}`) || 0;
    const resolveChannelName = (channelId) => guild?.channels?.cache?.get(channelId)?.name || `Canal ${String(channelId).slice(-6)}`;
    const prettifyBucket = (bucket) => String(bucket)
        .replace(/^job:/, 'job · ')
        .replace(/^system:/, 'system · ')
        .replace(/^lavalink:/, 'lavalink · ')
        .replace(/^commands:/, 'commands · ')
        .replace(/^reminders:/, 'reminders · ');

    const daily = dates.map(date => ({
        date,
        messages: getMetric(date, 'messages_total'),
        commands: getMetric(date, 'commands_total'),
        commandErrors: getMetric(date, 'command_errors'),
        voiceMinutes: getMetric(date, 'voice_minutes'),
        automodActions: getMetric(date, 'automod_actions'),
        aiReplies: getMetric(date, 'ai_replies'),
        remindersCreated: getMetric(date, 'reminders_created'),
        remindersSent: getMetric(date, 'reminders_sent'),
        remindersFailed: getMetric(date, 'reminders_failed'),
        monitorAlerts: getMetric(date, 'monitor_alerts'),
        levelUps: getMetric(date, 'level_ups'),
    }));

    const summary = daily.reduce((acc, row) => ({
        messages: acc.messages + row.messages,
        commands: acc.commands + row.commands,
        commandErrors: acc.commandErrors + row.commandErrors,
        voiceMinutes: acc.voiceMinutes + row.voiceMinutes,
        automodActions: acc.automodActions + row.automodActions,
        aiReplies: acc.aiReplies + row.aiReplies,
        remindersCreated: acc.remindersCreated + row.remindersCreated,
        remindersSent: acc.remindersSent + row.remindersSent,
        remindersFailed: acc.remindersFailed + row.remindersFailed,
        monitorAlerts: acc.monitorAlerts + row.monitorAlerts,
        levelUps: acc.levelUps + row.levelUps,
    }), {
        messages: 0,
        commands: 0,
        commandErrors: 0,
        voiceMinutes: 0,
        automodActions: 0,
        aiReplies: 0,
        remindersCreated: 0,
        remindersSent: 0,
        remindersFailed: 0,
        monitorAlerts: 0,
        levelUps: 0,
    });

    return {
        windowDays: days,
        summary,
        daily,
        topCommands: stmts.getCommandMetrics(days, 8).map(row => ({
            ...row,
            avgDurationMs: row.total > 0 ? Math.round(row.total_duration_ms / row.total) : 0,
        })),
        topChannels: stmts.getTopAnalyticsBuckets('messages_channel', days, 8).map(row => ({
            id: row.bucket,
            name: resolveChannelName(row.bucket),
            total: row.total,
        })),
        topVoiceChannels: stmts.getTopAnalyticsBuckets('voice_channels', days, 5).map(row => ({
            id: row.bucket,
            name: resolveChannelName(row.bucket),
            total: row.total,
        })),
        topErrorSources: stmts.getTopAnalyticsBuckets('error_events', days, 8).map(row => ({
            source: row.bucket,
            label: prettifyBucket(row.bucket),
            total: row.total,
        })),
        monitorAlerts: stmts.getTopAnalyticsBuckets('monitor_alerts', days, 8).map(row => ({
            source: row.bucket,
            label: prettifyBucket(row.bucket),
            total: row.total,
        })),
    };
}

function getHealthSnapshot(client) {
    const healthChecks = stmts.getHealthChecks();
    const configState = config.validateConfig();
    const databaseStats = getDatabaseStats();
    const musicStats = getMusicStats(client);

    let sqliteStatus = 'ok';
    let sqliteDetail = `DB ${databaseStats.sizeFormatted}`;
    try {
        _db.prepare('SELECT 1').get();
    } catch (error) {
        sqliteStatus = 'error';
        sqliteDetail = error.message;
    }

    const readyNodeCount = musicStats.nodes.filter(node => /ready|connected/i.test(String(node.state))).length;
    const lavalinkStatus = musicStats.nodes.length === 0 ? 'warn' : readyNodeCount > 0 ? 'ok' : 'warn';
    const lavalinkDetail = musicStats.nodes.length
        ? musicStats.nodes.map(node => `${node.name} (${node.state})`).join(', ')
        : 'Sin nodos registrados';

    const core = [
        {
            name: 'Discord Gateway',
            status: client.isReady() ? 'ok' : 'error',
            detail: client.isReady() ? `Ping ${Math.round(client.ws.ping || 0)} ms` : 'Cliente todavía no listo',
        },
        {
            name: 'SQLite',
            status: sqliteStatus,
            detail: sqliteDetail,
        },
        {
            name: 'Dashboard interno',
            status: 'ok',
            detail: `${config.DASHBOARD.HOST}:${config.DASHBOARD.PORT}`,
        },
        {
            name: 'Lavalink / Shoukaku',
            status: lavalinkStatus,
            detail: lavalinkDetail,
        },
        {
            name: 'Configuración',
            status: configState.errors.length > 0 ? 'error' : configState.warnings.length > 0 ? 'warn' : 'ok',
            detail: configState.errors[0] || configState.warnings[0] || 'Sin advertencias relevantes',
        },
    ];

    const services = healthChecks
        .filter(check => !check.name.startsWith('job:'))
        .map(check => ({
            name: check.name,
            status: check.status,
            detail: safePreview(check.details?.message || check.details || '-'),
            lastRunAt: check.last_run_at,
            lastOkAt: check.last_ok_at,
            lastErrorAt: check.last_error_at,
            lastDurationMs: check.last_duration_ms,
            consecutiveFailures: check.consecutive_failures,
        }));

    const jobs = healthChecks
        .filter(check => check.name.startsWith('job:'))
        .map(check => ({
            name: check.name.replace(/^job:/, ''),
            status: check.status,
            detail: safePreview(check.details?.message || check.details || '-'),
            intervalMs: check.details?.intervalMs || null,
            lastRunAt: check.last_run_at,
            lastOkAt: check.last_ok_at,
            lastErrorAt: check.last_error_at,
            lastDurationMs: check.last_duration_ms,
            consecutiveFailures: check.consecutive_failures,
        }));

    const summary = [...core, ...services, ...jobs].reduce((acc, item) => {
        const status = item.status || 'unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, { ok: 0, warn: 0, error: 0, idle: 0, unknown: 0 });

    return {
        summary,
        configWarnings: configState.warnings,
        core,
        services,
        jobs,
    };
}

function getTicketsSnapshot() {
    const tickets = _db.prepare('SELECT * FROM tickets ORDER BY created_at DESC LIMIT 50').all();
    return tickets.map(ticket => ({
        channelId: ticket.channel_id,
        userId: ticket.user_id,
        createdAt: ticket.created_at,
    }));
}

function getGiveawaysSnapshot() {
    const active = _db.prepare('SELECT * FROM giveaways WHERE ended = 0 ORDER BY end_time ASC').all();
    const ended = _db.prepare('SELECT * FROM giveaways WHERE ended = 1 ORDER BY end_time DESC LIMIT 20').all();

    const formatGiveaway = (gw) => {
        const entriesCount = _db.prepare('SELECT COUNT(*) as count FROM giveaway_entries WHERE message_id = ?').get(gw.message_id)?.count || 0;
        return {
            messageId: gw.message_id,
            channelId: gw.channel_id,
            prize: gw.prize,
            endTime: gw.end_time,
            ended: Boolean(gw.ended),
            hostId: gw.host_id,
            entriesCount,
            isExpired: gw.end_time < Date.now() && !gw.ended,
        };
    };

    return {
        active: active.map(formatGiveaway),
        ended: ended.map(formatGiveaway),
    };
}

function getRemindersSnapshot() {
    const pending = _db.prepare('SELECT * FROM reminders WHERE remind_at >= ? ORDER BY remind_at ASC LIMIT 50').all(Date.now());
    return pending.map(r => ({
        id: r.id,
        userId: r.user_id,
        guildId: r.guild_id,
        message: r.message,
        remindAt: r.remind_at,
        createdAt: r.created_at,
    }));
}

function getReportesSnapshot() {
    const recentWarns = _db.prepare('SELECT * FROM warns ORDER BY created_at DESC LIMIT 30').all();
    return recentWarns.map(w => ({
        id: w.id,
        userId: w.user_id,
        modId: w.mod_id,
        reason: w.reason,
        createdAt: w.created_at,
    }));
}

function getRetentionSnapshot(guild, days = 30) {
    const sinceDate = buildDateRange(days)[0];
    const joins = stmts.getTopAnalyticsBuckets('member_joins', days, 100);
    const leaves = stmts.getTopAnalyticsBuckets('member_leaves', days, 100);

    const totalJoins = joins.reduce((sum, j) => sum + j.total, 0);
    const totalLeaves = leaves.reduce((sum, l) => sum + l.total, 0);
    const netGrowth = totalJoins - totalLeaves;
    const retentionRate = totalJoins > 0 ? Math.round(((totalJoins - totalLeaves) / totalJoins) * 100) : 100;

    const daily = [];
    const dateRange = buildDateRange(days);
    const joinsByDate = new Map(joins.map(j => [j.bucket, j.total]));
    const leavesByDate = new Map(leaves.map(l => [l.bucket, l.total]));

    for (const date of dateRange) {
        const dayJoins = joinsByDate.get(date) || 0;
        const dayLeaves = leavesByDate.get(date) || 0;
        daily.push({
            date,
            joins: dayJoins,
            leaves: dayLeaves,
            net: dayJoins - dayLeaves,
        });
    }

    return {
        totalJoins,
        totalLeaves,
        netGrowth,
        retentionRate,
        currentMembers: guild?.memberCount || 0,
        daily,
    };
}

function generateDailySummary(client) {
    const guild = getGuild(client);
    const analytics = getAnalyticsSnapshot(client, 1);
    const health = getHealthSnapshot(client);
    const retention = getRetentionSnapshot(guild, 7);
    const db = getDatabaseStats();

    const lines = [
        `📊 **Resumen técnico diario - ${new Date().toLocaleDateString('es-AR')}**`,
        '',
        '**👥 Miembros**',
        `• Total: ${retention.currentMembers}`,
        `• Nuevos (7d): ${retention.totalJoins} | Salidas: ${retention.totalLeaves}`,
        `• Crecimiento neto: ${retention.netGrowth > 0 ? '+' : ''}${retention.netGrowth}`,
        '',
        '**📈 Actividad (24h)**',
        `• Mensajes: ${analytics.summary.messages}`,
        `• Comandos: ${analytics.summary.commands} (${analytics.summary.commandErrors} errores)`,
        `• Minutos de voz: ${analytics.summary.voiceMinutes}`,
        `• Respuestas IA: ${analytics.summary.aiReplies}`,
        `• Level ups: ${analytics.summary.levelUps}`,
        '',
        '**🔍 Moderación**',
        `• AutoMod: ${analytics.summary.automodActions} acciones`,
        `• Warns activos: ${db.counts.warns}`,
        `• Tempbans: ${db.counts.tempbans}`,
        '',
        '**🏥 Salud del sistema**',
        `• OK: ${health.summary.ok} | Warn: ${health.summary.warn} | Error: ${health.summary.error}`,
        `• Uptime: ${getSystemStats().uptimeFormatted}`,
        `• RAM: ${getSystemStats().memory.rssFormatted}`,
    ];

    const warnings = health.configWarnings.filter(w => !w.includes('opcional'));
    if (warnings.length > 0) {
        lines.push('', '⚠️ **Advertencias:**');
        warnings.slice(0, 3).forEach(w => lines.push(`• ${w}`));
    }

    return lines.join('\n');
}

async function sendDailySummary(client) {
    const guild = getGuild(client);
    const channel = getChannel(guild, 'LOGS');

    if (!channel) {
        return { success: false, error: 'No hay canal de staff configurado' };
    }

    const summary = generateDailySummary(client);

    try {
        await channel.send(summary);
        stmts.addLog('daily_summary', { sent: true, channel: channel.id });
        return { success: true, channelId: channel.id };
    } catch (error) {
        stmts.addLog('daily_summary', { sent: false, error: error.message });
        return { success: false, error: error.message };
    }
}

function getDashboardSnapshot(client) {
    const guild = getGuild(client);

    return {
        generatedAt: new Date().toISOString(),
        version: pkg.version,
        system: getSystemStats(),
        discord: getDiscordStats(client),
        database: getDatabaseStats(),
        health: getHealthSnapshot(client),
        analytics: getAnalyticsSnapshot(client),
        music: getMusicStats(client),
        leaderboards: getLeaderboards(guild),
        monitors: getMonitorStats(),
        logs: getRecentLogs(),
        staticConfig: getStaticConfig(),
        editableConfig: getEditableConfigSnapshot(client),
        runtimeConfig: getRuntimeConfig(),
        dynamicConfig: getDynamicConfig(),
        tickets: getTicketsSnapshot(),
        giveaways: getGiveawaysSnapshot(),
        reminders: getRemindersSnapshot(),
        reportes: getReportesSnapshot(),
        retention: getRetentionSnapshot(guild),
    };
}

module.exports = {
    getDashboardSnapshot,
    updateEditableConfig,
    getTicketsSnapshot,
    getGiveawaysSnapshot,
    getRemindersSnapshot,
    getReportesSnapshot,
    getRetentionSnapshot,
    generateDailySummary,
    sendDailySummary,
    getGuild,
    getChannel,
};

const config = require('../config');
const { stmts } = require('../database');

const CHANNEL_OVERRIDE_KEYS = [
    'LOGS',
    'COMANDOS_BOT',
    'REPORTES',
    'STAFF',
    'BIENVENIDOS',
    'ANUNCIOS',
    'CHAT',
    'REGLAS',
    'ROLES',
];

const CHANNEL_ALIAS_GROUPS = [
    ['BIENVENIDOS', 'BIENVENIDA'],
    ['CHAT', 'GENERAL'],
    ['REPORTES', 'LOGS_MOD'],
];

const channelBaseValues = new Map();

function normalizeDiscordId(value) {
    const normalized = String(value || '').trim();
    return /^\d{17,20}$/.test(normalized) ? normalized : null;
}

function rememberBaseChannelId(key, value = config.CHANNELS[key]) {
    const normalized = normalizeDiscordId(value);
    if (normalized) channelBaseValues.set(key, normalized);
    return normalized;
}

function captureChannelBaseValues(keys = CHANNEL_OVERRIDE_KEYS) {
    for (const key of keys) {
        rememberBaseChannelId(key);
    }
}

function getBaseChannelId(key) {
    return channelBaseValues.get(key) || rememberBaseChannelId(key) || null;
}

function syncChannelAliases(key, value) {
    for (const group of CHANNEL_ALIAS_GROUPS) {
        if (!group.includes(key)) continue;
        for (const alias of group) {
            config.CHANNELS[alias] = value;
        }
    }
}

function setRuntimeChannelId(key, value) {
    const normalized = normalizeDiscordId(value);
    config.CHANNELS[key] = normalized;
    syncChannelAliases(key, normalized);
    return normalized;
}

function getPersistedChannelId(key) {
    return normalizeDiscordId(stmts.getConfig(key)?.value);
}

function getChannelId(key) {
    return getPersistedChannelId(key) || getBaseChannelId(key) || null;
}

function applyChannelOverridesToConfig(keys = CHANNEL_OVERRIDE_KEYS) {
    for (const key of keys) {
        setRuntimeChannelId(key, getPersistedChannelId(key) || getBaseChannelId(key) || null);
    }
}

function getChannel(guild, key) {
    const channelId = getChannelId(key);
    if (channelId) {
        return guild?.channels?.cache?.get(channelId) || null;
    }

    const fallbackValue = String(config.CHANNELS[key] || '').trim();
    if (!fallbackValue) return null;

    return guild?.channels?.cache?.get(fallbackValue)
        || guild?.channels?.cache?.find(channel => channel.name === fallbackValue)
        || null;
}

function getFirstChannelId(...keys) {
    for (const key of keys) {
        const channelId = getChannelId(key);
        if (channelId) return channelId;
    }
    return null;
}

function getFirstChannel(guild, ...keys) {
    for (const key of keys) {
        const channel = getChannel(guild, key);
        if (channel) return channel;
    }
    return null;
}

module.exports = {
    CHANNEL_OVERRIDE_KEYS,
    normalizeDiscordId,
    captureChannelBaseValues,
    getBaseChannelId,
    getChannelId,
    getChannel,
    getFirstChannelId,
    getFirstChannel,
    applyChannelOverridesToConfig,
    setRuntimeChannelId,
};

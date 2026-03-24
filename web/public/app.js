const state = {
    refreshTimer: null,
    refreshMs: 30000,
    token: null,
    latestSnapshot: null,
    configDirty: false,
    configSaving: false,
    configDraft: {},
    configStatus: {
        text: 'Sin cambios pendientes.',
        variant: 'muted',
    },
    quickActionLoading: false,
};

function $(selector) {
    return document.querySelector(selector);
}

function setStatus(text, variant = 'warn') {
    const badge = $('#status-badge');
    if (!badge) return;
    badge.textContent = text;
    badge.className = `badge badge-${variant}`;
}

function setConfigSaveStatus(text, variant = 'muted') {
    state.configStatus = { text, variant };
    const host = $('#config-save-status');
    if (!host) return;
    host.textContent = text;
    host.className = variant === 'muted' ? 'form-status muted' : `form-status status-${variant}`;
}

function getStoredToken() {
    const url = new URL(window.location.href);
    const queryToken = url.searchParams.get('token');

    if (queryToken) {
        localStorage.setItem('prophet_dashboard_token', queryToken);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        return queryToken;
    }

    return localStorage.getItem('prophet_dashboard_token');
}

async function apiFetch(pathname, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (state.token) headers['x-dashboard-token'] = state.token;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';

    const response = await fetch(pathname, {
        method: options.method || 'GET',
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    const parseResponse = async () => {
        if (contentType.includes('application/json')) return response.json();
        return response.text();
    };

    if (!response.ok) {
        const payload = await parseResponse();
        const message = typeof payload === 'string' ? payload : payload?.error || payload?.message || `HTTP ${response.status}`;
        throw new Error(message);
    }

    return parseResponse();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('es-AR');
}

function formatStatus(status) {
    const normalized = String(status || 'unknown').toLowerCase();
    if (normalized === 'ok') return 'OK';
    if (normalized === 'warn') return 'WARN';
    if (normalized === 'error') return 'ERROR';
    if (normalized === 'idle') return 'IDLE';
    return normalized.toUpperCase();
}

function formatTimestamp(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('es-AR');
}

function formatDurationMs(value) {
    if (!Number.isFinite(value) || value <= 0) return '-';
    if (value < 1000) return `${value} ms`;
    return `${(value / 1000).toFixed(2)} s`;
}

function renderKeyValueGrid(targetSelector, entries) {
    const host = $(targetSelector);
    if (!host) return;
    host.innerHTML = entries.map(({ label, value }) => `
        <div class="kv-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
        </div>
    `).join('');
}

function renderTable(targetSelector, columns, rows, emptyMessage = 'Sin datos') {
    const host = $(targetSelector);
    if (!host) return;

    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) {
        host.innerHTML = `<div class="empty-state">${escapeHtml(emptyMessage)}</div>`;
        return;
    }

    const header = columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('');
    const body = safeRows.map(row => `
        <tr>
            ${columns.map(col => `<td>${escapeHtml(col.render(row))}</td>`).join('')}
        </tr>
    `).join('');

    host.innerHTML = `
        <div class="table-wrap">
            <table>
                <thead><tr>${header}</tr></thead>
                <tbody>${body}</tbody>
            </table>
        </div>
    `;
}

function renderMonitorLists(monitors) {
    const host = $('#monitors-lists');
    if (!host) return;

    const sections = [
        {
            title: 'Twitch',
            items: monitors.twitch.map(item => `${item.streamer} → canal ${item.channel_id}`),
        },
        {
            title: 'YouTube',
            items: monitors.youtube.map(item => `${item.yt_channel_name || item.yt_channel_id} → canal ${item.discord_channel}`),
        },
        {
            title: 'GitHub',
            items: monitors.github.map(item => `${item.repo} → canal ${item.discord_channel}`),
        },
        {
            title: 'Game servers',
            items: monitors.gameServers.map(item => `${item.label || `${item.ip}:${item.port}`} · ${item.last_status === 1 ? 'online' : 'offline'}`),
        },
    ].filter(section => section.items.length > 0);

    if (!sections.length) {
        host.innerHTML = '<div class="empty-state">No hay integraciones configuradas.</div>';
        return;
    }

    host.innerHTML = sections.map(section => `
        <div class="mini-list">
            <h3>${escapeHtml(section.title)}</h3>
            <ul>
                ${section.items.slice(0, 8).map(item => `<li>${escapeHtml(item)}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

function collectConfigDraftFromDom() {
    const form = $('#editable-config-form');
    if (!form) return {};

    return Array.from(form.querySelectorAll('[data-config-input]')).reduce((acc, input) => {
        acc[input.name] = input.value;
        return acc;
    }, {});
}

function getEditableField(key) {
    return state.latestSnapshot?.editableConfig?.find(field => field.key === key) || null;
}

function getOriginalConfigValue(key) {
    return String(getEditableField(key)?.value || '').trim();
}

function getSourceLabel(source) {
    if (source === 'sqlite') return 'SQLite';
    if (source === 'config') return 'config.js';
    return 'Sin valor';
}

function getResolvedLabel(field) {
    if (!field?.value) return 'Sin configurar';
    if (field.resolved?.exists) {
        return `${field.resolved.mention} · ${field.value}`;
    }
    return `Sin resolver · ${field.value}`;
}

function updateConfigDirtyState() {
    const form = $('#editable-config-form');
    if (!form) return;

    let dirtyCount = 0;
    Array.from(form.querySelectorAll('[data-config-input]')).forEach(input => {
        const currentValue = String(input.value || '').trim();
        const originalValue = getOriginalConfigValue(input.name);
        const isDirty = currentValue !== originalValue;
        const card = input.closest('[data-config-field]');

        if (card) card.classList.toggle('dirty', isDirty);
        if (isDirty) dirtyCount += 1;
    });

    state.configDirty = dirtyCount > 0;

    const saveButton = $('#config-save-button');
    const resetButton = $('#config-reset-button');
    if (saveButton) saveButton.disabled = !state.configDirty || state.configSaving;
    if (resetButton) resetButton.disabled = !state.configDirty || state.configSaving;

    if (state.configDirty) {
        setConfigSaveStatus(`Hay ${dirtyCount} cambio(s) sin guardar.`, 'warn');
    } else if (state.configStatus.variant !== 'success') {
        setConfigSaveStatus('Sin cambios pendientes.', 'muted');
    }
}

function renderEditableConfig(fields) {
    const host = $('#editable-config-form');
    if (!host) return;

    if (state.configDirty) {
        state.configDraft = collectConfigDraftFromDom();
    }

    if (!Array.isArray(fields) || !fields.length) {
        host.innerHTML = '<div class="empty-state">No hay claves editables configuradas todavía.</div>';
        state.configDirty = false;
        return;
    }

    host.innerHTML = `
        <div class="settings-grid">
            ${fields.map(field => {
                const value = Object.prototype.hasOwnProperty.call(state.configDraft, field.key)
                    ? state.configDraft[field.key]
                    : String(field.value || '');

                return `
                    <div class="setting-card" data-config-field="${escapeAttr(field.key)}">
                        <label class="setting-label" for="cfg-${escapeAttr(field.key)}">${escapeHtml(field.label)}</label>
                        <p class="setting-description">${escapeHtml(field.description)}</p>
                        <input
                            id="cfg-${escapeAttr(field.key)}"
                            class="setting-input"
                            type="text"
                            name="${escapeAttr(field.key)}"
                            value="${escapeAttr(value)}"
                            inputmode="numeric"
                            autocomplete="off"
                            placeholder="ID de Discord o vacío"
                            data-config-input
                        >
                        <div class="setting-meta">
                            <span>${escapeHtml(field.expectedTypeLabel)}</span>
                            <span>Origen: ${escapeHtml(getSourceLabel(field.source))}</span>
                            <span>${escapeHtml(getResolvedLabel(field))}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="settings-actions">
            <button id="config-save-button" class="button" type="submit">Guardar cambios</button>
            <button id="config-reset-button" class="button button-secondary" type="button">Descartar</button>
        </div>
    `;

    host.oninput = handleConfigInput;
    host.onsubmit = handleConfigSubmit;
    const resetButton = $('#config-reset-button');
    if (resetButton) resetButton.onclick = handleConfigReset;

    updateConfigDirtyState();
}

function collectDirtyConfigUpdates() {
    const form = $('#editable-config-form');
    if (!form) return [];

    return Array.from(form.querySelectorAll('[data-config-input]')).reduce((updates, input) => {
        const currentValue = String(input.value || '').trim();
        const originalValue = getOriginalConfigValue(input.name);
        if (currentValue !== originalValue) {
            updates.push({
                key: input.name,
                value: currentValue,
            });
        }
        return updates;
    }, []);
}

function handleConfigInput(event) {
    const input = event.target.closest('[data-config-input]');
    if (!input) return;
    state.configDraft[input.name] = input.value;
    updateConfigDirtyState();
}

function handleConfigReset() {
    state.configDraft = {};
    state.configDirty = false;
    setConfigSaveStatus('Sin cambios pendientes.', 'muted');
    renderEditableConfig(state.latestSnapshot?.editableConfig || []);
}

async function handleConfigSubmit(event) {
    event.preventDefault();
    if (state.configSaving) return;

    const updates = collectDirtyConfigUpdates();
    if (!updates.length) {
        setConfigSaveStatus('No hay cambios para guardar.', 'muted');
        return;
    }

    try {
        state.configSaving = true;
        updateConfigDirtyState();
        setConfigSaveStatus('Guardando cambios...', 'warn');
        await apiFetch('/api/config', {
            method: 'POST',
            body: { updates },
        });
        state.configDraft = {};
        await loadDashboard();
        setConfigSaveStatus(`${updates.length} cambio(s) guardados correctamente.`, 'success');
    } catch (error) {
        console.error(error);
        setConfigSaveStatus(error.message, 'error');
    } finally {
        state.configSaving = false;
        updateConfigDirtyState();
    }
}

function render(snapshot) {
    state.latestSnapshot = snapshot;

    const guild = snapshot.discord.guild;
    const dbCounts = snapshot.database.counts;
    const health = snapshot.health;
    const analytics = snapshot.analytics;

    $('#generated-at').textContent = `Actualizado: ${new Date(snapshot.generatedAt).toLocaleString('es-AR')}`;
    $('#metric-guild').textContent = guild ? guild.name : 'Sin guild';
    $('#metric-members').textContent = guild ? `${formatNumber(guild.memberCount)} miembros` : 'No conectado';
    $('#metric-ready').textContent = snapshot.discord.ready ? 'Online' : 'Iniciando';
    $('#metric-ping').textContent = `Ping ${formatNumber(snapshot.discord.ping)} ms`;
    $('#metric-uptime').textContent = snapshot.system.uptimeFormatted;
    $('#metric-version').textContent = `v${snapshot.version}`;
    $('#metric-memory').textContent = snapshot.system.memory.rssFormatted;
    $('#metric-node').textContent = snapshot.system.node;
    $('#metric-db-size').textContent = snapshot.database.sizeFormatted;
    $('#metric-backups').textContent = `${formatNumber(snapshot.database.backups.count)} backups`;
    $('#metric-ai').textContent = `${formatNumber(snapshot.discord.aiContexts.canalesActivos)} contextos`;
    $('#metric-voice').textContent = `${formatNumber(snapshot.discord.voiceSessions)} sesiones activas`;

    setStatus(snapshot.discord.ready ? 'Bot listo' : 'Bot iniciando', snapshot.discord.ready ? 'ok' : 'warn');

    renderKeyValueGrid('#summary-grid', [
        { label: 'Comandos cargados', value: formatNumber(snapshot.discord.commands) },
        { label: 'Guilds conectadas', value: formatNumber(snapshot.discord.guilds) },
        { label: 'Cooldown buckets', value: formatNumber(snapshot.discord.cooldownBuckets) },
        { label: 'Node.js', value: snapshot.system.node },
        { label: 'OS', value: snapshot.system.platform },
        { label: 'Load avg', value: snapshot.system.loadAverage.map(n => n.toFixed(2)).join(' / ') },
        { label: 'Discord ping', value: `${formatNumber(snapshot.discord.ping)} ms` },
        { label: 'Shoukaku', value: snapshot.music.shoukakuReady ? 'Activo' : 'No disponible' },
        { label: 'discord-player', value: snapshot.music.discordPlayerReady ? 'Activo' : 'No disponible' },
    ]);

    renderKeyValueGrid('#database-grid', [
        { label: 'Usuarios', value: formatNumber(dbCounts.users) },
        { label: 'Usuarios activos', value: formatNumber(dbCounts.activeUsers) },
        { label: 'Warns', value: formatNumber(dbCounts.warns) },
        { label: 'Tickets', value: formatNumber(dbCounts.tickets) },
        { label: 'Tempbans', value: formatNumber(dbCounts.tempbans) },
        { label: 'Temp channels', value: formatNumber(dbCounts.tempChannels) },
        { label: 'Recordatorios', value: `${formatNumber(dbCounts.pendingReminders)} pendientes / ${formatNumber(dbCounts.reminders)} total` },
        { label: 'Sorteos activos', value: formatNumber(dbCounts.giveaways) },
        { label: 'Logs persistidos', value: formatNumber(dbCounts.logs) },
        { label: 'Webhooks', value: formatNumber(dbCounts.webhooks) },
    ]);

    renderKeyValueGrid('#health-summary-grid', [
        { label: 'OK', value: formatNumber(health.summary.ok) },
        { label: 'Warn', value: formatNumber(health.summary.warn) },
        { label: 'Error', value: formatNumber(health.summary.error) },
        { label: 'Idle', value: formatNumber(health.summary.idle) },
        { label: 'Warnings config', value: formatNumber(health.configWarnings.length) },
    ]);

    renderTable('#health-core-table', [
        { label: 'Servicio', render: row => row.name },
        { label: 'Estado', render: row => formatStatus(row.status) },
        { label: 'Detalle', render: row => row.detail || '-' },
    ], [...health.core, ...health.services], 'Sin servicios instrumentados todavía.');

    renderTable('#health-jobs-table', [
        { label: 'Job', render: row => row.name },
        { label: 'Estado', render: row => formatStatus(row.status) },
        { label: 'Última ejecución', render: row => formatTimestamp(row.lastRunAt) },
        { label: 'Duración', render: row => formatDurationMs(row.lastDurationMs) },
        { label: 'Fallos seguidos', render: row => formatNumber(row.consecutiveFailures) },
        { label: 'Detalle', render: row => row.detail || '-' },
    ], health.jobs, 'Los jobs todavía no registraron actividad.');

    renderKeyValueGrid('#analytics-summary-grid', [
        { label: 'Mensajes', value: formatNumber(analytics.summary.messages) },
        { label: 'Comandos', value: formatNumber(analytics.summary.commands) },
        { label: 'Errores de comando', value: formatNumber(analytics.summary.commandErrors) },
        { label: 'Minutos de voz', value: formatNumber(analytics.summary.voiceMinutes) },
        { label: 'AutoMod', value: formatNumber(analytics.summary.automodActions) },
        { label: 'Respuestas IA', value: formatNumber(analytics.summary.aiReplies) },
        { label: 'Recordatorios enviados', value: formatNumber(analytics.summary.remindersSent) },
        { label: 'Alertas de monitores', value: formatNumber(analytics.summary.monitorAlerts) },
        { label: 'Level ups', value: formatNumber(analytics.summary.levelUps) },
    ]);

    renderTable('#analytics-daily-table', [
        { label: 'Fecha', render: row => row.date },
        { label: 'Mensajes', render: row => formatNumber(row.messages) },
        { label: 'Comandos', render: row => formatNumber(row.commands) },
        { label: 'Errores', render: row => formatNumber(row.commandErrors) },
        { label: 'Min voz', render: row => formatNumber(row.voiceMinutes) },
        { label: 'IA', render: row => formatNumber(row.aiReplies) },
        { label: 'Alertas', render: row => formatNumber(row.monitorAlerts) },
    ], analytics.daily, 'Todavía no hay datos diarios suficientes.');

    renderTable('#analytics-commands-table', [
        { label: 'Comando', render: row => `/${row.command}` },
        { label: 'Usos', render: row => formatNumber(row.total) },
        { label: 'OK', render: row => formatNumber(row.success) },
        { label: 'Errores', render: row => formatNumber(row.errors) },
        { label: 'Promedio', render: row => formatDurationMs(row.avgDurationMs) },
    ], analytics.topCommands, 'Todavía no hay comandos suficientes para mostrar.');

    renderTable('#analytics-channels-table', [
        { label: 'Canal', render: row => row.name },
        { label: 'Mensajes', render: row => formatNumber(row.total) },
    ], analytics.topChannels, 'Sin actividad de canales todavía.');

    renderTable('#analytics-voice-channels-table', [
        { label: 'Canal', render: row => row.name },
        { label: 'Entradas', render: row => formatNumber(row.total) },
    ], analytics.topVoiceChannels, 'Sin actividad de voz todavía.');

    renderTable('#analytics-errors-table', [
        { label: 'Fuente', render: row => row.label },
        { label: 'Eventos', render: row => formatNumber(row.total) },
    ], analytics.topErrorSources, 'No se registraron errores instrumentados.');

    renderTable('#analytics-alerts-table', [
        { label: 'Monitor', render: row => row.label },
        { label: 'Alertas', render: row => formatNumber(row.total) },
    ], analytics.monitorAlerts, 'No se dispararon alertas todavía.');

    renderTable('#xp-table', [
        { label: 'Usuario', render: row => row.username },
        { label: 'Nivel', render: row => formatNumber(row.level) },
        { label: 'XP', render: row => formatNumber(row.xp) },
        { label: 'Msgs', render: row => formatNumber(row.messages) },
    ], snapshot.leaderboards.xp, 'Sin datos de XP');

    renderTable('#eco-table', [
        { label: 'Usuario', render: row => row.username },
        { label: 'Efectivo', render: row => formatNumber(row.balance) },
        { label: 'Banco', render: row => formatNumber(row.bank) },
        { label: 'Total', render: row => formatNumber(row.total) },
    ], snapshot.leaderboards.economy, 'Sin datos de economía');

    renderTable('#voice-table', [
        { label: 'Usuario', render: row => row.username },
        { label: 'Min voz', render: row => formatNumber(row.voiceMinutes) },
        { label: 'Nivel', render: row => formatNumber(row.level) },
        { label: 'XP', render: row => formatNumber(row.xp) },
    ], snapshot.leaderboards.voice, 'Sin datos de voz');

    renderKeyValueGrid('#monitors-grid', [
        { label: 'Twitch', value: formatNumber(snapshot.monitors.twitch.length) },
        { label: 'YouTube', value: formatNumber(snapshot.monitors.youtube.length) },
        { label: 'GitHub', value: formatNumber(snapshot.monitors.github.length) },
        { label: 'Game servers', value: formatNumber(snapshot.monitors.gameServers.length) },
        { label: 'Nodos Lavalink', value: snapshot.music.nodes.map(node => `${node.name} (${node.state})`).join(', ') || 'Sin nodos' },
    ]);
    renderMonitorLists(snapshot.monitors);

    // Retención
    const retention = snapshot.retention || {};
    renderKeyValueGrid('#retention-grid', [
        { label: 'Miembros actuales', value: formatNumber(retention.currentMembers || 0) },
        { label: 'Nuevos (30d)', value: formatNumber(retention.totalJoins || 0) },
        { label: 'Salidas (30d)', value: formatNumber(retention.totalLeaves || 0) },
        { label: 'Crecimiento neto', value: (retention.netGrowth || 0) > 0 ? `+${formatNumber(retention.netGrowth)}` : formatNumber(retention.netGrowth) },
        { label: 'Tasa retención', value: `${retention.retentionRate || 100}%` },
    ]);

    renderTable('#retention-daily-table', [
        { label: 'Fecha', render: row => row.date },
        { label: 'Entradas', render: row => formatNumber(row.joins) },
        { label: 'Salidas', render: row => formatNumber(row.leaves) },
        { label: 'Neto', render: row => row.net > 0 ? `+${formatNumber(row.net)}` : formatNumber(row.net) },
    ], retention.daily || [], 'Sin datos de retención.');

    // Tickets
    renderTable('#tickets-table', [
        { label: 'Canal', render: row => `<#${row.channelId}>` },
        { label: 'Usuario', render: row => `<@${row.userId}>` },
        { label: 'Creado', render: row => formatTimestamp(row.createdAt) },
        { label: 'Acción', render: row => `<button class="button button-secondary button-small" onclick="handleTicketClose('${row.channelId}')">Cerrar</button>` },
    ], snapshot.tickets || [], 'No hay tickets abiertos.');

    // Sorteos
    renderTable('#giveaways-active-table', [
        { label: 'Premio', render: row => row.prize },
        { label: 'Participantes', render: row => formatNumber(row.entriesCount) },
        { label: 'Termina', render: row => row.isExpired ? 'EXPIRADO' : new Date(row.endTime).toLocaleString('es-AR') },
        { label: 'Host', render: row => `<@${row.hostId}>` },
        { label: 'Acción', render: row => `<button class="button button-small" onclick="handleGiveawayEnd('${row.messageId}')" ${row.entriesCount === 0 ? 'disabled' : ''}>Sortear</button>` },
    ], snapshot.giveaways?.active || [], 'No hay sorteos activos.');

    renderTable('#giveaways-ended-table', [
        { label: 'Premio', render: row => row.prize },
        { label: 'Participantes', render: row => formatNumber(row.entriesCount) },
        { label: 'Terminó', render: row => new Date(row.endTime).toLocaleString('es-AR') },
        { label: 'Host', render: row => `<@${row.hostId}>` },
    ], snapshot.giveaways?.ended || [], 'No hay sorteos finalizados.');

    // Recordatorios
    renderTable('#reminders-table', [
        { label: 'ID', render: row => row.id },
        { label: 'Usuario', render: row => `<@${row.userId}>` },
        { label: 'Mensaje', render: row => row.message?.slice(0, 50) + (row.message?.length > 50 ? '…' : '') },
        { label: 'Recordar', render: row => new Date(row.remindAt).toLocaleString('es-AR') },
        { label: 'Acción', render: row => `<button class="button button-secondary button-small" onclick="handleReminderDelete(${row.id})">Eliminar</button>` },
    ], snapshot.reminders || [], 'No hay recordatorios pendientes.');

    // Reportes/Warns
    renderTable('#reportes-table', [
        { label: 'ID', render: row => row.id },
        { label: 'Usuario', render: row => `<@${row.userId}>` },
        { label: 'Moderador', render: row => `<@${row.modId}>` },
        { label: 'Razón', render: row => row.reason?.slice(0, 40) + (row.reason?.length > 40 ? '…' : '') },
        { label: 'Fecha', render: row => formatTimestamp(row.createdAt) },
        { label: 'Acción', render: row => `<button class="button button-secondary button-small" onclick="handleWarnsClear('${row.userId}')">Limpiar</button>` },
    ], snapshot.reportes || [], 'No hay warns registrados.');

    // Hacer funciones accesibles globalmente para onclick
    window.handleTicketClose = handleTicketClose;
    window.handleGiveawayEnd = handleGiveawayEnd;
    window.handleReminderDelete = handleReminderDelete;
    window.handleWarnsClear = handleWarnsClear;

    renderEditableConfig(snapshot.editableConfig || []);
    $('#static-config').textContent = JSON.stringify(snapshot.staticConfig, null, 2);

    renderTable('#runtime-config', [
        { label: 'Clave', render: row => row.key },
        { label: 'Valor', render: row => JSON.stringify(row.value) },
    ], snapshot.runtimeConfig, 'No hay estado persistido guardado.');

    renderTable('#logs-table', [
        { label: 'Fecha', render: row => new Date(row.timestamp).toLocaleString('es-AR') },
        { label: 'Tipo', render: row => row.type },
        { label: 'Detalle', render: row => JSON.stringify(row.details) },
    ], snapshot.logs, 'No hay logs persistidos.');

    if (state.refreshMs !== snapshot.staticConfig.dashboard.refreshMs) {
        state.refreshMs = snapshot.staticConfig.dashboard.refreshMs;
        startAutoRefresh();
    }
}

async function loadDashboard() {
    try {
        setStatus('Actualizando...', 'warn');
        const snapshot = await apiFetch('/api/dashboard');
        render(snapshot);
        setStatus(snapshot.discord.ready ? 'Bot listo' : 'Bot iniciando', snapshot.discord.ready ? 'ok' : 'warn');
    } catch (error) {
        console.error(error);
        setStatus('Error de carga', 'error');
        $('#generated-at').textContent = error.message;
    }
}

function startAutoRefresh() {
    if (state.refreshTimer) clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(loadDashboard, state.refreshMs);
}

function setupTabs() {
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            const parent = button.closest('.card');
            const isLeaderboard = targetId === 'xp-table' || targetId === 'eco-table' || targetId === 'voice-table';
            const isGiveaway = targetId === 'giveaways-active-table' || targetId === 'giveaways-ended-table';

            if (isLeaderboard) {
                document.querySelectorAll('#xp-table, #eco-table, #voice-table').forEach(host => host.classList.add('hidden'));
            } else if (isGiveaway) {
                document.querySelectorAll('#giveaways-active-table, #giveaways-ended-table').forEach(host => host.classList.add('hidden'));
            }

            parent.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
}

async function handleQuickAction(action, payload = {}) {
    if (state.quickActionLoading) return;

    const statusHost = $('#quick-actions-status');
    try {
        state.quickActionLoading = true;
        if (statusHost) statusHost.textContent = 'Procesando...';

        let result;
        if (action === 'send-summary') {
            result = await apiFetch('/api/summary/send', { method: 'POST' });
        }

        if (result?.ok) {
            if (statusHost) statusHost.textContent = '✓ Acción completada';
            if (action === 'send-summary') {
                await loadDashboard();
            }
        } else {
            if (statusHost) statusHost.textContent = `Error: ${result?.error || 'Desconocido'}`;
        }
    } catch (error) {
        if (statusHost) statusHost.textContent = `Error: ${error.message}`;
    } finally {
        state.quickActionLoading = false;
    }
}

async function handleTicketClose(channelId) {
    if (!confirm('¿Cerrar este ticket? Esto eliminará el canal.')) return;

    try {
        const result = await apiFetch('/api/tickets/close', { method: 'POST', body: { channelId } });
        if (result.ok) {
            await loadDashboard();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function handleGiveawayEnd(messageId) {
    if (!confirm('¿Sortear este sorteo ahora? Se seleccionará un ganador aleatorio.')) return;

    try {
        const result = await apiFetch('/api/giveaways/end', { method: 'POST', body: { messageId } });
        if (result.ok) {
            alert(`¡Ganador: <@${result.winner}>!`);
            await loadDashboard();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function handleReminderDelete(reminderId) {
    if (!confirm('¿Eliminar este recordatorio?')) return;

    try {
        const result = await apiFetch('/api/reminders/delete', { method: 'POST', body: { id: reminderId } });
        if (result.ok) {
            await loadDashboard();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function handleWarnsClear(userId) {
    if (!confirm(`¿Limpiar TODOS los warns de <@${userId}>?`)) return;

    try {
        const result = await apiFetch('/api/warns/clear', { method: 'POST', body: { userId } });
        if (result.ok) {
            await loadDashboard();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

function init() {
    state.token = getStoredToken();
    setConfigSaveStatus(state.configStatus.text, state.configStatus.variant);
    setupTabs();
    loadDashboard();
    startAutoRefresh();

    const btnSummary = $('#btn-send-summary');
    if (btnSummary) {
        btnSummary.addEventListener('click', () => handleQuickAction('send-summary'));
    }
}

window.addEventListener('DOMContentLoaded', init);

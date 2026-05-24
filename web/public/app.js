const AUTH_STORAGE_KEY = 'prophet_dashboard_auth';
const LEGACY_TOKEN_STORAGE_KEY = 'prophet_dashboard_token';
const CONFIG_DRAFT_STORAGE_KEY = 'prophet_dashboard_config_draft_v1';
const CONFIG_STEP_DESCRIPTIONS = {
    Comunidad: 'Canales visibles para la comunidad y experiencias de uso diario.',
    Operación: 'Destinos operativos para moderación, comandos y soporte staff.',
    Voz: 'Configuración de salas temporales y automatizaciones de voz.',
    Onboarding: 'Puntos de entrada para bienvenida, reglas y anuncios.',
    General: 'Configuración general disponible desde el dashboard.',
};

const state = {
    refreshTimer: null,
    refreshMs: 30000,
    accessToken: null,
    refreshToken: null,
    csrfToken: null,
    currentUser: null,
    authRequired: false,
    authLoading: false,
    latestSnapshot: null,
    configDirty: false,
    configSaving: false,
    configDraft: {},
    configFields: [],
    configBaseline: {},
    configStepIndex: 0,
    configInvalidCount: 0,
    configDraftRestored: false,
    configStatus: {
        text: 'Sin cambios pendientes.',
        variant: 'muted',
    },
    quickActionLoading: false,
    actionFeedbackTimer: null,
    confirmResolver: null,
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

function setQuickActionsStatus(text, variant = 'muted') {
    const host = $('#quick-actions-status');
    if (!host) return;
    host.textContent = text;
    host.className = variant === 'muted' ? 'form-status muted' : `form-status status-${variant}`;
}

function hideActionFeedback() {
    const host = $('#action-feedback');
    if (!host) return;
    host.classList.add('hidden');
    if (state.actionFeedbackTimer) {
        clearTimeout(state.actionFeedbackTimer);
        state.actionFeedbackTimer = null;
    }
}

function showActionFeedback({ title, message, variant = 'success', persist = false }) {
    const host = $('#action-feedback');
    if (!host) return;

    $('#action-feedback-title').textContent = title;
    $('#action-feedback-message').textContent = message;
    host.className = `action-feedback action-feedback-${variant}`;
    host.classList.remove('hidden');

    if (state.actionFeedbackTimer) {
        clearTimeout(state.actionFeedbackTimer);
        state.actionFeedbackTimer = null;
    }

    if (!persist) {
        state.actionFeedbackTimer = setTimeout(hideActionFeedback, 5500);
    }
}

function getStoredAuth() {
    try {
        localStorage.removeItem(LEGACY_TOKEN_STORAGE_KEY);
    } catch {
        // noop
    }

    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
}

function getStoredConfigDraft() {
    const raw = localStorage.getItem(CONFIG_DRAFT_STORAGE_KEY);
    if (!raw) return {};

    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        localStorage.removeItem(CONFIG_DRAFT_STORAGE_KEY);
        return {};
    }
}

function persistConfigDraft() {
    if (!state.configDirty || !Object.keys(state.configDraft).length) {
        localStorage.removeItem(CONFIG_DRAFT_STORAGE_KEY);
        return;
    }

    localStorage.setItem(CONFIG_DRAFT_STORAGE_KEY, JSON.stringify(state.configDraft));
}

function clearStoredConfigDraft() {
    localStorage.removeItem(CONFIG_DRAFT_STORAGE_KEY);
}

function persistAuthState() {
    const payload = {
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        csrfToken: state.csrfToken,
        currentUser: state.currentUser,
    };

    if (!payload.accessToken && !payload.refreshToken) {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        return;
    }

    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

function applyAuthState(auth = {}) {
    state.accessToken = auth.accessToken || null;
    state.refreshToken = auth.refreshToken || null;
    state.csrfToken = auth.csrfToken || null;
    state.currentUser = auth.currentUser || null;
    persistAuthState();
}

function clearAuthState() {
    state.accessToken = null;
    state.refreshToken = null;
    state.csrfToken = null;
    state.currentUser = null;
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

function setAuthStatus(text, variant = 'muted') {
    const host = $('#auth-status');
    if (!host) return;
    host.textContent = text;
    host.className = variant === 'muted' ? 'form-status muted' : `form-status status-${variant}`;
}

function toggleAuthCard(visible) {
    const card = $('#auth-card');
    if (!card) return;

    card.classList.toggle('hidden', !visible);

    const logoutButton = $('#auth-logout-button');
    if (logoutButton) logoutButton.disabled = !state.accessToken && !state.refreshToken;
}

function isMutatingMethod(method = 'GET') {
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method).toUpperCase());
}

async function refreshSession() {
    if (!state.refreshToken) {
        throw new Error('No hay sesión disponible para renovar.');
    }

    const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
        cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'string' ? payload : payload?.error || payload?.message || `HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }

    applyAuthState({
        accessToken: payload?.tokens?.accessToken || null,
        refreshToken: payload?.tokens?.refreshToken || state.refreshToken,
        csrfToken: payload?.csrfToken || null,
        currentUser: payload?.user || state.currentUser,
    });

    return payload;
}

async function apiFetch(pathname, options = {}, allowRefresh = true) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = { ...(options.headers || {}) };

    if (state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json; charset=utf-8';
    if (isMutatingMethod(method) && state.csrfToken) headers['x-csrf-token'] = state.csrfToken;

    const response = await fetch(pathname, {
        method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') || '';
    const parseResponse = async () => {
        if (contentType.includes('application/json')) return response.json();
        return response.text();
    };

    if (response.status === 401 && allowRefresh && pathname !== '/api/auth/login' && pathname !== '/api/auth/refresh' && state.refreshToken) {
        try {
            await refreshSession();
            return apiFetch(pathname, options, false);
        } catch {
            clearAuthState();
        }
    }

    if (!response.ok) {
        const payload = await parseResponse();
        const message = typeof payload === 'string' ? payload : payload?.error || payload?.message || `HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
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

function formatConfigValue(value) {
    const normalized = String(value || '').trim();
    return normalized || 'Vacío';
}

function getActionErrorMessage(error) {
    if (!error) return 'Ocurrió un error inesperado.';
    if (typeof error === 'string') return error;
    if (typeof error.message === 'string' && error.message) return error.message;
    if (typeof error.error === 'string' && error.error) return error.error;
    return 'Ocurrió un error inesperado.';
}

function setButtonLoading(button, loading, loadingLabel = 'Procesando...') {
    if (!button) return;

    if (loading) {
        if (!button.dataset.originalLabel) {
            button.dataset.originalLabel = button.textContent;
        }
        button.disabled = true;
        button.textContent = loadingLabel;
        return;
    }

    if (button.dataset.originalLabel) {
        button.textContent = button.dataset.originalLabel;
        delete button.dataset.originalLabel;
    }
    button.disabled = false;
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
            ${columns.map(col => {
                const rendered = col.render(row);
                return `<td>${col.allowHtml ? rendered : escapeHtml(rendered)}</td>`;
            }).join('')}
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

function closeConfirmModal(confirmed) {
    const host = $('#confirm-modal');
    if (!host) return;

    host.classList.add('hidden');
    document.body.classList.remove('modal-open');

    const resolver = state.confirmResolver;
    state.confirmResolver = null;
    if (resolver) resolver(Boolean(confirmed));
}

function confirmAction({
    title,
    description,
    impact,
    confirmLabel = 'Confirmar',
    confirmVariant = 'danger',
}) {
    const host = $('#confirm-modal');
    if (!host) return Promise.resolve(true);

    $('#confirm-modal-title').textContent = title;
    $('#confirm-modal-description').textContent = description;
    $('#confirm-modal-impact').textContent = impact;

    const confirmButton = $('#confirm-modal-confirm');
    if (confirmButton) {
        confirmButton.textContent = confirmLabel;
        confirmButton.className = confirmVariant === 'danger'
            ? 'button button-danger'
            : 'button';
    }

    host.classList.remove('hidden');
    document.body.classList.add('modal-open');

    return new Promise(resolve => {
        state.confirmResolver = resolve;
    });
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
    return String(state.configBaseline[key] || '').trim();
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

function buildConfigBaseline(fields) {
    return (Array.isArray(fields) ? fields : []).reduce((acc, field) => {
        acc[field.key] = String(field.value || '');
        return acc;
    }, {});
}

function groupEditableConfigFields(fields) {
    const groups = [];
    const byLabel = new Map();

    (Array.isArray(fields) ? fields : []).forEach(field => {
        const label = field.group || 'General';
        if (!byLabel.has(label)) {
            const group = {
                label,
                description: CONFIG_STEP_DESCRIPTIONS[label] || CONFIG_STEP_DESCRIPTIONS.General,
                fields: [],
            };
            byLabel.set(label, group);
            groups.push(group);
        }

        byLabel.get(label).fields.push(field);
    });

    return groups;
}

function getConfigInputError(field, value) {
    const normalized = String(value || '').trim();
    if (!normalized) return '';
    if (!/^\d{17,20}$/.test(normalized)) {
        return `${field?.label || 'Este campo'} debe contener un ID de Discord válido de 17 a 20 dígitos o quedar vacío.`;
    }
    return '';
}

function renderConfigReview(groups) {
    const dirtyUpdates = collectDirtyConfigUpdates();
    if (!dirtyUpdates.length) {
        return `
            <div class="empty-state">
                Todavía no hay cambios para revisar. Avanzá paso a paso o descartá el borrador actual.
            </div>
        `;
    }

    const byKey = new Map();
    groups.forEach(group => {
        group.fields.forEach(field => byKey.set(field.key, field));
    });

    return `
        <div class="review-list">
            ${dirtyUpdates.map(update => {
                const field = byKey.get(update.key);
                return `
                    <article class="review-item">
                        <div>
                            <strong>${escapeHtml(field?.label || update.key)}</strong>
                            <p>${escapeHtml(field?.group || 'General')} · ${escapeHtml(field?.expectedTypeLabel || 'Valor')}</p>
                        </div>
                        <div class="review-values">
                            <span>${escapeHtml(formatConfigValue(getOriginalConfigValue(update.key)))}</span>
                            <span class="review-arrow">→</span>
                            <span>${escapeHtml(formatConfigValue(update.value))}</span>
                        </div>
                    </article>
                `;
            }).join('')}
        </div>
    `;
}

function clampConfigStep(groups) {
    const maxIndex = Array.isArray(groups) ? groups.length : 0;
    state.configStepIndex = Math.min(Math.max(state.configStepIndex, 0), maxIndex);
}

function getConfigStepTitle(groups) {
    const reviewIndex = groups.length;
    if (state.configStepIndex >= reviewIndex) return 'Revisión final';
    return groups[state.configStepIndex]?.label || 'Configuración';
}

function updateConfigDirtyState() {
    const form = $('#editable-config-form');
    if (!form) return;

    let dirtyCount = 0;
    let invalidCount = 0;
    Array.from(form.querySelectorAll('[data-config-input]')).forEach(input => {
        const currentValue = String(input.value || '').trim();
        const originalValue = getOriginalConfigValue(input.name);
        const isDirty = currentValue !== originalValue;
        const field = getEditableField(input.name);
        const errorMessage = getConfigInputError(field, currentValue);
        const card = input.closest('[data-config-field]');
        const feedback = card?.querySelector('[data-config-feedback]');

        if (card) card.classList.toggle('dirty', isDirty);
        if (card) card.classList.toggle('invalid', Boolean(errorMessage));
        input.dataset.invalid = errorMessage ? 'true' : 'false';
        if (feedback) {
            feedback.textContent = errorMessage || 'Vaciar el campo elimina el override guardado.';
            feedback.className = errorMessage ? 'setting-feedback status-error' : 'setting-feedback muted';
        }
        if (isDirty) dirtyCount += 1;
        if (errorMessage) invalidCount += 1;
    });

    state.configDirty = dirtyCount > 0;
    state.configInvalidCount = invalidCount;
    state.configDraft = state.configDirty ? collectConfigDraftFromDom() : {};
    persistConfigDraft();

    const saveButton = $('#config-save-button');
    const resetButton = $('#config-reset-button');
    if (saveButton) saveButton.disabled = !state.configDirty || state.configSaving || invalidCount > 0;
    if (resetButton) resetButton.disabled = !state.configDirty || state.configSaving;

    const nextButton = $('#config-next-button');
    if (nextButton) {
        const currentStep = form.querySelector(`.config-step[data-step-index="${state.configStepIndex}"]`);
        const hasStepError = currentStep
            ? Array.from(currentStep.querySelectorAll('[data-config-input]')).some(input => input.dataset.invalid === 'true')
            : false;
        nextButton.disabled = hasStepError;
    }

    if (invalidCount > 0) {
        setConfigSaveStatus(`Revisá ${invalidCount} campo(s) con formato inválido antes de continuar.`, 'error');
    } else if (state.configDirty) {
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

    const formFields = state.configDirty && state.configFields.length ? state.configFields : fields;

    if (!Array.isArray(formFields) || !formFields.length) {
        host.innerHTML = '<div class="empty-state">No hay claves editables configuradas todavía.</div>';
        state.configDirty = false;
        state.configFields = [];
        state.configBaseline = {};
        return;
    }

    if (!state.configDirty) {
        state.configFields = formFields;
        state.configBaseline = buildConfigBaseline(formFields);
    }

    const groups = groupEditableConfigFields(formFields);
    clampConfigStep(groups);
    const reviewIndex = groups.length;
    const totalSteps = groups.length + 1;
    const currentStepNumber = Math.min(state.configStepIndex + 1, totalSteps);
    const progressPercent = Math.round((currentStepNumber / totalSteps) * 100);

    host.innerHTML = `
        <div class="config-flow">
            <div class="config-flow-head">
                <div>
                    <p class="eyebrow">Flujo guiado</p>
                    <h3>${escapeHtml(getConfigStepTitle(groups))}</h3>
                    <p class="muted">Paso ${currentStepNumber} de ${totalSteps}. El borrador se guarda en este navegador y no se pierde con la autoactualización del dashboard.</p>
                </div>
                <div class="config-progress">
                    <div class="config-progress-copy">
                        <strong>${progressPercent}% completado</strong>
                        <span>${escapeHtml(getConfigStepTitle(groups))}</span>
                    </div>
                    <div class="config-progress-bar" aria-hidden="true">
                        <span style="width: ${progressPercent}%"></span>
                    </div>
                </div>
            </div>
            <div class="config-stepper" role="tablist" aria-label="Pasos de configuración">
                ${groups.map((group, index) => `
                    <button
                        class="config-step-chip ${index === state.configStepIndex ? 'active' : ''} ${index < state.configStepIndex ? 'done' : ''}"
                        type="button"
                        data-config-step-button="${index}"
                    >
                        <span>${index + 1}</span>
                        ${escapeHtml(group.label)}
                    </button>
                `).join('')}
                <button
                    class="config-step-chip ${state.configStepIndex === reviewIndex ? 'active' : ''}"
                    type="button"
                    data-config-step-button="${reviewIndex}"
                >
                    <span>${reviewIndex + 1}</span>
                    Revisión
                </button>
            </div>
            ${groups.map((group, index) => `
                <section class="config-step ${index === state.configStepIndex ? '' : 'hidden'}" data-step-index="${index}">
                    <div class="config-step-head">
                        <div>
                            <h3>${escapeHtml(group.label)}</h3>
                            <p class="muted">${escapeHtml(group.description)}</p>
                        </div>
                    </div>
                    <div class="settings-grid">
                        ${group.fields.map(field => {
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
                                    <p class="setting-feedback muted" data-config-feedback>Vaciar el campo elimina el override guardado.</p>
                                    <div class="setting-meta">
                                        <span>${escapeHtml(field.expectedTypeLabel)}</span>
                                        <span>Origen: ${escapeHtml(getSourceLabel(field.source))}</span>
                                        <span>${escapeHtml(getResolvedLabel(field))}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </section>
            `).join('')}
            <section class="config-step ${state.configStepIndex === reviewIndex ? '' : 'hidden'}" data-step-index="${reviewIndex}">
                <div class="config-step-head">
                    <div>
                        <h3>Revisión final</h3>
                        <p class="muted">Confirmá los cambios antes de persistirlos. La validación fuerte contra Discord ocurre al guardar.</p>
                    </div>
                </div>
                ${renderConfigReview(groups)}
            </section>
        </div>
        <div class="settings-actions config-flow-actions">
            <button id="config-prev-button" class="button button-secondary" type="button" ${state.configStepIndex === 0 ? 'disabled' : ''}>Atrás</button>
            ${state.configStepIndex < reviewIndex
                ? '<button id="config-next-button" class="button" type="button">Siguiente</button>'
                : '<button id="config-save-button" class="button button-large" type="submit">Guardar cambios</button>'}
            <button id="config-reset-button" class="button button-secondary" type="button">Descartar</button>
        </div>
    `;

    host.oninput = handleConfigInput;
    host.onsubmit = handleConfigSubmit;
    host.onclick = handleConfigClick;

    updateConfigDirtyState();

    if (state.configDraftRestored) {
        if (state.configDirty) {
            setConfigSaveStatus('Recuperamos tu borrador local. Revisalo y continuá desde donde habías quedado.', 'warn');
        }
        state.configDraftRestored = false;
    }
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

function handleConfigClick(event) {
    const stepButton = event.target.closest('[data-config-step-button]');
    if (stepButton) {
        state.configStepIndex = Number(stepButton.dataset.configStepButton) || 0;
        renderEditableConfig(state.latestSnapshot?.editableConfig || []);
        return;
    }

    if (event.target.id === 'config-reset-button') {
        handleConfigReset();
        return;
    }

    if (event.target.id === 'config-prev-button') {
        state.configStepIndex = Math.max(0, state.configStepIndex - 1);
        renderEditableConfig(state.latestSnapshot?.editableConfig || []);
        return;
    }

    if (event.target.id === 'config-next-button') {
        const form = $('#editable-config-form');
        const currentStep = form?.querySelector(`.config-step[data-step-index="${state.configStepIndex}"]`);
        const hasStepError = currentStep
            ? Array.from(currentStep.querySelectorAll('[data-config-input]')).some(input => input.dataset.invalid === 'true')
            : false;

        if (hasStepError) {
            setConfigSaveStatus('Corregí el formato de los campos marcados antes de avanzar.', 'error');
            return;
        }

        state.configStepIndex += 1;
        renderEditableConfig(state.latestSnapshot?.editableConfig || []);
    }
}

function handleConfigReset() {
    state.configDraft = {};
    state.configDirty = false;
    state.configInvalidCount = 0;
    state.configStepIndex = 0;
    clearStoredConfigDraft();
    setConfigSaveStatus('Sin cambios pendientes.', 'muted');
    renderEditableConfig(state.latestSnapshot?.editableConfig || []);
}

async function handleConfigSubmit(event) {
    event.preventDefault();
    if (state.configSaving) return;
    if (state.configInvalidCount > 0) {
        setConfigSaveStatus('Corregí los campos marcados antes de guardar.', 'error');
        return;
    }

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
        state.configDirty = false;
        state.configInvalidCount = 0;
        state.configDraft = {};
        state.configFields = [];
        state.configBaseline = {};
        state.configStepIndex = 0;
        clearStoredConfigDraft();
        state.configSaving = false;
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
        { label: 'Acción', allowHtml: true, render: row => `<button class="button button-secondary button-small" type="button" onclick="handleTicketClose('${row.channelId}', this)">Cerrar</button>` },
    ], snapshot.tickets || [], 'No hay tickets abiertos.');

    // Sorteos
    renderTable('#giveaways-active-table', [
        { label: 'Premio', render: row => row.prize },
        { label: 'Participantes', render: row => formatNumber(row.entriesCount) },
        { label: 'Termina', render: row => row.isExpired ? 'EXPIRADO' : new Date(row.endTime).toLocaleString('es-AR') },
        { label: 'Host', render: row => `<@${row.hostId}>` },
        { label: 'Acción', allowHtml: true, render: row => `<button class="button button-small" type="button" onclick="handleGiveawayEnd('${row.messageId}', this)" ${row.entriesCount === 0 ? 'disabled' : ''}>Sortear</button>` },
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
        { label: 'Acción', allowHtml: true, render: row => `<button class="button button-secondary button-small" type="button" onclick="handleReminderDelete(${row.id}, this)">Eliminar</button>` },
    ], snapshot.reminders || [], 'No hay recordatorios pendientes.');

    // Reportes/Warns
    renderTable('#reportes-table', [
        { label: 'ID', render: row => row.id },
        { label: 'Usuario', render: row => `<@${row.userId}>` },
        { label: 'Moderador', render: row => `<@${row.modId}>` },
        { label: 'Razón', render: row => row.reason?.slice(0, 40) + (row.reason?.length > 40 ? '…' : '') },
        { label: 'Fecha', render: row => formatTimestamp(row.createdAt) },
        { label: 'Acción', allowHtml: true, render: row => `<button class="button button-secondary button-small" type="button" onclick="handleWarnsClear('${row.userId}', this)">Limpiar</button>` },
    ], snapshot.reportes || [], 'No hay warns registrados.');

    // Hacer funciones accesibles globalmente para onclick
    window.handleTicketClose = handleTicketClose;
    window.handleGiveawayEnd = handleGiveawayEnd;
    window.handleReminderDelete = handleReminderDelete;
    window.handleWarnsClear = handleWarnsClear;

    if (!state.configDirty && !state.configSaving) {
        renderEditableConfig(snapshot.editableConfig || []);
    }
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
    if (state.authRequired && !state.accessToken && !state.refreshToken) {
        toggleAuthCard(true);
        setStatus('Autenticación requerida', 'warn');
        $('#generated-at').textContent = 'Iniciá sesión para ver el dashboard';
        return;
    }

    try {
        setStatus('Actualizando...', 'warn');
        const snapshot = await apiFetch('/api/dashboard');
        state.authRequired = false;
        toggleAuthCard(false);
        render(snapshot);
        setAuthStatus(
            state.currentUser?.username
                ? `Sesión activa como ${state.currentUser.username}.`
                : 'Sesión activa.',
            'success'
        );
        setStatus(snapshot.discord.ready ? 'Bot listo' : 'Bot iniciando', snapshot.discord.ready ? 'ok' : 'warn');
    } catch (error) {
        console.error(error);
        if (error.status === 401) {
            state.authRequired = true;
            clearAuthState();
            toggleAuthCard(true);
            setAuthStatus('Sesión vencida o inválida. Iniciá sesión para continuar.', 'error');
            setStatus('Autenticación requerida', 'warn');
            $('#generated-at').textContent = 'Iniciá sesión para ver el dashboard';
            return;
        }

        setStatus('Error de carga', 'error');
        $('#generated-at').textContent = error.message;
    }
}

function startAutoRefresh() {
    if (state.refreshTimer) clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(loadDashboard, state.refreshMs);
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    if (state.authLoading) return;

    const usernameInput = $('#auth-username');
    const passwordInput = $('#auth-password');
    const username = usernameInput?.value?.trim();
    const password = passwordInput?.value;

    if (!username || !password) {
        setAuthStatus('Ingresá usuario y contraseña.', 'error');
        return;
    }

    try {
        state.authLoading = true;
        toggleAuthCard(true);
        setAuthStatus('Validando credenciales...', 'warn');

        const payload = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: { username, password },
        }, false);

        applyAuthState({
            accessToken: payload?.tokens?.accessToken || null,
            refreshToken: payload?.tokens?.refreshToken || null,
            csrfToken: payload?.csrfToken || null,
            currentUser: payload?.user || null,
        });

        state.authRequired = false;

        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';

        setAuthStatus(
            payload?.user?.mustChangePassword
                ? 'Sesión iniciada. La contraseña quedó marcada para cambio obligatorio.'
                : `Sesión iniciada como ${payload?.user?.username || 'usuario'}.`,
            payload?.user?.mustChangePassword ? 'warn' : 'success'
        );

        await loadDashboard();
    } catch (error) {
        clearAuthState();
        state.authRequired = true;
        toggleAuthCard(true);
        setAuthStatus(error.message || 'No se pudo iniciar sesión.', 'error');
        setStatus('Autenticación requerida', 'warn');
        $('#generated-at').textContent = 'Iniciá sesión para ver el dashboard';
    } finally {
        state.authLoading = false;
    }
}

async function handleAuthLogout() {
    if (state.authLoading) return;

    try {
        state.authLoading = true;
        setAuthStatus('Cerrando sesión...', 'warn');

        if (state.accessToken && state.csrfToken) {
            await apiFetch('/api/auth/logout', { method: 'POST' }, false);
        }
    } catch (error) {
        console.error(error);
    } finally {
        clearAuthState();
        state.authRequired = true;
        toggleAuthCard(true);
        setAuthStatus('Sesión cerrada.', 'muted');
        setStatus('Autenticación requerida', 'warn');
        $('#generated-at').textContent = 'Iniciá sesión para ver el dashboard';
        state.authLoading = false;
    }
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

async function handleQuickAction(action, payload = {}, triggerButton = null) {
    if (state.quickActionLoading) return;

    try {
        state.quickActionLoading = true;
        setButtonLoading(triggerButton, true);
        setQuickActionsStatus('Procesando...', 'warn');

        let result;
        if (action === 'send-summary') {
            result = await apiFetch('/api/summary/send', { method: 'POST' });
        }

        if (result?.ok) {
            setQuickActionsStatus('Resumen enviado correctamente.', 'success');
            showActionFeedback({
                title: 'Resumen técnico enviado',
                message: 'La acción rápida se ejecutó correctamente y el dashboard quedó actualizado.',
                variant: 'success',
            });
            if (action === 'send-summary') {
                await loadDashboard();
            }
        } else {
            throw new Error(getActionErrorMessage(result));
        }
    } catch (error) {
        const message = getActionErrorMessage(error);
        setQuickActionsStatus(message, 'error');
        showActionFeedback({
            title: 'No se pudo completar la acción',
            message,
            variant: 'error',
            persist: true,
        });
    } finally {
        state.quickActionLoading = false;
        setButtonLoading(triggerButton, false);
    }
}

async function handleTicketClose(channelId, triggerButton = null) {
    const confirmed = await confirmAction({
        title: 'Cerrar ticket',
        description: 'Esta acción eliminará el canal del ticket y lo quitará del dashboard.',
        impact: 'El canal se borra y el ticket deja de estar disponible para seguimiento.',
        confirmLabel: 'Cerrar ticket',
        confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
        setButtonLoading(triggerButton, true);
        const result = await apiFetch('/api/tickets/close', { method: 'POST', body: { channelId } });
        if (result.ok) {
            showActionFeedback({
                title: 'Ticket cerrado',
                message: `El ticket ${channelId} se cerró correctamente.`,
                variant: 'success',
            });
            await loadDashboard();
        } else {
            throw new Error(getActionErrorMessage(result));
        }
    } catch (error) {
        showActionFeedback({
            title: 'No se pudo cerrar el ticket',
            message: getActionErrorMessage(error),
            variant: 'error',
            persist: true,
        });
    } finally {
        setButtonLoading(triggerButton, false);
    }
}

async function handleGiveawayEnd(messageId, triggerButton = null) {
    const confirmed = await confirmAction({
        title: 'Forzar sorteo',
        description: 'Se elegirá un ganador aleatorio ahora mismo y el sorteo se marcará como finalizado.',
        impact: 'No se puede revertir desde el dashboard. El ganador se anunciará en el canal del sorteo.',
        confirmLabel: 'Sortear ahora',
        confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
        setButtonLoading(triggerButton, true);
        const result = await apiFetch('/api/giveaways/end', { method: 'POST', body: { messageId } });
        if (result.ok) {
            showActionFeedback({
                title: 'Sorteo finalizado',
                message: `Se eligió como ganador a <@${result.winner}>.`,
                variant: 'success',
                persist: true,
            });
            await loadDashboard();
        } else {
            throw new Error(getActionErrorMessage(result));
        }
    } catch (error) {
        showActionFeedback({
            title: 'No se pudo finalizar el sorteo',
            message: getActionErrorMessage(error),
            variant: 'error',
            persist: true,
        });
    } finally {
        setButtonLoading(triggerButton, false);
    }
}

async function handleReminderDelete(reminderId, triggerButton = null) {
    const confirmed = await confirmAction({
        title: 'Eliminar recordatorio',
        description: 'Vas a borrar un recordatorio programado por un usuario.',
        impact: 'El recordatorio se elimina y no volverá a enviarse.',
        confirmLabel: 'Eliminar recordatorio',
        confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
        setButtonLoading(triggerButton, true);
        const result = await apiFetch('/api/reminders/delete', { method: 'POST', body: { id: reminderId } });
        if (result.ok) {
            showActionFeedback({
                title: 'Recordatorio eliminado',
                message: `El recordatorio #${reminderId} se eliminó correctamente.`,
                variant: 'success',
            });
            await loadDashboard();
        } else {
            throw new Error(getActionErrorMessage(result));
        }
    } catch (error) {
        showActionFeedback({
            title: 'No se pudo eliminar el recordatorio',
            message: getActionErrorMessage(error),
            variant: 'error',
            persist: true,
        });
    } finally {
        setButtonLoading(triggerButton, false);
    }
}

async function handleWarnsClear(userId, triggerButton = null) {
    const confirmed = await confirmAction({
        title: 'Limpiar warns',
        description: `Vas a limpiar todos los warns acumulados por <@${userId}>.`,
        impact: 'Se borra el historial de advertencias persistido para ese usuario.',
        confirmLabel: 'Limpiar warns',
        confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
        setButtonLoading(triggerButton, true);
        const result = await apiFetch('/api/warns/clear', { method: 'POST', body: { userId } });
        if (result.ok) {
            showActionFeedback({
                title: 'Warns limpiados',
                message: `Se eliminó el historial de advertencias de <@${userId}>.`,
                variant: 'success',
            });
            await loadDashboard();
        } else {
            throw new Error(getActionErrorMessage(result));
        }
    } catch (error) {
        showActionFeedback({
            title: 'No se pudieron limpiar los warns',
            message: getActionErrorMessage(error),
            variant: 'error',
            persist: true,
        });
    } finally {
        setButtonLoading(triggerButton, false);
    }
}

function init() {
    applyAuthState(getStoredAuth() || {});
    state.configDraft = getStoredConfigDraft();
    state.configDraftRestored = Object.keys(state.configDraft).length > 0;
    state.authRequired = !state.accessToken && !state.refreshToken;
    setConfigSaveStatus(state.configStatus.text, state.configStatus.variant);
    setQuickActionsStatus('Sin acciones recientes.', 'muted');
    setAuthStatus(
        state.authRequired
            ? 'Esperando autenticación.'
            : state.currentUser?.username
                ? `Sesión restaurada como ${state.currentUser.username}.`
                : 'Sesión restaurada.',
        state.authRequired ? 'muted' : 'success'
    );
    toggleAuthCard(state.authRequired);
    setupTabs();
    loadDashboard();
    startAutoRefresh();

    const authForm = $('#auth-form');
    if (authForm) authForm.addEventListener('submit', handleAuthSubmit);

    const logoutButton = $('#auth-logout-button');
    if (logoutButton) logoutButton.addEventListener('click', handleAuthLogout);

    const btnSummary = $('#btn-send-summary');
    if (btnSummary) {
        btnSummary.addEventListener('click', () => handleQuickAction('send-summary', {}, btnSummary));
    }

    const feedbackDismiss = $('#action-feedback-dismiss');
    if (feedbackDismiss) feedbackDismiss.addEventListener('click', hideActionFeedback);

    const confirmCancel = $('#confirm-modal-cancel');
    if (confirmCancel) confirmCancel.addEventListener('click', () => closeConfirmModal(false));

    const confirmApprove = $('#confirm-modal-confirm');
    if (confirmApprove) confirmApprove.addEventListener('click', () => closeConfirmModal(true));

    const confirmBackdrop = $('#confirm-modal');
    if (confirmBackdrop) {
        confirmBackdrop.addEventListener('click', event => {
            if (event.target === confirmBackdrop) {
                closeConfirmModal(false);
            }
        });
    }

    window.addEventListener('keydown', event => {
        if (event.key === 'Escape' && state.confirmResolver) {
            closeConfirmModal(false);
        }
    });

    window.addEventListener('beforeunload', event => {
        if (!state.configDirty || state.configSaving) return;
        event.preventDefault();
        event.returnValue = '';
    });
}

window.addEventListener('DOMContentLoaded', init);

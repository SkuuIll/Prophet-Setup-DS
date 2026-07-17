const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

const reminderTimers = new Map();

function parseTiempo(str) {
    const regex = /(\d+)\s*(s|seg|segundo[s]?|m|min|minuto[s]?|h|hora[s]?|d|dia[s]?|día[s]?)/gi;
    let totalMs = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
        const value = Number.parseInt(match[1], 10);
        const unit = match[2].toLowerCase();

        if (unit.startsWith('s')) totalMs += value * 1000;
        else if (unit.startsWith('m')) totalMs += value * 60 * 1000;
        else if (unit.startsWith('h')) totalMs += value * 60 * 60 * 1000;
        else if (unit.startsWith('d')) totalMs += value * 24 * 60 * 60 * 1000;
    }

    return totalMs;
}

function formatTiempo(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 && days === 0 && hours === 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
}

function clearScheduledReminder(reminderId) {
    const timer = reminderTimers.get(reminderId);
    if (timer) clearTimeout(timer);
    reminderTimers.delete(reminderId);
}

async function dispatchReminder(client, reminderId) {
    const reminder = stmts.getReminder(reminderId);
    if (!reminder) {
        clearScheduledReminder(reminderId);
        return false;
    }

    try {
        const user = await client.users.fetch(reminder.user_id);
        const guildName = reminder.guild_id
            ? client.guilds.cache.get(reminder.guild_id)?.name || 'tu servidor'
            : 'tu servidor';

        await user.send({
            embeds: [new EmbedBuilder()
                .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                .setAuthor({ name: '⏰  Recordatorio · Prophet Bot' })
                .setDescription(
                    `> 📌 **${reminder.message}**\n\n` +
                    `> Este recordatorio fue programado en **${guildName}**.`
                )
                .setFooter({ text: `Recordatorio #${reminder.id}  ·  Prophet Bot` })
                .setTimestamp()]
        });
        stmts.incrementAnalyticsMetric('reminders_sent', 'global', 1);
        stmts.setHealthCheck('reminders:dispatcher', {
            status: 'ok',
            details: { reminderId }
        });
        clearScheduledReminder(reminderId);
        stmts.deleteReminder(reminderId);
        return true;
    } catch (error) {
        const attempts = (reminder.attempts || 0) + 1;
        const retryDelay = Math.min(60 * 60 * 1000, 60 * 1000 * (2 ** Math.min(attempts - 1, 6)));
        const nextAttemptAt = Date.now() + retryDelay;
        stmts.incrementAnalyticsMetric('reminders_failed', 'global', 1);
        stmts.incrementAnalyticsMetric('error_events', 'reminders', 1);
        stmts.setHealthCheck('reminders:dispatcher', {
            status: 'error',
            details: {
                reminderId,
                message: error.message,
            }
        });
        clearScheduledReminder(reminderId);
        stmts.markReminderFailure(reminderId, error.message, nextAttemptAt);
        scheduleReminder(client, {
            ...reminder,
            attempts,
            next_attempt_at: nextAttemptAt,
        });
        return false;
    }
}

function scheduleReminder(client, reminder) {
    if (!client || !reminder) return;

    clearScheduledReminder(reminder.id);
    const scheduledAt = reminder.next_attempt_at || reminder.remind_at;
    const delay = Math.max(scheduledAt - Date.now(), 0);

    const timer = setTimeout(() => {
        dispatchReminder(client, reminder.id).catch(err => {
            console.error(`❌ Error enviando recordatorio #${reminder.id}:`, err.message);
        });
    }, delay);

    reminderTimers.set(reminder.id, timer);
}

async function createReminder(client, { userId, guildId, message, remindAt }) {
    const reminderId = stmts.addReminder(userId, guildId, message, remindAt);
    const reminder = stmts.getReminder(reminderId);
    scheduleReminder(client, reminder);
    stmts.incrementAnalyticsMetric('reminders_created', 'global', 1);
    return reminder;
}

function cancelReminder(reminderId, userId) {
    const deleted = stmts.deleteReminder(reminderId, userId);
    if (deleted) {
        clearScheduledReminder(reminderId);
        stmts.incrementAnalyticsMetric('reminders_canceled', 'global', 1);
    }
    return deleted;
}

function getUserReminders(userId) {
    return stmts.getUserReminders(userId);
}

function loadPendingReminders(client) {
    const reminders = stmts.getPendingReminders();
    reminders.forEach(reminder => scheduleReminder(client, reminder));
    stmts.setHealthCheck('reminders:scheduler', {
        status: 'ok',
        details: {
            rehydrated: reminders.length,
            scheduled: reminderTimers.size,
        }
    });
    return reminders.length;
}

module.exports = {
    parseTiempo,
    formatTiempo,
    createReminder,
    cancelReminder,
    getUserReminders,
    loadPendingReminders,
};

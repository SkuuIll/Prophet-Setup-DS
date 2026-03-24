// ═══════════════════════════════════════════════════
//  MÓDULO: membershipIntegration.js
//  Integración con membresías y monetización
// ═══════════════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const { stmts, _db } = require('../database');

// Crear tablas para membresías
_db.exec(`
    CREATE TABLE IF NOT EXISTS membership_tiers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        role_id TEXT,
        price REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        duration_days INTEGER DEFAULT 30,
        benefits TEXT,
        platform TEXT DEFAULT 'manual',
        platform_tier_id TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        UNIQUE(guild_id, name)
    );

    CREATE TABLE IF NOT EXISTS user_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        tier_id INTEGER NOT NULL,
        status TEXT DEFAULT 'active',
        started_at INTEGER NOT NULL,
        expires_at INTEGER,
        platform TEXT DEFAULT 'manual',
        platform_subscription_id TEXT,
        amount_paid REAL,
        currency TEXT DEFAULT 'USD',
        last_payment INTEGER,
        created_at INTEGER,
        FOREIGN KEY (tier_id) REFERENCES membership_tiers(id),
        UNIQUE(user_id, guild_id, tier_id)
    );

    CREATE TABLE IF NOT EXISTS payment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT NOT NULL,
        tier_id INTEGER,
        amount REAL,
        currency TEXT DEFAULT 'USD',
        platform TEXT,
        transaction_id TEXT,
        status TEXT DEFAULT 'completed',
        created_at INTEGER,
        FOREIGN KEY (tier_id) REFERENCES membership_tiers(id)
    );

    CREATE INDEX IF NOT EXISTS idx_memberships_user ON user_memberships(user_id, guild_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_expires ON user_memberships(expires_at);
`);

// ═══════════════════════════════════════════════════
//  GESTIÓN DE TIERS
// ═══════════════════════════════════════════════════

/**
 * Crea un tier de membresía
 */
function createTier(guildId, tierData) {
    const now = Date.now();
    const result = _db.prepare(`
        INSERT INTO membership_tiers 
        (guild_id, name, description, role_id, price, currency, duration_days, benefits, platform, platform_tier_id, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
        guildId,
        tierData.name,
        tierData.description || null,
        tierData.roleId || null,
        tierData.price || 0,
        tierData.currency || 'USD',
        tierData.durationDays || 30,
        JSON.stringify(tierData.benefits || []),
        tierData.platform || 'manual',
        tierData.platformTierId || null,
        now
    );

    return getTier(Number(result.lastInsertRowid));
}

/**
 * Obtiene un tier por ID
 */
function getTier(tierId) {
    const tier = _db.prepare('SELECT * FROM membership_tiers WHERE id = ?').get(tierId);
    if (tier) {
        tier.benefits = JSON.parse(tier.benefits || '[]');
    }
    return tier;
}

/**
 * Obtiene tiers de un servidor
 */
function getGuildTiers(guildId, activeOnly = true) {
    let query = 'SELECT * FROM membership_tiers WHERE guild_id = ?';
    if (activeOnly) query += ' AND is_active = 1';
    query += ' ORDER BY price ASC';

    return _db.prepare(query).all(guildId).map(t => ({
        ...t,
        benefits: JSON.parse(t.benefits || '[]')
    }));
}

/**
 * Actualiza un tier
 */
function updateTier(tierId, tierData, guildId = null) {
    const tier = getTier(tierId);
    if (!tier || (guildId && tier.guild_id !== guildId)) return null;

    _db.prepare(`
        UPDATE membership_tiers 
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            role_id = COALESCE(?, role_id),
            price = COALESCE(?, price),
            duration_days = COALESCE(?, duration_days),
            benefits = COALESCE(?, benefits)
        WHERE id = ?
    `).run(
        tierData.name || null,
        tierData.description || null,
        tierData.roleId || null,
        tierData.price || null,
        tierData.durationDays || null,
        tierData.benefits ? JSON.stringify(tierData.benefits) : null,
        tierId
    );

    return getTier(tierId);
}

/**
 * Elimina un tier
 */
function deleteTier(tierId, guildId = null) {
    const query = guildId
        ? 'DELETE FROM membership_tiers WHERE id = ? AND guild_id = ?'
        : 'DELETE FROM membership_tiers WHERE id = ?';
    const params = guildId ? [tierId, guildId] : [tierId];

    return _db.prepare(query).run(...params).changes > 0;
}

// ═══════════════════════════════════════════════════
//  GESTIÓN DE MEMBRESÍAS
// ═══════════════════════════════════════════════════

/**
 * Asigna una membresía a un usuario
 */
async function assignMembership(userId, guildId, tierId, options = {}, client = null) {
    const tier = getTier(tierId);
    if (!tier || tier.guild_id !== guildId) {
        return { error: 'Tier no encontrado' };
    }

    const now = Date.now();
    const expiresAt = options.expiresAt || (now + (tier.duration_days * 24 * 60 * 60 * 1000));

    // Verificar membresía existente
    const existing = _db.prepare(`
        SELECT * FROM user_memberships 
        WHERE user_id = ? AND guild_id = ? AND tier_id = ?
    `).get(userId, guildId, tierId);

    if (existing && existing.status === 'active') {
        // Extender membresía existente
        const newExpires = Math.max(existing.expires_at, now) + (tier.duration_days * 24 * 60 * 60 * 1000);
        _db.prepare(`
            UPDATE user_memberships 
            SET expires_at = ?, last_payment = ?
            WHERE id = ?
        `).run(newExpires, now, existing.id);

        return { success: true, membershipId: existing.id, extended: true, expiresAt: newExpires };
    }

    // Crear nueva membresía
    const result = _db.prepare(`
        INSERT INTO user_memberships 
        (user_id, guild_id, tier_id, status, started_at, expires_at, platform, platform_subscription_id, amount_paid, currency, last_payment, created_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId, guildId, tierId,
        now, expiresAt,
        options.platform || tier.platform,
        options.platformSubscriptionId || null,
        options.amountPaid || tier.price,
        options.currency || tier.currency,
        now, now
    );

    const membershipId = Number(result.lastInsertRowid);

    // Asignar rol si está configurado
    if (tier.role_id && client) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);
            await member.roles.add(tier.role_id);
        } catch (e) {
            console.error('[Membership] Error assigning role:', e.message);
        }
    }

    return { success: true, membershipId, expiresAt, tier };
}

/**
 * Revoca una membresía
 */
async function revokeMembership(userId, guildId, tierId, client = null) {
    const membership = _db.prepare(`
        SELECT um.*, mt.role_id 
        FROM user_memberships um
        JOIN membership_tiers mt ON um.tier_id = mt.id
        WHERE um.user_id = ? AND um.guild_id = ? AND um.tier_id = ?
    `).get(userId, guildId, tierId);

    if (!membership) return { error: 'Membresía no encontrada' };

    _db.prepare(`
        UPDATE user_memberships 
        SET status = 'revoked' 
        WHERE id = ?
    `).run(membership.id);

    // Remover rol
    if (membership.role_id && client) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);
            await member.roles.remove(membership.role_id);
        } catch (e) {
            console.error('[Membership] Error removing role:', e.message);
        }
    }

    return { success: true };
}

/**
 * Obtiene membresías de un usuario
 */
function getUserMemberships(userId, guildId = null) {
    let query = `
        SELECT um.*, mt.name as tier_name, mt.description, mt.role_id, mt.benefits
        FROM user_memberships um
        JOIN membership_tiers mt ON um.tier_id = mt.id
        WHERE um.user_id = ? AND um.status = 'active'
    `;
    const params = [userId];

    if (guildId) {
        query += ' AND um.guild_id = ?';
        params.push(guildId);
    }

    query += ' ORDER BY um.expires_at DESC';

    return _db.prepare(query).all(...params).map(m => ({
        ...m,
        benefits: JSON.parse(m.benefits || '[]')
    }));
}

/**
 * Obtiene usuarios con membresía próxima a vencer
 */
function getExpiringMemberships(guildId, withinDays = 7) {
    const now = Date.now();
    const cutoff = now + (withinDays * 24 * 60 * 60 * 1000);

    return _db.prepare(`
        SELECT um.*, mt.name as tier_name, mt.role_id
        FROM user_memberships um
        JOIN membership_tiers mt ON um.tier_id = mt.id
        WHERE um.guild_id = ? 
        AND um.status = 'active' 
        AND um.expires_at BETWEEN ? AND ?
        ORDER BY um.expires_at ASC
    `).all(guildId, now, cutoff);
}

/**
 * Procesa membresías vencidas
 */
async function processExpiredMemberships(client) {
    const now = Date.now();
    const expired = _db.prepare(`
        SELECT um.*, mt.role_id, mt.guild_id
        FROM user_memberships um
        JOIN membership_tiers mt ON um.tier_id = mt.id
        WHERE um.status = 'active' AND um.expires_at < ?
    `).all(now);

    for (const membership of expired) {
        _db.prepare('UPDATE user_memberships SET status = ? WHERE id = ?').run('expired', membership.id);

        // Remover rol
        if (membership.role_id && client) {
            try {
                const guild = await client.guilds.fetch(membership.guild_id);
                const member = await guild.members.fetch(membership.user_id);
                await member.roles.remove(membership.role_id);
            } catch (e) {
                // Usuario puede haber salido del servidor
            }
        }
    }

    return expired.length;
}

// ═══════════════════════════════════════════════════
//  PATREON INTEGRATION
// ═══════════════════════════════════════════════════

/**
 * Procesa webhook de Patreon
 */
async function handlePatreonWebhook(guildId, payload, client) {
    const { data, included } = payload;

    if (!data || !data.relationships) {
        return { error: 'Payload inválido' };
    }

    const patronId = data.id;
    const patronStatus = data.attributes?.patron_status;
    const pledgeAmount = data.attributes?.currently_entitled_amount_cents;
    const userId = data.relationships?.user?.data?.id;

    // Buscar tier correspondiente al monto
    const tiers = getGuildTiers(guildId);
    const matchingTier = tiers.find(t => 
        Math.round(t.price * 100) <= pledgeAmount
    );

    if (!matchingTier) {
        return { error: 'No hay tier para este monto' };
    }

    // Buscar el usuario de Discord vinculado
    // (esto requeriría una tabla de vinculación Patreon-Discord)
    const discordUserId = userId; // Simplificado

    if (patronStatus === 'active_patron') {
        return await assignMembership(discordUserId, guildId, matchingTier.id, {
            platform: 'patreon',
            platformSubscriptionId: patronId,
            amountPaid: pledgeAmount / 100,
            currency: 'USD'
        }, client);
    } else if (patronStatus === 'declined_patron' || patronStatus === 'former_patron') {
        return await revokeMembership(discordUserId, guildId, matchingTier.id, client);
    }

    return { success: true, status: patronStatus };
}

// ═══════════════════════════════════════════════════
//  MERCADO PAGO INTEGRATION
// ═══════════════════════════════════════════════════

/**
 * Crea una preferencia de pago (Mercado Pago)
 */
async function createMercadoPagoPreference(tier, userId, guildId) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) return { error: 'Mercado Pago no configurado' };

    try {
        const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [{
                    id: `tier_${tier.id}`,
                    title: tier.name,
                    description: tier.description || `Membresía ${tier.name}`,
                    quantity: 1,
                    currency_id: tier.currency === 'USD' ? 'USD' : 'ARS',
                    unit_price: tier.price
                }],
                back_urls: {
                    success: 'https://discord.com/channels/@me',
                    failure: 'https://discord.com/channels/@me'
                },
                external_reference: `${guildId}_${userId}_${tier.id}`,
                notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL
            })
        });

        if (!res.ok) {
            const error = await res.json();
            return { error: error.message || `Error: ${res.status}` };
        }

        const data = await res.json();
        return {
            success: true,
            initPoint: data.init_point,
            sandboxInitPoint: data.sandbox_init_point,
            preferenceId: data.id
        };
    } catch (e) {
        return { error: e.message };
    }
}

/**
 * Procesa webhook de Mercado Pago
 */
async function handleMercadoPagoWebhook(guildId, paymentId, client) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) return { error: 'Mercado Pago no configurado' };

    try {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!res.ok) return { error: `Error: ${res.status}` };

        const payment = await res.json();

        if (payment.status !== 'approved') {
            return { success: false, status: payment.status };
        }

        // Parsear external_reference: guildId_userId_tierId
        const [refGuildId, userId, tierId] = payment.external_reference.split('_');

        if (refGuildId !== guildId) {
            return { error: 'Guild ID no coincide' };
        }

        // Registrar pago
        _db.prepare(`
            INSERT INTO payment_history 
            (user_id, guild_id, tier_id, amount, currency, platform, transaction_id, status, created_at)
            VALUES (?, ?, ?, ?, ?, 'mercadopago', ?, 'completed', ?)
        `).run(userId, guildId, parseInt(tierId), payment.transaction_amount, payment.currency_id, payment.id, Date.now());

        // Asignar membresía
        return await assignMembership(userId, guildId, parseInt(tierId), {
            platform: 'mercadopago',
            platformSubscriptionId: payment.id,
            amountPaid: payment.transaction_amount,
            currency: payment.currency_id
        }, client);
    } catch (e) {
        return { error: e.message };
    }
}

// ═══════════════════════════════════════════════════
//  EMBEDS
// ═══════════════════════════════════════════════════

/**
 * Genera embed de tiers
 */
function generateTiersEmbed(tiers) {
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💎 Membresías Premium')
        .setDescription(
            tiers.map(t => 
                `**${t.name}** - $${t.price} ${t.currency}\n` +
                `${t.description || 'Sin descripción'}\n` +
                `⏱️ Duración: ${t.duration_days} días\n` +
                (t.benefits?.length > 0 ? `✨ ${t.benefits.join(', ')}` : '')
            ).join('\n\n')
        )
        .setFooter({ text: 'Usa /premium comprar para obtener una membresía' })
        .setTimestamp();

    return embed;
}

/**
 * Genera embed de membresía de usuario
 */
function generateUserMembershipEmbed(memberships) {
    if (memberships.length === 0) {
        return new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('💎 Mis Membresías')
            .setDescription('No tienes membresías activas.');
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('💎 Mis Membresías')
        .setDescription(
            memberships.map(m => {
                const expires = new Date(m.expires_at);
                const daysLeft = Math.ceil((m.expires_at - Date.now()) / (24 * 60 * 60 * 1000));
                return `**${m.tier_name}**\n` +
                       `⏱️ Expira: ${expires.toLocaleDateString('es-AR')}\n` +
                       `📅 Días restantes: ${daysLeft}` +
                       (m.benefits?.length > 0 ? `\n✨ ${m.benefits.join(', ')}` : '');
            }).join('\n\n')
        )
        .setTimestamp();

    return embed;
}

// ═══════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════

module.exports = {
    // Tiers
    createTier,
    getTier,
    getGuildTiers,
    updateTier,
    deleteTier,
    // Membresías
    assignMembership,
    revokeMembership,
    getUserMemberships,
    getExpiringMemberships,
    processExpiredMemberships,
    // Patreon
    handlePatreonWebhook,
    // Mercado Pago
    createMercadoPagoPreference,
    handleMercadoPagoWebhook,
    // Embeds
    generateTiersEmbed,
    generateUserMembershipEmbed
};

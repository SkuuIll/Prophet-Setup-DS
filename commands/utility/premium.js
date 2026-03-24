// ═══════════════════════════════════════════════════
//  COMANDO: /premium
//  Gestión de membresías premium
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const membership = require('../../modules/membershipIntegration');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('Sistema de membresías premium')
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver tus membresías'))
        .addSubcommand(sub =>
            sub.setName('tienda')
                .setDescription('Ver membresías disponibles'))
        .addSubcommand(sub =>
            sub.setName('comprar')
                .setDescription('Comprar una membresía')
                .addIntegerOption(opt => opt.setName('tier').setDescription('ID del tier').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('Crear un nuevo tier de membresía (Admin)')
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre del tier').setRequired(true))
                .addNumberOption(opt => opt.setName('precio').setDescription('Precio').setRequired(true))
                .addIntegerOption(opt => opt.setName('duracion').setDescription('Duración en días').setRequired(true))
                .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción').setRequired(false))
                .addRoleOption(opt => opt.setName('rol').setDescription('Rol a asignar').setRequired(false))
                .addStringOption(opt => opt.setName('beneficios').setDescription('Beneficios (separados por coma)').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('editar')
                .setDescription('Editar un tier de membresía (Admin)')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del tier').setRequired(true))
                .addStringOption(opt => opt.setName('nombre').setDescription('Nuevo nombre').setRequired(false))
                .addNumberOption(opt => opt.setName('precio').setDescription('Nuevo precio').setRequired(false))
                .addIntegerOption(opt => opt.setName('duracion').setDescription('Nueva duración en días').setRequired(false))
                .addRoleOption(opt => opt.setName('rol').setDescription('Nuevo rol').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('eliminar')
                .setDescription('Eliminar un tier de membresía (Admin)')
                .addIntegerOption(opt => opt.setName('id').setDescription('ID del tier').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('asignar')
                .setDescription('Asignar membresía a un usuario (Admin)')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
                .addIntegerOption(opt => opt.setName('tier').setDescription('ID del tier').setRequired(true))
                .addIntegerOption(opt => opt.setName('dias').setDescription('Duración personalizada en días').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('revocar')
                .setDescription('Revocar membresía de un usuario (Admin)')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
                .addIntegerOption(opt => opt.setName('tier').setDescription('ID del tier').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('Ver todos los tiers (Admin)'))
        .addSubcommand(sub =>
            sub.setName('vencimientos')
                .setDescription('Ver membresías próximas a vencer (Admin)')
                .addIntegerOption(opt => opt.setName('dias').setDescription('Días hacia adelante').setRequired(false))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'ver':
                return await handleVer(interaction);
            case 'tienda':
                return await handleTienda(interaction);
            case 'comprar':
                return await handleComprar(interaction);
            case 'crear':
                return await handleCrear(interaction);
            case 'editar':
                return await handleEditar(interaction);
            case 'eliminar':
                return await handleEliminar(interaction);
            case 'asignar':
                return await handleAsignar(interaction);
            case 'revocar':
                return await handleRevocar(interaction);
            case 'lista':
                return await handleLista(interaction);
            case 'vencimientos':
                return await handleVencimientos(interaction);
        }
    }
};

async function handleVer(interaction) {
    const memberships = membership.getUserMemberships(interaction.user.id, interaction.guildId);
    const embed = membership.generateUserMembershipEmbed(memberships);

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTienda(interaction) {
    const tiers = membership.getGuildTiers(interaction.guildId);

    if (tiers.length === 0) {
        return interaction.reply({ 
            content: 'No hay membresías disponibles en este servidor.', 
            ephemeral: true 
        });
    }

    const embed = membership.generateTiersEmbed(tiers);

    // Botones para cada tier
    const rows = [];
    const buttons = tiers.slice(0, 5).map(t => 
        new ButtonBuilder()
            .setCustomId(`premium_buy_${t.id}`)
            .setLabel(`${t.name} - $${t.price}`)
            .setStyle(ButtonStyle.Premium)
    );

    if (buttons.length > 0) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(0, 5)));
    }

    return interaction.reply({ embeds: [embed], components: rows });
}

async function handleComprar(interaction) {
    const tierId = interaction.options.getInteger('tier');
    const tier = membership.getTier(tierId);

    if (!tier || tier.guild_id !== interaction.guildId) {
        return interaction.reply({ content: '❌ Tier no encontrado.', ephemeral: true });
    }

    // Intentar Mercado Pago si está configurado
    if (process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        await interaction.deferReply({ ephemeral: true });

        const result = await membership.createMercadoPagoPreference(
            tier, 
            interaction.user.id, 
            interaction.guildId
        );

        if (result.success) {
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTitle(`💳 Comprar ${tier.name}`)
                .setDescription(`Para completar tu compra, haz clic en el botón de abajo.`)
                .addFields(
                    { name: 'Precio', value: `$${tier.price} ${tier.currency}`, inline: true },
                    { name: 'Duración', value: `${tier.duration_days} días`, inline: true }
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Pagar con Mercado Pago')
                        .setStyle(ButtonStyle.Link)
                        .setURL(result.initPoint || result.sandboxInitPoint)
                        .setEmoji('💳')
                );

            return interaction.editReply({ embeds: [embed], components: [row] });
        }

        return interaction.editReply({ content: `❌ Error: ${result.error}` });
    }

    // Pago manual
    return interaction.reply({
        content: `💎 Para adquirir **${tier.name}** ($${tier.price} ${tier.currency}), contacta a un administrador.`,
        ephemeral: true
    });
}

async function handleCrear(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }

    const nombre = interaction.options.getString('nombre');
    const precio = interaction.options.getNumber('precio');
    const duracion = interaction.options.getInteger('duracion');
    const descripcion = interaction.options.getString('descripcion');
    const rol = interaction.options.getRole('rol');
    const beneficiosStr = interaction.options.getString('beneficios');
    const beneficios = beneficiosStr ? beneficiosStr.split(',').map(b => b.trim()) : [];

    const tier = membership.createTier(interaction.guildId, {
        name: nombre,
        price: precio,
        durationDays: duracion,
        description: descripcion,
        roleId: rol?.id,
        benefits: beneficios
    });

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Tier creado')
        .addFields(
            { name: 'ID', value: `#${tier.id}`, inline: true },
            { name: 'Nombre', value: nombre, inline: true },
            { name: 'Precio', value: `$${precio}`, inline: true },
            { name: 'Duración', value: `${duracion} días`, inline: true }
        );

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleEditar(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }

    const id = interaction.options.getInteger('id');
    const nombre = interaction.options.getString('nombre');
    const precio = interaction.options.getNumber('precio');
    const duracion = interaction.options.getInteger('duracion');
    const rol = interaction.options.getRole('rol');

    const updates = {};
    if (nombre) updates.name = nombre;
    if (precio !== null) updates.price = precio;
    if (duracion !== null) updates.durationDays = duracion;
    if (rol) updates.roleId = rol.id;

    const tier = membership.updateTier(id, updates, interaction.guildId);

    if (!tier) {
        return interaction.reply({ content: '❌ Tier no encontrado.', ephemeral: true });
    }

    return interaction.reply({ 
        content: `✅ Tier **${tier.name}** actualizado.`, 
        ephemeral: true 
    });
}

async function handleEliminar(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }

    const id = interaction.options.getInteger('id');
    const deleted = membership.deleteTier(id, interaction.guildId);

    if (deleted) {
        return interaction.reply({ content: '✅ Tier eliminado.', ephemeral: true });
    } else {
        return interaction.reply({ content: '❌ Tier no encontrado.', ephemeral: true });
    }
}

async function handleAsignar(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }

    const usuario = interaction.options.getUser('usuario');
    const tierId = interaction.options.getInteger('tier');
    const dias = interaction.options.getInteger('dias');

    const expiresAt = dias ? Date.now() + (dias * 24 * 60 * 60 * 1000) : null;

    const result = await membership.assignMembership(
        usuario.id,
        interaction.guildId,
        tierId,
        { expiresAt, platform: 'manual' },
        interaction.client
    );

    if (result.error) {
        return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('💎 Membresía asignada')
        .setDescription(`Se asignó **${result.tier?.name || 'Premium'}** a ${usuario}`)
        .addFields(
            { name: 'Expira', value: new Date(result.expiresAt).toLocaleDateString('es-AR'), inline: true }
        );

    return interaction.reply({ embeds: [embed] });
}

async function handleRevocar(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }

    const usuario = interaction.options.getUser('usuario');
    const tierId = interaction.options.getInteger('tier');

    const result = await membership.revokeMembership(
        usuario.id,
        interaction.guildId,
        tierId,
        interaction.client
    );

    if (result.error) {
        return interaction.reply({ content: `❌ ${result.error}`, ephemeral: true });
    }

    return interaction.reply({ 
        content: `✅ Membresía revocada de ${usuario}.`, 
        ephemeral: true 
    });
}

async function handleLista(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }

    const tiers = membership.getGuildTiers(interaction.guildId, false);

    if (tiers.length === 0) {
        return interaction.reply({ content: 'No hay tiers creados.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Lista de Tiers')
        .setDescription(
            tiers.map(t => 
                `**#${t.id} ${t.name}**\n` +
                `💰 $${t.price} ${t.currency} | ⏱️ ${t.duration_days} días\n` +
                `🎭 Rol: ${t.role_id ? `<@&${t.role_id}>` : 'Ninguno'} | 📊 ${t.is_active ? 'Activo' : 'Inactivo'}`
            ).join('\n\n')
        );

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleVencimientos(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ No tienes permisos.', ephemeral: true });
    }

    const dias = interaction.options.getInteger('dias') || 7;
    const expiring = membership.getExpiringMemberships(interaction.guildId, dias);

    if (expiring.length === 0) {
        return interaction.reply({ 
            content: `No hay membresías venciendo en los próximos ${dias} días.`, 
            ephemeral: true 
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle(`⏰ Membresías por vencer (${dias} días)`)
        .setDescription(
            expiring.map(m => {
                const daysLeft = Math.ceil((m.expires_at - Date.now()) / (24 * 60 * 60 * 1000));
                return `<@${m.user_id}> - **${m.tier_name}**\n` +
                       `📅 Expira en ${daysLeft} días`;
            }).join('\n\n')
        );

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

// ═══════════════════════════════════════════════════
//  COMANDO: /canal
//  Gestión de canales de voz temporales premium
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { stmts } = require('../../database');

const MODES = {
    gaming: { name: '🎮 Gaming', limit: 0, bitrate: 64 },
    musica: { name: '🎵 Música', limit: 0, bitrate: 96 },
    stream: { name: '📺 Stream', limit: 0, bitrate: 64 },
    scrim: { name: '⚔️ Scrim', limit: 10, bitrate: 64 },
    chill: { name: '☕ Chill', limit: 5, bitrate: 48 },
    privado: { name: '🔒 Privado', limit: 2, bitrate: 64 },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('canal')
        .setDescription('Gestiona tu canal de voz temporal')
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('Crear un canal de voz temporal con configuración personalizada')
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nombre del canal')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('modo')
                        .setDescription('Plantilla rápida de configuración')
                        .setRequired(false)
                        .addChoices(
                            { name: '🎮 Gaming', value: 'gaming' },
                            { name: '🎵 Música', value: 'musica' },
                            { name: '📺 Stream', value: 'stream' },
                            { name: '⚔️ Scrim', value: 'scrim' },
                            { name: '☕ Chill', value: 'chill' },
                            { name: '🔒 Privado', value: 'privado' },
                        )
                )
                .addIntegerOption(opt =>
                    opt.setName('limite')
                        .setDescription('Límite de usuarios (0 = sin límite)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(99)
                )
        )
        .addSubcommand(sub =>
            sub.setName('configurar')
                .setDescription('Configurar tu canal de voz temporal actual')
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nuevo nombre del canal')
                        .setRequired(false)
                )
                .addIntegerOption(opt =>
                    opt.setName('limite')
                        .setDescription('Nuevo límite de usuarios')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(99)
                )
                .addBooleanOption(opt =>
                    opt.setName('bloquear')
                        .setDescription('Bloquear el canal (solo invitados)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('invitar')
                .setDescription('Permitir que un usuario acceda a tu canal privado')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario a invitar')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('expulsar')
                .setDescription('Expulsar a un usuario de tu canal')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario a expulsar')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('transferir')
                .setDescription('Transferir ownership del canal a otro usuario')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Nuevo dueño del canal')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Ver información de tu canal temporal')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'crear') {
            return await handleCreate(interaction);
        }

        if (subcommand === 'configurar') {
            return await handleConfigure(interaction);
        }

        if (subcommand === 'invitar') {
            return await handleInvite(interaction);
        }

        if (subcommand === 'expulsar') {
            return await handleKick(interaction);
        }

        if (subcommand === 'transferir') {
            return await handleTransfer(interaction);
        }

        if (subcommand === 'info') {
            return await handleInfo(interaction);
        }
    }
};

async function handleCreate(interaction) {
    const name = interaction.options.getString('nombre');
    const mode = interaction.options.getString('modo');
    const limit = interaction.options.getInteger('limite');

    // Verificar que el usuario esté en un canal de voz
    const member = interaction.member;
    if (!member.voice.channel) {
        return interaction.reply({
            content: '❌ Debes estar en un canal de voz para crear un canal temporal.',
            ephemeral: true
        });
    }

    const guild = interaction.guild;
    const parentCategory = member.voice.channel.parentId;

    // Aplicar configuración del modo
    const modeConfig = mode ? MODES[mode] : null;
    const userLimit = limit ?? modeConfig?.limit ?? 0;
    const bitrate = modeConfig?.bitrate ?? 64;

    try {
        const newChannel = await guild.channels.create({
            name: name.slice(0, 100),
            type: 2, // GUILD_VOICE
            parent: parentCategory,
            bitrate: bitrate * 1000,
            userLimit: userLimit,
            permissionOverwrites: [
                {
                    id: guild.id,
                    allow: ['ViewChannel', 'Connect'],
                },
                {
                    id: member.id,
                    allow: ['ViewChannel', 'Connect', 'Speak', 'Stream', 'ManageChannels', 'ManageRoles', 'MoveMembers'],
                },
            ]
        });

        // Registrar en la DB con configuración extendida
        stmts.addTempChannel(newChannel.id, guild.id, member.id);
        stmts.incrementAnalyticsMetric('temp_channels_created', 'premium', 1);

        // Mover al usuario
        await member.voice.setChannel(newChannel);

        const embed = new EmbedBuilder()
            .setColor(0x4CAF50)
            .setTitle('🔊 Canal Creado')
            .setDescription(`Tu canal **${name}** ha sido creado exitosamente.`)
            .addFields(
                { name: '📝 Nombre', value: name, inline: true },
                { name: '👥 Límite', value: userLimit === 0 ? 'Sin límite' : `${userLimit} usuarios`, inline: true },
                { name: '🎵 Bitrate', value: `${bitrate} kbps`, inline: true },
            )
            .setFooter({ text: 'Usa /canal configurar para ajustar permisos • Eres el dueño del canal' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error creando canal:', error);
        await interaction.reply({
            content: `❌ No se pudo crear el canal: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleConfigure(interaction) {
    const member = interaction.member;

    // Verificar que esté en un canal temporal propio
    if (!member.voice.channel) {
        return interaction.reply({
            content: '❌ Debes estar en un canal de voz para configurarlo.',
            ephemeral: true
        });
    }

    const channel = member.voice.channel;
    const tempChannel = stmts.isTempChannel(channel.id);

    if (!tempChannel) {
        return interaction.reply({
            content: '❌ Este no es un canal temporal. Solo puedes configurar canales creados con /canal.',
            ephemeral: true
        });
    }

    // Verificar ownership
    const tempInfo = stmts.getTempChannels(channel.guildId).find(t => t.channel_id === channel.id);
    if (tempInfo?.owner_id !== member.id) {
        return interaction.reply({
            content: '❌ Solo el dueño del canal puede configurarlo.',
            ephemeral: true
        });
    }

    const name = interaction.options.getString('nombre');
    const limit = interaction.options.getInteger('limite');
    const block = interaction.options.getBoolean('bloquear');

    try {
        const updates = [];

        if (name) {
            await channel.setName(name.slice(0, 100));
            updates.push(`Nombre: **${name}**`);
        }

        if (limit !== null) {
            await channel.setUserLimit(limit);
            updates.push(`Límite: **${limit === 0 ? 'Sin límite' : `${limit} usuarios`}**`);
        }

        if (block !== null) {
            if (block) {
                await channel.permissionOverwrites.edit(interaction.guild.id, {
                    Connect: false
                });
                updates.push('Estado: **🔒 Bloqueado** (solo invitados)');
            } else {
                await channel.permissionOverwrites.edit(interaction.guild.id, {
                    Connect: true
                });
                updates.push('Estado: **🔓 Abierto**');
            }
        }

        if (updates.length === 0) {
            return interaction.reply({
                content: 'No especificaste cambios. Usa las opciones para modificar tu canal.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x2196F3)
            .setTitle('⚙️ Canal Actualizado')
            .setDescription(updates.join('\n'));

        await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
        console.error('Error configurando canal:', error);
        await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleInvite(interaction) {
    const member = interaction.member;
    const targetUser = interaction.options.getUser('usuario');

    if (!member.voice.channel) {
        return interaction.reply({
            content: '❌ Debes estar en un canal de voz para invitar usuarios.',
            ephemeral: true
        });
    }

    const channel = member.voice.channel;
    const tempInfo = stmts.getTempChannels(channel.guildId).find(t => t.channel_id === channel.id);

    if (!tempInfo || tempInfo.owner_id !== member.id) {
        return interaction.reply({
            content: '❌ Solo puedes invitar usuarios a tu propio canal temporal.',
            ephemeral: true
        });
    }

    try {
        await channel.permissionOverwrites.edit(targetUser.id, {
            ViewChannel: true,
            Connect: true,
            Speak: true,
            Stream: true
        });

        // Intentar mover al usuario si está en otro canal
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        if (targetMember.voice.channel) {
            await targetMember.voice.setChannel(channel);
        }

        const embed = new EmbedBuilder()
            .setColor(0x4CAF50)
            .setDescription(`✅ **${targetUser}** ha sido invitado a tu canal.`);

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        await interaction.reply({
            content: `❌ Error invitando usuario: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleKick(interaction) {
    const member = interaction.member;
    const targetUser = interaction.options.getUser('usuario');

    if (!member.voice.channel) {
        return interaction.reply({
            content: '❌ Debes estar en un canal de voz para expulsar usuarios.',
            ephemeral: true
        });
    }

    const channel = member.voice.channel;
    const tempInfo = stmts.getTempChannels(channel.guildId).find(t => t.channel_id === channel.id);

    if (!tempInfo || tempInfo.owner_id !== member.id) {
        return interaction.reply({
            content: '❌ Solo puedes expulsar usuarios de tu propio canal temporal.',
            ephemeral: true
        });
    }

    if (targetUser.id === member.id) {
        return interaction.reply({
            content: '❌ No puedes expulsarte a ti mismo.',
            ephemeral: true
        });
    }

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        // Quitar permisos
        await channel.permissionOverwrites.delete(targetUser.id);

        // Expulsar del canal si está ahí
        if (targetMember.voice.channelId === channel.id) {
            await targetMember.voice.disconnect('Expulsado del canal temporal');
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF5722)
            .setDescription(`👢 **${targetUser}** ha sido expulsado de tu canal.`);

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        await interaction.reply({
            content: `❌ Error expulsando usuario: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleTransfer(interaction) {
    const member = interaction.member;
    const targetUser = interaction.options.getUser('usuario');

    if (!member.voice.channel) {
        return interaction.reply({
            content: '❌ Debes estar en un canal de voz para transferirlo.',
            ephemeral: true
        });
    }

    const channel = member.voice.channel;
    const tempInfo = stmts.getTempChannels(channel.guildId).find(t => t.channel_id === channel.id);

    if (!tempInfo || tempInfo.owner_id !== member.id) {
        return interaction.reply({
            content: '❌ Solo puedes transferir tu propio canal temporal.',
            ephemeral: true
        });
    }

    if (targetUser.id === member.id) {
        return interaction.reply({
            content: '❌ No puedes transferirte el canal a ti mismo.',
            ephemeral: true
        });
    }

    try {
        const targetMember = await interaction.guild.members.fetch(targetUser.id);

        // Actualizar owner en la DB
        const db = require('../../database')._db;
        db.prepare('UPDATE temp_channels SET owner_id = ? WHERE channel_id = ?').run(targetUser.id, channel.id);

        // Dar permisos de management al nuevo owner
        await channel.permissionOverwrites.edit(targetUser.id, {
            ViewChannel: true,
            Connect: true,
            Speak: true,
            Stream: true,
            ManageChannels: true,
            ManageRoles: true,
            MoveMembers: true
        });

        const embed = new EmbedBuilder()
            .setColor(0x9C27B0)
            .setDescription(`👑 Has transferido el ownership del canal a **${targetUser}**.`);

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        await interaction.reply({
            content: `❌ Error transfiriendo canal: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleInfo(interaction) {
    const member = interaction.member;

    if (!member.voice.channel) {
        return interaction.reply({
            content: '❌ Debes estar en un canal de voz para ver su información.',
            ephemeral: true
        });
    }

    const channel = member.voice.channel;
    const tempInfo = stmts.getTempChannels(channel.guildId).find(t => t.channel_id === channel.id);

    if (!tempInfo) {
        return interaction.reply({
            content: '❌ Este no es un canal temporal.',
            ephemeral: true
        });
    }

    const owner = await interaction.guild.members.fetch(tempInfo.owner_id).catch(() => null);

    const embed = new EmbedBuilder()
        .setColor(0x2196F3)
        .setTitle(`📋 Info del Canal: ${channel.name}`)
        .addFields(
            { name: '👤 Dueño', value: owner ? `${owner}` : 'Desconocido', inline: true },
            { name: '👥 Usuarios', value: `${channel.members.size}/${channel.userLimit || '∞'}`, inline: true },
            { name: '🎵 Bitrate', value: `${channel.bitrate / 1000} kbps`, inline: true },
            { name: '📅 Creado', value: `<t:${Math.floor(tempInfo.created_at / 1000)}:R>`, inline: true },
            { name: '🆔 ID', value: `\`${channel.id}\``, inline: true },
        );

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

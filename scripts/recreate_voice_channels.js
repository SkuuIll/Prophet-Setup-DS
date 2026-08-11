// ═══════════════════════════════════════════════════
//  SCRIPT: Restaurar y Asegurar Canales de Voz Permanentes
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
    console.log(`🤖 Conectado como ${client.user.tag}`);

    try {
        const guild = await client.guilds.fetch(config.GUILD_ID);
        if (!guild) {
            console.error('❌ Servidor no encontrado');
            process.exit(1);
        }

        await guild.channels.fetch();
        await guild.roles.fetch();

        // 1. Asegurar categoría SALAS DE VOZ
        let catVoz = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildCategory &&
            (c.name.includes('SALAS DE VOZ') || c.name.includes('VOZ'))
        );

        if (!catVoz) {
            console.log('📁 Creando categoría "⟬🔊⟭ ═══ 𝗦𝗔𝗟𝗔𝗦 𝗗𝗘 𝗩𝗢𝗭 ═══"...');
            catVoz = await guild.channels.create({
                name: '⟬🔊⟭ ═══ 𝗦𝗔𝗟𝗔𝗦 𝗗𝗘 𝗩𝗢𝗭 ═══',
                type: ChannelType.GuildCategory,
                position: 2
            });
        }

        const catVozId = catVoz.id;
        console.log(`📁 Categoría de Voz: ${catVoz.name} (${catVozId})`);

        // Roles
        const roleVip = guild.roles.cache.find(r => r.name.toLowerCase().includes('vip'))
            || guild.roles.cache.get(config.ROLES.VIP);
        const roleStaff = guild.roles.cache.find(r => r.name.toLowerCase().includes('staff'))
            || guild.roles.cache.get(config.ROLES.STAFF);
        const roleProphet = guild.roles.cache.find(r => r.name.toLowerCase().includes('prophet'))
            || guild.roles.cache.get(config.ROLES.PROPHET);

        // 2. Canal 1: ➕ Crear Sala
        let chCrearSala = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildVoice &&
            c.parentId === catVozId &&
            c.name.includes('Crear Sala')
        );

        if (!chCrearSala) {
            console.log('✨ Creando canal "➕ Crear Sala"...');
            chCrearSala = await guild.channels.create({
                name: '➕ Crear Sala',
                type: ChannelType.GuildVoice,
                parent: catVozId,
                position: 0
            });
        }
        console.log(`✅ ➕ Crear Sala: ${chCrearSala.id}`);
        stmts.setConfig('voice_generator_id', chCrearSala.id);
        stmts.setConfig('voice_category_id', catVozId);

        // 3. Canal 2: 🔈・Lobby
        let chLobby = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildVoice &&
            c.parentId === catVozId &&
            c.name.includes('Lobby')
        );

        if (!chLobby) {
            console.log('✨ Creando canal "🔈・Lobby"...');
            chLobby = await guild.channels.create({
                name: '🔈・Lobby',
                type: ChannelType.GuildVoice,
                parent: catVozId,
                position: 1
            });
        }
        console.log(`✅ 🔈・Lobby: ${chLobby.id}`);

        // 4. Canal 3: 💎・VIP (Solo visible para VIPs y Staff)
        let chVip = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildVoice &&
            c.parentId === catVozId &&
            c.name.includes('VIP')
        );

        const vipOverwrites = [
            {
                id: guild.id, // @everyone oculto y bloqueado
                deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
            },
            {
                id: client.user.id, // Bot Prophet
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.Connect,
                    PermissionFlagsBits.Speak,
                    PermissionFlagsBits.ManageChannels,
                    PermissionFlagsBits.MoveMembers
                ],
            }
        ];

        if (roleVip) {
            vipOverwrites.push({
                id: roleVip.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            });
        }
        if (roleStaff) {
            vipOverwrites.push({
                id: roleStaff.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            });
        }
        if (roleProphet) {
            vipOverwrites.push({
                id: roleProphet.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            });
        }

        if (!chVip) {
            console.log('✨ Creando canal "💎・VIP" privado...');
            chVip = await guild.channels.create({
                name: '💎・VIP',
                type: ChannelType.GuildVoice,
                parent: catVozId,
                position: 2,
                permissionOverwrites: vipOverwrites
            });
        } else {
            await chVip.permissionOverwrites.set(vipOverwrites);
        }
        console.log(`✅ 💎・VIP: ${chVip.id}`);

        // 5. Canal 4: 💤・AFK
        let chAfk = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildVoice &&
            c.parentId === catVozId &&
            c.name.includes('AFK')
        );

        if (!chAfk) {
            console.log('✨ Creando canal "💤・AFK"...');
            chAfk = await guild.channels.create({
                name: '💤・AFK',
                type: ChannelType.GuildVoice,
                parent: catVozId,
                position: 3
            });
        }
        console.log(`✅ 💤・AFK: ${chAfk.id}`);

        // 6. Asegurar orden exacto
        await chCrearSala.setPosition(0);
        await chLobby.setPosition(1);
        await chVip.setPosition(2);
        await chAfk.setPosition(3);

        // Configurar canal AFK oficial en el servidor si no está configurado
        try {
            await guild.setAFKChannel(chAfk.id);
            await guild.setAFKTimeout(300); // 5 minutos
            console.log('💤 Canal AFK oficial del servidor configurado.');
        } catch (e) {
            console.warn('No se pudo configurar canal AFK del servidor:', e.message);
        }

        console.log('\n🎉 ¡Todos los canales de voz permanentes han sido restaurados y blindados!');
    } catch (err) {
        console.error('❌ Error restaurando canales de voz:', err);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);

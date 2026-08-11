// ═══════════════════════════════════════════════════
//  SCRIPT: Crear Canal de Voz VIP Privado
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

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

        const catVozId = '1473002313756049471'; // Categoría SALAS DE VOZ

        // Buscar roles
        const roleVip = guild.roles.cache.find(r => r.name.toLowerCase().includes('vip'))
            || guild.roles.cache.get(config.ROLES.VIP);
        const roleStaff = guild.roles.cache.find(r => r.name.toLowerCase().includes('staff'))
            || guild.roles.cache.get(config.ROLES.STAFF);
        const roleProphet = guild.roles.cache.find(r => r.name.toLowerCase().includes('prophet'))
            || guild.roles.cache.get(config.ROLES.PROPHET);

        console.log('💎 Rol VIP encontrado:', roleVip ? `${roleVip.name} (${roleVip.id})` : 'No encontrado');
        console.log('🛡️ Rol Staff encontrado:', roleStaff ? `${roleStaff.name} (${roleStaff.id})` : 'No encontrado');
        console.log('👑 Rol Prophet encontrado:', roleProphet ? `${roleProphet.name} (${roleProphet.id})` : 'No encontrado');

        const permissionOverwrites = [
            {
                // @everyone: Oculto y bloqueado
                id: guild.id,
                deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
            },
            {
                // Bot Prophet
                id: client.user.id,
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
            permissionOverwrites.push({
                id: roleVip.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            });
        }

        if (roleStaff) {
            permissionOverwrites.push({
                id: roleStaff.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            });
        }

        if (roleProphet) {
            permissionOverwrites.push({
                id: roleProphet.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
            });
        }

        // Comprobar si ya existe un canal VIP en voz
        let vipChannel = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildVoice &&
            c.parentId === catVozId &&
            c.name.toLowerCase().includes('vip')
        );

        if (vipChannel) {
            console.log(`🔄 Actualizando permisos del canal existente "${vipChannel.name}"...`);
            await vipChannel.permissionOverwrites.set(permissionOverwrites);
            await vipChannel.setPosition(2);
        } else {
            console.log('✨ Creando nuevo canal de voz "💎・VIP" privado...');
            vipChannel = await guild.channels.create({
                name: '💎・VIP',
                type: ChannelType.GuildVoice,
                parent: catVozId,
                position: 2,
                permissionOverwrites
            });
            console.log(`✅ Canal de voz VIP creado con éxito: ${vipChannel.id}`);
        }

        // Reordenar canales en SALAS DE VOZ:
        // 0: ➕ Crear Sala
        // 1: 🔈・Lobby
        // 2: 💎・VIP
        // 3: 💤・AFK
        const chCrearSala = guild.channels.cache.get('1474428292353232987');
        const chLobby = guild.channels.cache.get('1473002315546890262');
        const chAfk = guild.channels.cache.get('1473002324678148207');

        if (chCrearSala) await chCrearSala.setPosition(0);
        if (chLobby) await chLobby.setPosition(1);
        if (vipChannel) await vipChannel.setPosition(2);
        if (chAfk) await chAfk.setPosition(3);

        console.log('🎉 ¡Canal VIP de voz configurado y posicionado perfectamente!');
    } catch (err) {
        console.error('❌ Error creando canal VIP:', err);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
    try {
        const guild = await client.guilds.fetch(config.GUILD_ID);
        await guild.channels.fetch();
        await guild.roles.fetch();
        
        // 1. Subir AFK a 15 minutos (900s) - También se puede 1800 (30m)
        await guild.setAFKTimeout(900);
        console.log('✅ AFK timeout: 15 minutos configurado');
        
        // 2. Arreglar permisos de #chat
        const chat = guild.channels.cache.get('1473002304520060999');
        if (!chat) {
            console.error('❌ Canal de chat no encontrado.');
            process.exit(1);
        }

        const roleStaff = guild.roles.cache.find(r => r.name.includes('Staff'));
        const roleMod = guild.roles.cache.find(r => r.name.includes('Moderador'));
        const roleProphet = guild.roles.cache.find(r => r.name.includes('Prophet') && !r.name.includes('Setup'));
        const roleBots = guild.roles.cache.find(r => r.name.includes('Bots'));
        
        const overwrites = [
            {
                id: guild.id, // @everyone
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AddReactions,
                    PermissionFlagsBits.UseExternalEmojis,
                    PermissionFlagsBits.UseExternalStickers,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.SendVoiceMessages,
                    PermissionFlagsBits.SendPolls,
                    PermissionFlagsBits.UseExternalApps,
                ],
                deny: [
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.MentionEveryone,
                    PermissionFlagsBits.ManageThreads,
                    PermissionFlagsBits.SendTTSMessages,
                    PermissionFlagsBits.CreatePublicThreads,
                    PermissionFlagsBits.CreatePrivateThreads,
                ]
            }
        ];
        
        // Bot Prophet (él mismo)
        overwrites.push({
            id: client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
                PermissionFlagsBits.AddReactions,
            ]
        });
        
        if (roleStaff) {
            overwrites.push({
                id: roleStaff.id,
                allow: [
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.MentionEveryone,
                ]
            });
        }
        if (roleMod) {
            overwrites.push({
                id: roleMod.id,
                allow: [
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.MentionEveryone,
                ]
            });
        }
        if (roleProphet) {
            overwrites.push({
                id: roleProphet.id,
                allow: [
                    PermissionFlagsBits.ManageMessages,
                    PermissionFlagsBits.MentionEveryone,
                ]
            });
        }
        if (roleBots) {
            overwrites.push({
                id: roleBots.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.EmbedLinks,
                    PermissionFlagsBits.AttachFiles,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.AddReactions,
                ]
            });
        }
        
        await chat.permissionOverwrites.set(overwrites);
        console.log('✅ Permisos de #chat actualizados!');
        
    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);

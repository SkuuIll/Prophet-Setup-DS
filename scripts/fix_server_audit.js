// ═══════════════════════════════════════════════════
//  SCRIPT: Arreglar servidor completo
//  - Borrar categoría VOZ duplicada y viejo Crear Sala
//  - Arreglar permisos inseguros de #chat
//  - Configurar AFK oficial
//  - Agregar topics y slowmode
//  - Actualizar DB con nuevos IDs
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
        await guild.channels.fetch();
        await guild.roles.fetch();

        // ═══════════════════════════════════════════
        // 1. BORRAR CATEGORÍA VOZ DUPLICADA
        // ═══════════════════════════════════════════
        console.log('\n═══ 1. LIMPIEZA DE CATEGORÍA DUPLICADA ═══');

        // Vieja categoría y viejo Crear Sala
        const oldCatId = '1473002313756049471';
        const oldCrearSalaId = '1474428292353232987';

        const oldCat = guild.channels.cache.get(oldCatId);
        const oldCrearSala = guild.channels.cache.get(oldCrearSalaId);

        if (oldCrearSala) {
            console.log(`🗑️ Borrando viejo "➕ Crear Sala" (${oldCrearSalaId})...`);
            await oldCrearSala.delete('Limpieza de duplicado').catch(e => console.warn('   ⚠️', e.message));
        }

        if (oldCat) {
            // Verificar si tiene más hijos
            const children = guild.channels.cache.filter(c => c.parentId === oldCatId);
            if (children.size === 0) {
                console.log(`🗑️ Borrando categoría vieja duplicada (${oldCatId})...`);
                await oldCat.delete('Categoría VOZ duplicada').catch(e => console.warn('   ⚠️', e.message));
            } else {
                console.log(`⚠️ Categoría vieja tiene ${children.size} hijos, moviendo a la nueva...`);
                for (const [, ch] of children) {
                    await ch.setParent('1536543965115842610').catch(() => {});
                }
                await oldCat.delete('Categoría VOZ duplicada (hijos migrados)').catch(e => console.warn('   ⚠️', e.message));
            }
        }

        // Actualizar DB con nuevos IDs
        const newCatId = '1536543965115842610';
        const newCrearSalaId = '1536543966642569328';
        stmts.setConfig('voice_category_id', newCatId);
        stmts.setConfig('voice_generator_id', newCrearSalaId);
        console.log(`✅ DB actualizada: category=${newCatId}, generator=${newCrearSalaId}`);

        // ═══════════════════════════════════════════
        // 2. ARREGLAR PERMISOS DE #chat
        // ═══════════════════════════════════════════
        console.log('\n═══ 2. ARREGLO DE PERMISOS EN #chat ═══');

        const chatChannel = guild.channels.cache.get('1473002304520060999');
        if (chatChannel) {
            await chatChannel.permissionOverwrites.set([
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
            ]);
            console.log('✅ Permisos de #chat corregidos (removido ManageMessages, MentionEveryone, etc.)');

            // Agregar slowmode 3s
            await chatChannel.setRateLimitPerUser(3, 'Anti-spam: slowmode 3 segundos');
            console.log('✅ Slowmode 3s aplicado a #chat');
        }

        // ═══════════════════════════════════════════
        // 3. BORRAR CANAL DE REPORTES (si existe)
        // ═══════════════════════════════════════════
        console.log('\n═══ 3. BORRAR REPORTES ═══');
        const reportesChannel = guild.channels.cache.find(c => c.name.includes('reportes'));
        if (reportesChannel) {
            console.log(`🗑️ Borrando #${reportesChannel.name} (${reportesChannel.id})...`);
            await reportesChannel.delete('El usuario no necesita canal de reportes').catch(e => console.warn('   ⚠️', e.message));
            console.log('✅ Canal de reportes eliminado.');
        } else {
            console.log('ℹ️ No hay canal de reportes (ya fue eliminado).');
        }

        // ═══════════════════════════════════════════
        // 4. CONFIGURAR AFK OFICIAL
        // ═══════════════════════════════════════════
        console.log('\n═══ 4. CONFIGURAR AFK ═══');
        const afkChannel = guild.channels.cache.get('1536543973202731008');
        if (afkChannel) {
            try {
                await guild.setAFKChannel(afkChannel.id);
                await guild.setAFKTimeout(300);
                console.log('✅ Canal AFK oficial configurado (5 min timeout)');
            } catch (e) {
                console.warn('⚠️ No se pudo configurar AFK:', e.message);
            }
        }

        // ═══════════════════════════════════════════
        // 5. AGREGAR TOPICS A LOS CANALES
        // ═══════════════════════════════════════════
        console.log('\n═══ 5. TOPICS DESCRIPTIVOS ═══');

        const topics = {
            '1473002296337236153': '👋 Bienvenidas y despedidas de la comunidad',
            '1472401285964890237': '📜 Leé las reglas antes de participar',
            '1472401288682799126': '📢 Anuncios oficiales, directos y novedades',
            '1473002301429125193': '🏅 Niveles, roles desbloqueados y logros',
            '1473088171033100554': '📁 Archivos, descargas y recursos útiles',
            '1473002304520060999': '💬 Charlá con la comunidad · Slowmode 3s',
            '1473002311088607387': '🤖 Usá /help para ver todos los comandos',
        };

        for (const [chId, topic] of Object.entries(topics)) {
            const ch = guild.channels.cache.get(chId);
            if (ch && ch.isTextBased()) {
                await ch.setTopic(topic).catch(e => console.warn(`⚠️ Topic de ${ch.name}:`, e.message));
                console.log(`   ✏️ ${ch.name} → "${topic}"`);
            }
        }

        // ═══════════════════════════════════════════
        // 6. VERIFICAR ESTRUCTURA FINAL
        // ═══════════════════════════════════════════
        console.log('\n═══ 6. ESTRUCTURA FINAL ═══');
        await guild.channels.fetch(); // Refrescar
        const categories = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .sort((a, b) => a.rawPosition - b.rawPosition);

        for (const [id, cat] of categories) {
            console.log(`\n📁 ${cat.name}`);
            const children = guild.channels.cache
                .filter(c => c.parentId === id)
                .sort((a, b) => a.rawPosition - b.rawPosition);
            for (const [, ch] of children) {
                const type = ch.type === ChannelType.GuildVoice ? '🔊' : '#';
                console.log(`   ${type} ${ch.name}`);
            }
        }

        console.log('\n🎉 ¡Auditoría y correcciones completadas con éxito!');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);

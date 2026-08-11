// ═══════════════════════════════════════════════════
//  SCRIPT: Reorganización y Simplificación del Servidor
// ═══════════════════════════════════════════════════

require('dotenv').config({ override: true });
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');
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

        console.log(`🏠 Servidor: ${guild.name} (${guild.id})`);
        await guild.channels.fetch();

        const catInformacionId = '1473002292394459218';
        const catComunidadId = '1473002303068962816';
        const catVozId = '1473002313756049471';
        const catStaffId = '1473002331506343977';
        const catSalasTempId = '1474428290843279393';
        const catVipId = '1473002326615789599';

        const chChatVipId = '1473002306533462048';
        const chVipLobbyId = '1473002328209494119';
        const chCrearSalaId = '1474428292353232987';
        const chAfkId = '1473002324678148207';
        const chStaffVoiceId = '1473002329669369877';

        // 1. Eliminar canal chat-vip
        const chatVip = guild.channels.cache.get(chChatVipId);
        if (chatVip) {
            console.log(`🗑️ Eliminando canal ${chatVip.name}...`);
            await chatVip.delete('Simplificación de canales - chat vip no utilizado');
        }

        // 2. Eliminar canal VIP Lobby
        const vipLobby = guild.channels.cache.get(chVipLobbyId);
        if (vipLobby) {
            console.log(`🗑️ Eliminando canal ${vipLobby.name}...`);
            await vipLobby.delete('Simplificación de canales - VIP lobby no utilizado');
        }

        // 3. Mover "➕ Crear Sala" a categoría VOZ
        const chCrearSala = guild.channels.cache.get(chCrearSalaId);
        if (chCrearSala) {
            console.log(`📦 Moviendo "${chCrearSala.name}" a categoría VOZ...`);
            await chCrearSala.setParent(catVozId, { lockPermissions: false });
            await chCrearSala.setPosition(0);
        }

        // 4. Mover "💤・AFK" a categoría VOZ
        const chAfk = guild.channels.cache.get(chAfkId);
        if (chAfk) {
            console.log(`📦 Moviendo "${chAfk.name}" a categoría VOZ...`);
            await chAfk.setParent(catVozId, { lockPermissions: false });
            await chAfk.setPosition(2);
        }

        // 5. Mover "👑・Staff" (Voz) a categoría STAFF
        const chStaffVoice = guild.channels.cache.get(chStaffVoiceId);
        if (chStaffVoice) {
            console.log(`📦 Moviendo "${chStaffVoice.name}" a categoría STAFF...`);
            await chStaffVoice.setParent(catStaffId, { lockPermissions: false });
            await chStaffVoice.setPosition(1);
        }

        // 6. Eliminar categorías vacías (SALAS TEMPORALES y VIP)
        const catSalasTemp = guild.channels.cache.get(catSalasTempId);
        if (catSalasTemp) {
            console.log(`🗑️ Eliminando categoría ${catSalasTemp.name}...`);
            await catSalasTemp.delete('Simplificación de categorías');
        }

        const catVip = guild.channels.cache.get(catVipId);
        if (catVip) {
            console.log(`🗑️ Eliminando categoría ${catVip.name}...`);
            await catVip.delete('Simplificación de categorías');
        }

        // 7. Actualizar nombre de categoría de Voz para máxima estética
        const catVoz = guild.channels.cache.get(catVozId);
        if (catVoz) {
            console.log(`✨ Renombrando categoría de voz a "⟬🔊⟭ ═══ 𝗦𝗔𝗟𝗔𝗦 𝗗𝗘 𝗩𝗢𝗭 ═══"...`);
            await catVoz.setName('⟬🔊⟭ ═══ 𝗦𝗔𝗟𝗔𝗦 𝗗𝗘 𝗩𝗢𝗭 ═══');
        }

        // 8. Actualizar configuración en base de datos para el creador de salas
        stmts.setConfig('voice_category_id', catVozId);
        stmts.setConfig('voice_generator_id', chCrearSalaId);
        console.log(`💾 Base de datos actualizada: voice_category_id = ${catVozId}`);

        // 9. Reordenar canales en VOZ para que queden estéticos
        const chLobby = guild.channels.cache.get('1473002315546890262');
        if (chCrearSala) await chCrearSala.setPosition(0);
        if (chLobby) await chLobby.setPosition(1);
        if (chAfk) await chAfk.setPosition(2);

        console.log('\n🎉 ¡Reorganización y simplificación completadas con éxito!');
    } catch (err) {
        console.error('❌ Error durante la reorganización:', err);
    } finally {
        client.destroy();
        process.exit(0);
    }
});

client.login(config.TOKEN);

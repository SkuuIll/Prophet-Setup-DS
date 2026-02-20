// ═══════════════════════════════════════════════════
//  PROPHET BOT v2.5 — Entry Point
//  Bot privado para Prophet Gaming
// ═══════════════════════════════════════════════════

const { Client, GatewayIntentBits, Collection, REST, Routes, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// ═══ CREAR CLIENTE ═══
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
    ],
    partials: [
        Partials.Message,
        Partials.Reaction,
        Partials.GuildMember,
    ],
});

// ═══ COLECCIONES ═══
client.commands = new Collection();
client.cooldowns = new Collection();
client.snipes = new Collection();
client.afk = new Collection();

// ═══ CARGAR COMANDOS ═══
function cargarComandos() {
    const carpetas = fs.readdirSync(path.join(__dirname, 'commands'));
    let total = 0;

    for (const carpeta of carpetas) {
        const rutaCarpeta = path.join(__dirname, 'commands', carpeta);
        if (!fs.statSync(rutaCarpeta).isDirectory()) continue;

        const archivos = fs.readdirSync(rutaCarpeta).filter(f => f.endsWith('.js'));
        for (const archivo of archivos) {
            const comando = require(path.join(rutaCarpeta, archivo));
            if (comando.data && comando.execute) {
                client.commands.set(comando.data.name, comando);
                total++;
            }
        }
    }
    console.log(`📦 ${total} comandos cargados`);
}

// ═══ CARGAR EVENTOS ═══
function cargarEventos() {
    const archivos = fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'));
    let total = 0;

    for (const archivo of archivos) {
        const evento = require(path.join(__dirname, 'events', archivo));
        if (evento.once) {
            client.once(evento.name, (...args) => evento.execute(...args, client));
        } else {
            client.on(evento.name, (...args) => evento.execute(...args, client));
        }
        total++;
    }
    console.log(`⚡ ${total} eventos cargados`);
}

// ═══ REGISTRAR SLASH COMMANDS ═══
async function registrarComandos() {
    const commands = [];
    client.commands.forEach(cmd => commands.push(cmd.data.toJSON()));

    const rest = new REST({ version: '10' }).setToken(config.TOKEN);

    try {
        console.log(`🔄 Registrando ${commands.length} slash commands...`);
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.GUILD_ID),
            { body: commands }
        );
        console.log(`✅ ${commands.length} slash commands registrados`);
    } catch (err) {
        console.error('❌ Error registrando commands:', err.message);
        if (err.rawError) console.error('   Detalles:', JSON.stringify(err.rawError, null, 2));
    }
}

// ═══ RESOLVER IDs DE CANALES Y ROLES ═══
async function resolverIDs(guild) {
    await guild.channels.fetch();
    await guild.roles.fetch();

    const buscarCanal = (nombre) => guild.channels.cache.find(c => c.name === nombre);
    const buscarRol = (nombre) => guild.roles.cache.find(r => r.name === nombre);

    // Canales (nuevos nombres del rediseño)
    config.CHANNELS.REGLAS = buscarCanal('📜・reglas')?.id;
    config.CHANNELS.BIENVENIDOS = buscarCanal('👋・bienvenidos')?.id;
    config.CHANNELS.ANUNCIOS = buscarCanal('📢・anuncios')?.id;
    config.CHANNELS.ROLES = buscarCanal('🏷️・roles')?.id;
    config.CHANNELS.CHAT = buscarCanal('💬・chat')?.id;
    config.CHANNELS.CHAT_VIP = buscarCanal('💎・chat-vip')?.id;
    config.CHANNELS.MULTIMEDIA = buscarCanal('🖼️・multimedia')?.id;
    config.CHANNELS.SOPORTE = buscarCanal('❓・soporte')?.id;
    config.CHANNELS.COMANDOS_BOT = buscarCanal('🤖・bot-comandos')?.id;
    config.CHANNELS.STREAMS = buscarCanal('🖥️・streams')?.id;
    config.CHANNELS.LOGS = buscarCanal('⚙️・logs')?.id;

    // Roles
    config.ROLES.PROPHET = buscarRol('👑 Prophet')?.id;
    config.ROLES.STAFF = buscarRol('🛡️ Staff')?.id;
    config.ROLES.MODERADOR = buscarRol('⚔️ Moderador')?.id;
    config.ROLES.VIP = buscarRol('💎 VIP')?.id;
    config.ROLES.VETERANO = buscarRol('🌟 Veterano')?.id;
    config.ROLES.MIEMBRO = buscarRol('👤 Miembro')?.id;
    config.ROLES.NUEVO = buscarRol('🆕 Nuevo')?.id;
    config.ROLES.BOTS = buscarRol('🤖 Bots')?.id;

    console.log('🔗 IDs resueltos:');
    console.log('   Canales:', Object.entries(config.CHANNELS).filter(([, v]) => v).length, '/', Object.keys(config.CHANNELS).length);
    console.log('   Roles:', Object.entries(config.ROLES).filter(([, v]) => v).length, '/', Object.keys(config.ROLES).length);
}


// ═══ INICIO ═══
client.once('ready', async () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`  🤖 Prophet Bot v2.5`);
    console.log(`  📡 ${client.user.tag}`);
    console.log(`  📅 ${new Date().toLocaleString('es-AR')}`);
    console.log('═══════════════════════════════════════');
    console.log('');

    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) {
        console.error('❌ No se encontró el servidor. Verificá GUILD_ID en config.js');
        process.exit(1);
    }

    await resolverIDs(guild);
    await registrarComandos();
    await require('./modules/musicEngine')(client);

    // Iniciar chequeo de sorteos
    const { verificarSorteos } = require('./modules/giveaways');
    setInterval(() => verificarSorteos(client), 30000); // Cada 30 segundos

    // ── Tempban expiry checker (cada 60s) ──
    const { stmts: dbStmts } = require('./database');
    setInterval(async () => {
        try {
            const expired = dbStmts.getActiveTempbans();
            for (const tb of expired) {
                try {
                    const targetGuild = client.guilds.cache.get(tb.guild_id);
                    if (targetGuild) {
                        await targetGuild.members.unban(tb.user_id, 'Tempban expirado - desbaneo automático');
                        console.log(`🔓 Tempban expirado: ${tb.user_id}`);

                        dbStmts.addLog('SYSTEM_UNBAN', { userId: tb.user_id, guildId: tb.guild_id });

                        const logCh = targetGuild.channels.cache.get(config.CHANNELS.LOGS);
                        if (logCh) {
                            const { EmbedBuilder: EB } = require('discord.js');
                            const unbanEmbed = new EB()
                                .setColor(0x69F0AE)
                                .setAuthor({ name: '🔓  Desbaneo automático' })
                                .setDescription(
                                    `> **Usuario:** <@${tb.user_id}> (\`${tb.user_id}\`)\n` +
                                    `> **Ban original:** ${tb.reason || 'Sin razón'}\n` +
                                    `> **Moderador original:** <@${tb.mod_id || 'Desconocido'}>`
                                )
                                .setFooter({ text: 'Prophet  ·  Tempban expirado' })
                                .setTimestamp();
                            logCh.send({ embeds: [unbanEmbed] });
                        }
                    }
                    dbStmts.removeTempban(tb.guild_id, tb.user_id);
                } catch (e) {
                    console.error(`❌ Error desbaneando ${tb.user_id}:`, e.message);
                    dbStmts.removeTempban(tb.guild_id, tb.user_id);
                }
            }
        } catch (e) { console.error('❌ Error en tempban checker:', e.message); }
    }, 60000);

    // 🎂 Comprobador de cumpleaños (Todos los días a las 00:00)
    const schedule = require('node-schedule');
    schedule.scheduleJob('0 0 * * *', async () => {
        try {
            // Obtener el día y mes actual (formato DD/MM)
            const hoy = new Date();
            const dia = String(hoy.getDate()).padStart(2, '0');
            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
            const fechaString = `${dia}/${mes}`;

            const cumplenHoy = dbStmts.getTodayBirthdays(fechaString);
            if (cumplenHoy.length > 0) {
                const chatGeneral = guild.channels.cache.get(config.CHANNELS.CHAT);
                const rolCumple = guild.roles.cache.find(r => r.name.toLowerCase().includes('cumple'));

                if (chatGeneral) {
                    let menciones = cumplanHoy.map(c => `<@${c.id}>`).join(', ');
                    const embed = new EmbedBuilder()
                        .setColor(config.COLORES.EXITO || 0xFF1493)
                        .setTitle('🎉 ¡Día de Cumpleaños! 🎉')
                        .setDescription(`Hoy es el cumpleaños de ${menciones}. ¡Deseenles un muy feliz día de parte de toda la familia Prophet! 🎂🎁`)
                        .setImage('https://media.tenor.com/2Pz2yB_6kL0AAAAC/happy-birthday.gif');

                    await chatGeneral.send({ content: '@everyone', embeds: [embed] });
                }

                if (rolCumple) {
                    for (const row of cumplenHoy) {
                        try {
                            const member = await guild.members.fetch(row.id);
                            if (member) {
                                await member.roles.add(rolCumple, 'Cumpleañero del día');
                                // Quitarlo a las 23:59
                                setTimeout(() => member.roles.remove(rolCumple, 'Pasó su cumpleaños').catch(() => { }), 86340000);
                            }
                        } catch (e) { }
                    }
                }
            }
        } catch (e) {
            console.error('Error procesando cumpleaños:', e);
        }
    });

    console.log('');
    console.log('✅ Prophet Bot está listo');
    console.log(`🏠 Servidor: ${guild.name} (${guild.memberCount} miembros)`);
    console.log('');

    client.user.setActivity('Prophet Gaming 🎮', { type: 3 }); // "Watching"

    dbStmts.addLog('SYSTEM_BOOT', { version: '2.5.0', message: 'Prophet Bot iniciado correctamente' });
});

// Cargar todo
cargarComandos();
cargarEventos();

// Manejo de errores global
process.on('unhandledRejection', (err) => {
    console.error('❌ Error no manejado:', err.message);
});

process.on('uncaughtException', (err) => {
    console.error('💀 Error fatal:', err.message);
    console.error(err.stack);
});

// Validaciones Iniciales
if (!config.TOKEN) {
    console.error('❌ FATAL: No se proporcionó el TOKEN en el archivo .env o config.js');
    process.exit(1);
}
if (!config.GUILD_ID) {
    console.error('❌ FATAL: No se configuró el GUILD_ID en config.js');
    process.exit(1);
}

// Login
client.login(config.TOKEN).catch(err => {
    console.error('❌ Error de login:', err.message);
    process.exit(1);
});

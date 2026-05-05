// ═══════════════════════════════════════════════════
//  PROPHET BOT v2.9 — Entry Point
//  Bot privado para Prophet Gaming
//  Última revisión: Marzo 2026
// ═══════════════════════════════════════════════════

const { Client, GatewayIntentBits, Collection, REST, Routes, Partials, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const config = require('./config');
const { startDashboardServer } = require('./web/secureServer');
const { captureChannelBaseValues, applyChannelOverridesToConfig } = require('./utils/runtimeConfig');

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

// ═══ SISTEMA ANTI-RAID ═══
const { AntiRaidManager } = require('discord-antiraid');
client.antiraid = new AntiRaidManager(client, {
    rateLimit: 5,        // Uniones permitidas en el tiempo
    time: 10000,         // Tiempo en milisegundos (10 segundos)
    ban: true,           // Banear si hay raid
    kick: false,
    unrank: false,
    exemptMembers: [],
    exemptRoles: [],
    exemptEvent: [],
    reason: "Prophet: Auto-Ban por Raid"
});

client.antiraid.on("punish", (member, reason, sanction) => {
    const logCh = member.guild.channels.cache.get(config.CHANNELS.LOGS);
    if (logCh) {
        logCh.send(`🚨 **Sistema Anti-Raid Activado**\n> Usuario: \`${member.user.tag}\` (${member.id})\n> Acción: \`${sanction}\`\n> Razón: \`${reason}\``);
    }
});

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

    const resolverCanal = (value) => guild.channels.cache.get(value) || guild.channels.cache.find(channel => channel.name === value);
    const resolverRol = (value) => guild.roles.cache.get(value) || guild.roles.cache.find(role => role.name === value);

    for (const [key, value] of Object.entries({ ...config.CHANNELS })) {
        const channel = resolverCanal(value);
        if (channel) config.CHANNELS[key] = channel.id;
    }

    for (const [key, value] of Object.entries({ ...config.ROLES })) {
        const role = resolverRol(value);
        if (role) config.ROLES[key] = role.id;
    }

    console.log('🔗 IDs resueltos:');
    console.log('   Canales:', Object.values(config.CHANNELS).filter(value => guild.channels.cache.has(value)).length, '/', Object.keys(config.CHANNELS).length);
    console.log('   Roles:', Object.values(config.ROLES).filter(value => guild.roles.cache.has(value)).length, '/', Object.keys(config.ROLES).length);
}

function startProtectedInterval(name, job, intervalMs) {
    let running = false;
    const { stmts } = require('./database');

    stmts.setHealthCheck(`job:${name}`, {
        status: 'idle',
        details: {
            intervalMs,
            message: 'Programado, pendiente de primera ejecución'
        }
    });

    return setInterval(async () => {
        if (running) {
            console.warn(`⏱️ [${name}] ejecución omitida por solapamiento`);
            stmts.incrementAnalyticsMetric('job_overlaps', name, 1);
            stmts.setHealthCheck(`job:${name}`, {
                status: 'warn',
                details: {
                    intervalMs,
                    message: 'Ejecución omitida por solapamiento'
                }
            });
            return;
        }

        running = true;
        const startedAt = Date.now();
        try {
            await job();
            const durationMs = Date.now() - startedAt;
            stmts.incrementAnalyticsMetric('job_runs', name, 1);
            stmts.setHealthCheck(`job:${name}`, {
                status: 'ok',
                durationMs,
                details: { intervalMs }
            });
        } catch (error) {
            const durationMs = Date.now() - startedAt;
            console.error(`❌ [${name}] ${error.message}`);
            stmts.incrementAnalyticsMetric('job_failures', name, 1);
            stmts.incrementAnalyticsMetric('error_events', `job:${name}`, 1);
            stmts.setHealthCheck(`job:${name}`, {
                status: 'error',
                durationMs,
                details: {
                    intervalMs,
                    message: error.message,
                }
            });
        } finally {
            running = false;
        }
    }, intervalMs);
}

// ═══ INICIO ═══
client.once('clientReady', async () => {
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log(`  🤖 Prophet Bot v2.9`);
    console.log(`  📡 ${client.user.tag}`);
    console.log(`  📅 ${new Date().toLocaleString('es-AR')}`);
    console.log(`  🟢 Node.js ${process.version}`);
    console.log('═══════════════════════════════════════');
    console.log('');

    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) {
        console.error('❌ No se encontró el servidor. Verificá GUILD_ID en config.js');
        process.exit(1);
    }

    await resolverIDs(guild);
    captureChannelBaseValues();
    applyChannelOverridesToConfig();
    await registrarComandos();

    // Inicializar sistema de perfiles avanzados
    const { initializeProfileSystem } = require('./modules/profileSystem');
    initializeProfileSystem();

    await require('./modules/musicEngine')(client);
    // Shoukaku ya se inicializó antes del login (ver abajo)

    // ── Limpiar canales de voz temporales huérfanos al reiniciar ──
    const { stmts: dbStmts } = require('./database');
    try {
        const tempChannels = dbStmts.getTempChannels(guild.id);
        for (const tc of tempChannels) {
            const ch = guild.channels.cache.get(tc.channel_id);
            if (!ch || ch.members.size === 0) {
                if (ch) ch.delete('Canal de voz temporal vacío (limpieza al boot)').catch(() => { });
                dbStmts.removeTempChannel(tc.channel_id);
                console.log(`🗑️  Canal temporal huérfano eliminado: ${tc.channel_id}`);
            }
        }
        if (tempChannels.length > 0) console.log(`🔊 ${tempChannels.length} canales temporales verificados al boot`);
    } catch (e) { console.error('❌ Error limpiando canales temporales al boot:', e.message); }

    const { loadPendingReminders } = require('./modules/reminders');
    const remindersLoaded = loadPendingReminders(client);
    if (remindersLoaded > 0) {
        console.log(`⏰ ${remindersLoaded} recordatorios rehidratados desde SQLite`);
    }

    // Iniciar chequeo de sorteos
    const { verificarSorteos } = require('./modules/giveaways');
    startProtectedInterval('sorteos', () => verificarSorteos(client), 30000);

    // ── Notificaciones: Twitch / YouTube / GitHub / GameServers ──
    const { verificarTwitch } = require('./modules/twitchMonitor');
    const { verificarYoutube } = require('./modules/youtubeMonitor');
    const { verificarGithub } = require('./modules/githubMonitor');
    const { verificarServidores } = require('./modules/gameServerMonitor');

    startProtectedInterval('monitor-twitch', () => verificarTwitch(client), 2 * 60 * 1000);
    startProtectedInterval('monitor-youtube', () => verificarYoutube(client), 10 * 60 * 1000);
    startProtectedInterval('monitor-github', () => verificarGithub(client), 15 * 60 * 1000);
    startProtectedInterval('monitor-servidores', () => verificarServidores(client), 3 * 60 * 1000);
    console.log('📡 Monitores iniciados: Twitch (2min) · YouTube (10min) · GitHub (15min) · GameServer (3min)');

    // ── Auto-update yt-dlp al iniciar y semanalmente ──
    const { exec } = require('child_process');
    function actualizarYtdlp() {
        exec('yt-dlp -U', { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) {
                console.warn('⚠️  yt-dlp update falló:', err.message);
            } else {
                const output = (stdout || stderr || '').trim().split('\n').pop();
                console.log(`📦 yt-dlp: ${output}`);
            }
        });
    }
    actualizarYtdlp(); // al iniciar
    setInterval(actualizarYtdlp, 7 * 24 * 60 * 60 * 1000); // cada semana

    // ── Backup diario de SQLite (04:00 UTC = 01:00 ARG) ──
    schedule.scheduleJob('0 4 * * *', () => {
        try {
            const srcPath = path.join(__dirname, 'data', 'prophet.sqlite');
            const backupDir = path.join(__dirname, 'data', 'backups');
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

            const fecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const destPath = path.join(backupDir, `prophet_${fecha}.sqlite`);

            // Usar el backup API de better-sqlite3 (copia segura sin corromper)
            const { _db } = require('./database');
            _db.backup(destPath).then(() => {
                console.log(`💾 Backup SQLite creado: ${destPath}`);

                // Borrar backups de más de 7 días
                const archivos = fs.readdirSync(backupDir).filter(f => f.startsWith('prophet_') && f.endsWith('.sqlite'));
                const hace7dias = Date.now() - 7 * 24 * 60 * 60 * 1000;
                for (const archivo of archivos) {
                    const filePath = path.join(backupDir, archivo);
                    const stat = fs.statSync(filePath);
                    if (stat.mtimeMs < hace7dias) {
                        fs.unlinkSync(filePath);
                        console.log(`🗑️  Backup viejo eliminado: ${archivo}`);
                    }
                }
            }).catch(e => console.error('❌ Error en backup SQLite:', e.message));
        } catch (e) {
            console.error('❌ Error en sistema de backup:', e.message);
        }
    });
    console.log('💾 Backup SQLite programado: 04:00 UTC diario (retención 7 días)');

    // ── Limpieza mensual de warns viejos (+6 meses) ──
    schedule.scheduleJob('0 5 1 * *', () => {  // 1ero de cada mes a las 05:00 UTC
        try {
            const { _db } = require('./database');
            const hace6meses = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
            const result = _db.prepare('DELETE FROM warns WHERE created_at < ?').run(hace6meses);
            if (result.changes > 0) {
                console.log(`🧹 ${result.changes} warns viejos (+6 meses) limpiados automáticamente`);
            }
        } catch (e) {
            console.error('❌ Error limpiando warns:', e.message);
        }
    });

    // ── Tempban expiry checker (cada 60s) ──
    // (dbStmts ya fue declarado arriba)
    startProtectedInterval('tempban-checker', async () => {
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
    }, 60000);

    // 🎂 Comprobador de cumpleaños (Todos los días a las 00:00)
    // ── Reseteo DIARIO de claims diarios (midnight ARG) ──
    schedule.scheduleJob('0 3 * * *', async () => { // 00:00 Argentina (UTC-3) = 03:00 UTC
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
                    let menciones = cumplenHoy.map(c => `<@${c.id}>`).join(', ');
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

    dbStmts.addLog('SYSTEM_BOOT', { version: '2.6.0', message: 'Prophet Bot iniciado correctamente' });

    // ── Resumen técnico diario automático (09:00 ARG = 12:00 UTC) ──
    // DESACTIVADO POR PETICIÓN DEL USUARIO
    // const { sendDailySummary } = require('./web/dashboardState');
    // schedule.scheduleJob('0 12 * * *', async () => {
    //     try {
    //         const result = await sendDailySummary(client);
    //         if (result.success) {
    //             console.log('📊 Resumen técnico diario enviado automáticamente');
    //         } else {
    //             console.warn('⚠️ No se pudo enviar resumen técnico diario:', result.error);
    //         }
    //     } catch (e) {
    //         console.error('❌ Error enviando resumen técnico diario:', e.message);
    //     }
    // });
    // console.log('📊 Resumen técnico diario programado: 09:00 Argentina (12:00 UTC)');

    // ── Heartbeat periódico para monitoreo (cada 6 horas) ──
    startProtectedInterval('heartbeat', async () => {
        const mem = process.memoryUsage();
        const uptime = Math.floor(process.uptime() / 3600);
        console.log(`💓 Heartbeat | Uptime: ${uptime}h | RAM: ${Math.round(mem.rss / 1024 / 1024)}MB | Guilds: ${client.guilds.cache.size} | Canales IA: ${require('./modules/aiChat').getContextStats().canalesActivos}`);
    }, 6 * 60 * 60 * 1000);
});

// Cargar todo
cargarComandos();
cargarEventos();

let shuttingDown = false;
let dashboardServer = null;

// Manejo de errores global
process.on('unhandledRejection', (err) => {
    try {
        const { stmts } = require('./database');
        stmts.incrementAnalyticsMetric('error_events', 'unhandledRejection', 1);
        stmts.setHealthCheck('system:unhandledRejection', {
            status: 'error',
            details: { message: err?.message || String(err) }
        });
    } catch { }
    console.error('❌ Error no manejado:', err?.message || err);
    if (err?.stack) console.error('   Stack:', err.stack.split('\n').slice(0, 3).join('\n'));
});

process.on('uncaughtException', (err) => {
    try {
        const { stmts } = require('./database');
        stmts.incrementAnalyticsMetric('error_events', 'uncaughtException', 1);
        stmts.setHealthCheck('system:uncaughtException', {
            status: 'error',
            details: { message: err.message }
        });
    } catch { }
    console.error('💀 Error fatal:', err.message);
    if (err?.stack) console.error(err.stack);
    shutdown('uncaughtException', 1).catch(() => process.exit(1));
});

// ═══ GRACEFUL SHUTDOWN ═══
async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n🛑 Recibida señal ${signal}. Apagando bot...`);
    try {
        if (dashboardServer) {
            await new Promise(resolve => dashboardServer.close(resolve));
            console.log('🌐 Dashboard interno cerrado');
        }
    } catch (e) { }
    try {
        const db = require('./database');
        if (db._db) {
            db._db.close();
            console.log('💾 Base de datos cerrada correctamente');
        }
    } catch (e) { }
    try {
        client.destroy();
        console.log('🔌 Cliente de Discord desconectado');
    } catch (e) { }
    console.log('👋 Prophet Bot apagado correctamente');
    process.exit(exitCode);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Validaciones Iniciales
const { errors: configErrors, warnings: configWarnings } = config.validateConfig();
configWarnings.forEach(warning => console.warn(`⚠️ Config: ${warning}`));

if (configErrors.length > 0) {
    configErrors.forEach(error => console.error(`❌ FATAL: ${error}`));
    process.exit(1);
}

startDashboardServer(client)
    .then(server => {
        dashboardServer = server;
    })
    .catch(error => {
        console.error('❌ Error iniciando dashboard:', error.message);
        process.exit(1);
    });

// ═══ INICIALIZAR SHOUKAKU ANTES DEL LOGIN ═══
// CRITICO: Shoukaku necesita interceptar paquetes raw del gateway
// desde el momento en que el bot hace login. Si se crea después,
// el conector pierde el handshake y nunca conecta al nodo Lavalink.
const { crearShoukaku } = require('./modules/shoukakuEngine');
crearShoukaku(client);

// Login
client.login(config.TOKEN).catch(err => {
    console.error('❌ Error de login:', err.message);
    process.exit(1);
});

// ═══ COMANDO: /ayuda — Centro de Ayuda Prophet Bot v2.9 ═══

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const config = require('../../config');

// ═══ DATOS DE CATEGORÍAS ═══
const CATEGORIES = {
    home: {
        emoji: '🏠',
        label: 'Inicio',
        menuLabel: 'Volver al inicio',
        description: 'Página principal'
    },
    quickstart: {
        emoji: '🚀',
        label: 'Empezar Aquí',
        menuLabel: 'Guía para nuevos',
        description: 'Primeros pasos en el servidor'
    },
    economy: {
        emoji: '💰',
        label: 'Economía',
        menuLabel: 'Economía y Tienda',
        description: 'Ganar y gastar monedas',
        commands: 10
    },
    music: {
        emoji: '🎵',
        label: 'Música',
        menuLabel: 'Música DJ',
        description: 'Reproducir música en voz',
        commands: 10
    },
    fun: {
        emoji: '🎮',
        label: 'Diversión',
        menuLabel: 'Juegos y Diversión',
        description: 'Mini-juegos y social',
        commands: 10
    },
    gaming: {
        emoji: '🎯',
        label: 'Gaming Stats',
        menuLabel: 'Stats de Juegos',
        description: 'PUBG, CS2 y más',
        commands: 2
    },
    levels: {
        emoji: '📈',
        label: 'Niveles',
        menuLabel: 'Niveles y XP',
        description: 'Sistema de progresión',
        commands: 2
    },
    utility: {
        emoji: '🔧',
        label: 'Utilidades',
        menuLabel: 'Utilidades',
        description: 'Herramientas varias',
        commands: 24
    },
    profile: {
        emoji: '👤',
        label: 'Perfil y Misiones',
        menuLabel: 'Perfil, Badges y Misiones',
        description: 'Tu progreso y logros',
        commands: 5
    },
    moderation: {
        emoji: '🛡️',
        label: 'Moderación',
        menuLabel: 'Moderación (Staff)',
        description: 'Solo para Staff',
        commands: 9
    },
    admin: {
        emoji: '⚙️',
        label: 'Admin',
        menuLabel: 'Administración',
        description: 'Configuración del server',
        commands: 12
    },
};

// ═══ GENERADORES DE EMBEDS ═══

function buildHomeEmbed(interaction) {
    const ping = Math.round(interaction.client.ws.ping);
    const pingEmoji = ping < 150 ? '🟢' : ping < 350 ? '🟡' : '🔴';
    const totalCmds = interaction.client.commands.size;
    const uptime = process.uptime();
    const dias = Math.floor(uptime / 86400);
    const horas = Math.floor((uptime % 86400) / 3600);
    const uptimeStr = dias > 0 ? `${dias}d ${horas}h` : `${horas}h`;

    return new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL)
        .setAuthor({ name: 'Prophet Bot  ·  Centro de Ayuda', iconURL: interaction.client.user.displayAvatarURL() })
        .setDescription(
            `¡Hola **${interaction.user.username}**! 👋\n\n` +
            `Soy el bot oficial de **Prophet Gaming**. Acá podés encontrar todo lo que necesitás saber sobre mis funciones.\n\n` +

            `> 🚀 **¿Primera vez?** Seleccioná **"Empezar Aquí"** en el menú\n` +
            `> 📂 **¿Buscás algo específico?** Elegí una categoría abajo\n\n` +

            `**Categorías disponibles:**\n` +
            `> 💰 Economía  ·  🎵 Música  ·  🎮 Diversión\n` +
            `> 🎯 Gaming Stats  ·  📈 Niveles  ·  👤 Perfil\n` +
            `> 🔧 Utilidades  ·  🛡️ Moderación  ·  ⚙️ Admin\n\n` +

            `\`\`\`\n` +
            `📋 ${totalCmds} Comandos  ·  ${pingEmoji} ${ping}ms  ·  ⏱️ ${uptimeStr}  ·  👥 ${interaction.guild.memberCount}\n` +
            `\`\`\``
        )
        .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Usá el menú de abajo para navegar  ·  Expira en 5 min' })
        .setTimestamp();
}

function buildQuickstartEmbed() {
    return new EmbedBuilder()
        .setColor(0x69F0AE)
        .setAuthor({ name: '🚀  Guía Rápida — Tus Primeros Pasos' })
        .setDescription(
            'Bienvenido a Prophet Gaming. Acá tenés lo esencial para arrancar:\n\n' +

            '**1️⃣ Empezá a ganar monedas**\n' +
            '> Usá `/daily` una vez al día para recibir tu recompensa gratis.\n' +
            '> Después usá `/work` cada 30 minutos para ganar más.\n' +
            '> Con las monedas podés comprar **roles exclusivos** en `/shop`.\n\n' +

            '**2️⃣ Subí de nivel hablando**\n' +
            '> Cada mensaje que enviás te da XP automáticamente.\n' +
            '> Al subir de nivel, desbloqueás roles nuevos (hay 9 niveles de rol).\n' +
            '> Mirá tu progreso con `/nivel` y el ranking con `/top`.\n\n' +

            '**3️⃣ Escuchá música en voz**\n' +
            '> Entrá a un canal de voz y usá `/play <canción>`.\n' +
            '> Funciona con YouTube, Spotify y más. Controlá todo con botones.\n\n' +

            '**4️⃣ Completá misiones diarias**\n' +
            '> Cada día tenés misiones nuevas. Mirá las tuyas con `/misiones`.\n' +
            '> Completarlas te da XP, monedas y badges exclusivos.\n\n' +

            '**5️⃣ Personalizá tu perfil**\n' +
            '> Usá `/perfil` para ver tu tarjeta y `/cumple DD/MM` para agendar tu cumpleaños.\n' +
            '> El bot te felicita automáticamente y te da un rol especial ese día.\n\n' +

            '**6️⃣ Funciones útiles del día a día**\n' +
            '> `/recordatorio 2h Hacer algo` — Te avisa por DM\n' +
            '> `/afk Comiendo` — Le avisa a los que te mencionen\n' +
            '> `@ProphetBot <pregunta>` — Preguntale lo que sea a la IA del bot'
        )
        .setFooter({ text: 'Tip: Elegí otra categoría del menú para ver todos los comandos' })
        .setTimestamp();
}

function buildEconomyEmbed() {
    return new EmbedBuilder()
        .setColor(0xFFD700)
        .setAuthor({ name: '💰  Economía Prophet' })
        .setDescription(
            'Ganá monedas, ahorrá en el banco, comprá roles y competí con otros.\n'
        )
        .addFields(
            {
                name: '💵 Ganar dinero',
                value:
                    '`/daily` — Recompensa diaria (**100-500** monedas, cada 24h)\n' +
                    '`/work` — Trabajar (**50-300** monedas, cada 30min)\n' +
                    '`/gamble <cantidad>` — Apostar al doble o nada (50/50)',
                inline: false
            },
            {
                name: '🏦 Banco y transferencias',
                value:
                    '`/balance` — Ver tu saldo (efectivo + banco)\n' +
                    '`/deposit <cantidad|todo>` — Guardar en el banco\n' +
                    '`/withdraw <cantidad|todo>` — Sacar del banco\n' +
                    '`/pay <usuario> <cantidad>` — Transferir a otro',
                inline: false
            },
            {
                name: '🛒 Tienda y rankings',
                value:
                    '`/shop` — Comprar roles exclusivos con monedas\n' +
                    '`/inventory` — Ver tus items comprados\n' +
                    '`/ecotop` — Ranking de los más ricos del server',
                inline: false
            },
            {
                name: '💡 Tips',
                value:
                    '> • Guardá tus monedas en el banco para no arriesgarlas\n' +
                    '> • El `/daily` da bonus si tenés racha de días seguidos\n' +
                    '> • Click derecho en un usuario → "Dar Coins" para transfer rápido',
                inline: false
            }
        )
        .setFooter({ text: '10 comandos  ·  Economía' })
        .setTimestamp();
}

function buildMusicEmbed() {
    return new EmbedBuilder()
        .setColor(config.COLORES.MUSICA || 0xBB86FC)
        .setAuthor({ name: '🎵  Música — Prophet DJ' })
        .setDescription(
            'Reproducí música en el canal de voz con calidad premium.\n'
        )
        .addFields(
            {
                name: '▶️ Reproducción',
                value:
                    '`/play <canción o URL>` — Buscar y reproducir\n' +
                    '`/queue` — Ver la cola de canciones\n' +
                    '`/volumen <1-100>` — Ajustar volumen actual',
                inline: false
            },
            {
                name: '🎛️ Controles',
                value:
                    '`/pause` — Pausar / reanudar\n' +
                    '`/skip` — Saltar canción\n' +
                    '`/stop` — Detener y desconectar\n' +
                    '`/volumen <1-100>` — Ajustar volumen\n' +
                    '`/loop` — Repetir canción o cola\n' +
                    '`/shuffle` — Mezclar la cola\n' +
                    '`/filter <filtro>` — Bassboost, nightcore, etc.',
                inline: false
            },
            {
                name: '🖱️ Panel interactivo',
                value:
                    '> Cuando el bot reproduce, aparecen **botones** debajo del\n' +
                    '> reproductor para controlar todo sin escribir comandos:\n' +
                    '> ⏮️ ⏯️ ⏭️ ⏹️ 🔁 🔀 🔉 🔊 📋',
                inline: false
            },
            {
                name: '🌐 Plataformas',
                value: '> YouTube · Spotify · SoundCloud · Apple Music · Vimeo',
                inline: false
            }
        )
        .setFooter({ text: '10 comandos + panel interactivo  ·  Música' })
        .setTimestamp();
}

function buildFunEmbed() {
    return new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL)
        .setAuthor({ name: '🎮  Juegos y Diversión' })
        .setDescription('Mini-juegos y herramientas sociales para pasarla bien.\n')
        .addFields(
            {
                name: '🕹️ Mini-juegos',
                value:
                    '`/tictactoe <usuario>` — Ta-Te-Ti contra otro jugador\n' +
                    '`/blackjack <apuesta>` — Blackjack 21 interactivo\n' +
                    '`/rps` — Piedra, papel o tijera vs bot\n' +
                    '`/coinflip` — Tirar una moneda\n' +
                    '`/8ball <pregunta>` — La bola mágica responde',
                inline: false
            },
            {
                name: '📸 Social y diversión',
                value:
                    '`/avatar [usuario]` — Ver avatar en alta resolución\n' +
                    '`/confesion` — Enviar confesión anónima al server\n' +
                    '`/meme` — Meme random de Reddit\n' +
                    '`/cartel <texto>` — Generar cartel customizado\n' +
                    '`/buscar-grupo` — Buscar gente para jugar (LFG)',
                inline: false
            },
            {
                name: '🔢 Juego de contar',
                value:
                    '> Hay un canal especial donde el objetivo es contar de 1 en 1.\n' +
                    '> No podés repetir dos veces seguidas. ¡Celebración cada 100!',
                inline: false
            }
        )
        .setFooter({ text: '10+ comandos  ·  Diversión' })
        .setTimestamp();
}

function buildGamingEmbed() {
    return new EmbedBuilder()
        .setColor(0xF2A900)
        .setAuthor({ name: '🎯  Gaming Stats' })
        .setDescription('Consultá tus estadísticas directamente desde Discord.\n')
        .addFields(
            {
                name: '🔫 PUBG',
                value:
                    '`/pubg <nombre> [plataforma] [modo]`\n' +
                    '> Muestra K/D, wins, headshots, daño promedio y más.\n' +
                    '> Plataformas: Steam, PlayStation, Xbox\n' +
                    '> Modos: Solo / Duo / Squad (FPP y TPP)\n' +
                    '> ⚠️ El nombre es **case-sensitive** (mayúsculas importan)',
                inline: false
            },
            {
                name: '💥 Counter-Strike 2',
                value:
                    '`/cs2 <steamid>`\n' +
                    '> Muestra K/D, win rate, HS%, daño por ronda y ranking.\n' +
                    '> Usá tu Steam64 ID o URL del perfil.',
                inline: false
            },
            {
                name: '🎮 Steam',
                value:
                    '`/steam <perfil>`\n' +
                    '> Info de tu cuenta: juegos, horas, estado online.',
                inline: false
            },
            {
                name: '💡 Importante',
                value: '> Los datos se cachean **5 minutos** para cumplir con los límites de las APIs.',
                inline: false
            }
        )
        .setFooter({ text: '3 comandos  ·  Gaming Stats' })
        .setTimestamp();
}

function buildLevelsEmbed() {
    return new EmbedBuilder()
        .setColor(config.COLORES.NIVEL || 0x69F0AE)
        .setAuthor({ name: '📈  Sistema de Niveles y XP' })
        .setDescription('Subí de nivel participando. Cada mensaje y cada minuto en voz cuenta.\n')
        .addFields(
            {
                name: '📊 Comandos',
                value:
                    '`/nivel [usuario]` — Ver nivel, XP y progreso\n' +
                    '`/top` — Ranking de usuarios más activos',
                inline: false
            },
            {
                name: '⚡ ¿Cómo funciona?',
                value:
                    `> 💬 Ganás **${config.NIVELES.XP_MIN}-${config.NIVELES.XP_MAX} XP** por mensaje (cooldown: ${config.NIVELES.COOLDOWN / 1000}s)\n` +
                    `> 🎙️ Ganás **${config.NIVELES.VOICE_XP_POR_MINUTO} XP/min** en canales de voz\n` +
                    '> 🛡️ Anti-abuso: No cuenta si estás solo, muteado, o en canal AFK',
                inline: false
            },
            {
                name: '🏅 Roles automáticos por nivel',
                value:
                    '```\n' +
                    Object.entries(config.NIVELES.ROLES_POR_NIVEL)
                        .map(([lvl, role]) => ` Nv.${String(lvl).padStart(4)}  →  ${role}`)
                        .join('\n') +
                    '\n```',
                inline: false
            }
        )
        .setFooter({ text: '2 comandos + 9 roles automáticos  ·  Niveles' })
        .setTimestamp();
}

function buildProfileEmbed() {
    return new EmbedBuilder()
        .setColor(0xBB86FC)
        .setAuthor({ name: '👤  Perfil, Badges y Misiones' })
        .setDescription('Tu progresión personal: badges, achievements, rachas y misiones diarias.\n')
        .addFields(
            {
                name: '🪪 Tu perfil',
                value:
                    '`/perfil [usuario]` — Ver tarjeta con stats, badges y nivel\n' +
                    '`/reputacion dar <usuario>` — Dar rep a alguien (1 vez por día)\n' +
                    '`/reputacion ver [usuario]` — Ver reputación\n' +
                    '`/reputacion top` — Ranking de reputación',
                inline: false
            },
            {
                name: '🎯 Misiones diarias',
                value:
                    '`/misiones` — Ver misiones del día y cómo completarlas\n' +
                    '> Cada día se asignan misiones nuevas automáticamente.\n' +
                    '> Completarlas te da XP extra, monedas y badges únicos.\n' +
                    '> Tipos: enviar mensajes, usar comandos, estar en voz, etc.',
                inline: false
            },
            {
                name: '🏆 Badges y Achievements',
                value:
                    '> Se desbloquean automáticamente al cumplir ciertos hitos:\n' +
                    '> 📨 Mensajes enviados · ⌨️ Comandos usados · ⭐ Reputación\n' +
                    '> 🎙️ Minutos en voz · 🔥 Rachas de mensajes · 📋 Misiones',
                inline: false
            },
            {
                name: '⚙️ Personalización',
                value:
                    '`/preferencias` — Cambiar tema, idioma, zona horaria, notificaciones\n' +
                    '`/cumple <DD/MM>` — Agendar tu cumpleaños (rol + saludo automático)',
                inline: false
            }
        )
        .setFooter({ text: '5+ comandos  ·  Perfil y Progresión' })
        .setTimestamp();
}

function buildUtilityEmbed() {
    return new EmbedBuilder()
        .setColor(config.COLORES.INFO || 0x42A5F5)
        .setAuthor({ name: '🔧  Utilidades' })
        .setDescription('Herramientas útiles para el día a día en el servidor.\n')
        .addFields(
            {
                name: '📡 Información',
                value:
                    '`/ping` — Latencia y estado del bot\n' +
                    '`/userinfo [usuario]` — Info de una cuenta\n' +
                    '`/hora [zona]` — Hora actual en distintas zonas',
                inline: true
            },
            {
                name: '💬 Social',
                value:
                    '`/afk [motivo]` — Ponerte AFK\n' +
                    '`/snipe` — Ver último mensaje borrado\n' +
                    '`/suggest <idea>` — Sugerencia con votación',
                inline: true
            },
            {
                name: '\u200b',
                value: '\u200b',
                inline: true
            },
            {
                name: '⏰ Recordatorios',
                value:
                    '`/recordatorio <tiempo> <mensaje>`\n' +
                    '> Ejemplo: `/recordatorio 2h Sacar la pizza`\n' +
                    '> Te avisa por DM cuando se cumple el tiempo.',
                inline: false
            },
            {
                name: '🛠️ Herramientas',
                value:
                    '`/calculadora <expresión>` — Calculadora científica\n' +
                    '`/traductor <texto> <idioma>` — 10 idiomas con auto-detect\n' +
                    '`/definir <palabra>` — Diccionario ES/EN\n' +
                    '`/contraseña [largo]` — Generar password seguro\n' +
                    '`/clima <ciudad>` — Clima actual y pronóstico',
                inline: false
            },
            {
                name: '📊 Interactivos',
                value:
                    '`/encuesta <pregunta>` — Encuesta rápida con reacciones\n' +
                    '`/sorteo <premio> <duración>` — Giveaway automático\n' +
                    '`/embed` — Crear mensajes embed customizados\n' +
                    '`/reporte <usuario>` — Reportar anónimamente al Staff',
                inline: false
            },
            {
                name: '📋 Organización personal',
                value:
                    '`/lista` — Listas de tareas con checkbox y prioridades\n' +
                    '`/notas` — Notas privadas con categorías y búsqueda',
                inline: false
            }
        )
        .setFooter({ text: '24 comandos  ·  Utilidades' })
        .setTimestamp();
}

function buildModerationEmbed() {
    return new EmbedBuilder()
        .setColor(config.COLORES.MODERACION || 0xEF5350)
        .setAuthor({ name: '🛡️  Moderación — Solo Staff' })
        .setDescription('Herramientas de moderación para el equipo de Staff.\n')
        .addFields(
            {
                name: '⚖️ Sanciones',
                value:
                    '`/ban <usuario> [razón]` — Ban permanente\n' +
                    '`/tempban <usuario> <duración> [razón]` — Ban temporal (desbaneo auto)\n' +
                    '`/kick <usuario> [razón]` — Expulsar del servidor\n' +
                    '`/mute <usuario> <minutos> [razón]` — Silenciar temporalmente',
                inline: false
            },
            {
                name: '⚠️ Advertencias',
                value:
                    '`/warn <usuario> <razón>` — Emitir advertencia\n' +
                    '`/warns <usuario>` — Ver historial de warns\n' +
                    '`/mod-notes <usuario>` — Notas internas del Staff\n' +
                    `> ⚡ **${config.MODERACION.WARNS_PARA_MUTE}** warns → auto-mute\n` +
                    `> ⚡ **${config.MODERACION.WARNS_PARA_KICK}** warns → auto-kick`,
                inline: false
            },
            {
                name: '🧹 Limpieza',
                value:
                    '`/clear <cantidad> [usuario]` — Borrar mensajes\n' +
                    '`/purge <cantidad> [filtro]` — Borrar con filtros (bots, links, etc.)\n' +
                    '`/slowmode <segundos>` — Modo lento (0 = desactivar)',
                inline: false
            },
            {
                name: '🤖 Sistemas automáticos activos',
                value:
                    '> 🛡️ Anti-Spam: flood, links, menciones masivas, phishing\n' +
                    '> 🚨 Anti-Raid: lockdown automático al detectar cuentas bot\n' +
                    '> 📋 Todas las acciones se loguean automáticamente',
                inline: false
            }
        )
        .setFooter({ text: '9 comandos + sistemas automáticos  ·  Moderación' })
        .setTimestamp();
}

function buildAdminEmbed() {
    return new EmbedBuilder()
        .setColor(0x37474F)
        .setAuthor({ name: '⚙️  Administración y Setup' })
        .setDescription('Comandos de configuración del servidor. Requieren permisos de Admin.\n')
        .addFields(
            {
                name: '🔧 Setup de sistemas',
                value:
                    '`/setup-voz` — Canales "Join-To-Create" dinámicos\n' +
                    '`/setup-tickets` — Panel de tickets con transcript HTML\n' +
                    '`/setup-counting` — Canal para el juego de contar\n' +
                    '`/setup-confesiones` — Canal de confesiones anónimas\n' +
                    '`/onboarding` — Flujo de bienvenida interactivo',
                inline: false
            },
            {
                name: '🏷️ Roles automáticos',
                value:
                    '`/reactionroles` — Panel de roles con botones\n' +
                    '`/setup-roles` — Panel de roles de juegos (select menu)',
                inline: false
            },
            {
                name: '📡 Integraciones externas',
                value:
                    '`/configurar-twitch` — Alertas de stream en vivo\n' +
                    '`/configurar-youtube` — Alertas de videos nuevos\n' +
                    '`/configurar-github` — Alertas de commits y releases\n' +
                    '`/monitor-servidor` — Estado de servidores de juego',
                inline: false
            },
            {
                name: '📋 Diagnóstico',
                value:
                    '`/botstats` — Dashboard técnico del bot\n' +
                    '`/memoria` — Logs internos del sistema\n' +
                    '> 📊 Resumen técnico diario automático a las 09:00 ARG\n' +
                    '> 💾 Backup SQLite automático a las 01:00 ARG',
                inline: false
            }
        )
        .setFooter({ text: '12 comandos + 6 sistemas automáticos  ·  Admin' })
        .setTimestamp();
}

// ═══ COMANDO ═══

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('📖 Guía completa de comandos y sistemas del bot')
        .addStringOption(opt =>
            opt.setName('categoria')
                .setDescription('Ir directo a una categoría')
                .setRequired(false)
                .addChoices(
                    { name: '🚀 Empezar Aquí', value: 'quickstart' },
                    { name: '💰 Economía', value: 'economy' },
                    { name: '🎵 Música', value: 'music' },
                    { name: '🎮 Diversión', value: 'fun' },
                    { name: '🎯 Gaming Stats', value: 'gaming' },
                    { name: '📈 Niveles', value: 'levels' },
                    { name: '👤 Perfil y Misiones', value: 'profile' },
                    { name: '🔧 Utilidades', value: 'utility' },
                    { name: '🛡️ Moderación', value: 'moderation' },
                    { name: '⚙️ Admin', value: 'admin' },
                )),

    async execute(interaction) {
        await interaction.deferReply();

        const directCategory = interaction.options.getString('categoria');
        const initialEmbed = directCategory
            ? getEmbedForCategory(directCategory, interaction)
            : buildHomeEmbed(interaction);

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_nav')
            .setPlaceholder('📂 Elegí una categoría...')
            .addOptions(
                Object.entries(CATEGORIES).map(([value, cat]) => ({
                    label: cat.menuLabel,
                    description: cat.description,
                    value,
                    emoji: cat.emoji,
                    default: value === (directCategory || 'home')
                }))
            );

        const row = new ActionRowBuilder().addComponents(menu);

        const response = await interaction.editReply({
            embeds: [initialEmbed],
            components: [row],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id,
            time: 300000 // 5 minutos
        });

        collector.on('collect', async i => {
            const value = i.values[0];
            const embed = getEmbedForCategory(value, interaction);

            // Actualizar default del menú
            const updatedMenu = StringSelectMenuBuilder.from(menu.toJSON());
            updatedMenu.setOptions(
                Object.entries(CATEGORIES).map(([v, cat]) => ({
                    label: cat.menuLabel,
                    description: cat.description,
                    value: v,
                    emoji: cat.emoji,
                    default: v === value
                }))
            );

            const updatedRow = new ActionRowBuilder().addComponents(updatedMenu);
            await i.update({ embeds: [embed], components: [updatedRow] });
        });

        collector.on('end', () => {
            const expiredMenu = new StringSelectMenuBuilder()
                .setCustomId('help_nav_expired')
                .setPlaceholder('⏰ Expirado — Usá /ayuda de nuevo')
                .setDisabled(true)
                .addOptions([{ label: 'Expirado', value: 'expired' }]);
            const disabledRow = new ActionRowBuilder().addComponents(expiredMenu);
            interaction.editReply({ components: [disabledRow] }).catch(() => { });
        });
    }
};

function getEmbedForCategory(category, interaction) {
    switch (category) {
        case 'home': return buildHomeEmbed(interaction);
        case 'quickstart': return buildQuickstartEmbed();
        case 'economy': return buildEconomyEmbed();
        case 'music': return buildMusicEmbed();
        case 'fun': return buildFunEmbed();
        case 'gaming': return buildGamingEmbed();
        case 'levels': return buildLevelsEmbed();
        case 'profile': return buildProfileEmbed();
        case 'utility': return buildUtilityEmbed();
        case 'moderation': return buildModerationEmbed();
        case 'admin': return buildAdminEmbed();
        default: return buildHomeEmbed(interaction);
    }
}

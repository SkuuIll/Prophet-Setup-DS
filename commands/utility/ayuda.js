// ═══ COMANDO: /ayuda — Centro de Comandos Prophet Bot v2.5 ═══

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('📖 Muestra la guía completa de comandos y sistemas del bot'),

    async execute(interaction) {
        await interaction.deferReply();

        const ping = Math.round(interaction.client.ws.ping);
        const pingEmoji = ping < 150 ? '🟢' : ping < 350 ? '🟡' : '🔴';

        const mainEmbed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setAuthor({ name: '📖  Centro de Comandos — Prophet Bot', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('Prophet Bot v2.5')
            .setDescription(
                `¡Hola **${interaction.user.username}**! 👋 Soy el bot oficial de **Prophet Gaming**.\n\n` +
                `**📂 Categorías disponibles:**\n` +
                `> 🎵 Música  ·  💰 Economía  ·  🎮 Juegos  ·  📈 Niveles\n` +
                `> 🎯 Gaming Stats  ·  🛡️ Moderación  ·  🔧 Utilidades  ·  ⚙️ Admin\n\n` +
                `Usá el **menú de abajo** para explorar cada categoría y sus comandos.\n\n` +
                `> ${pingEmoji} **Ping:** \`${ping}ms\`  ·  📋 **Comandos:** \`58\`  ·  👥 **Servidor:** \`${interaction.guild.memberCount} miembros\``
            )
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Prophet Bot v2.5  ·  Seleccioná una categoría para empezar', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('📂 Explorá las categorías...')
            .addOptions([
                { label: '🏠 Inicio', description: 'Volver a la página principal', value: 'home', emoji: '🏠' },
                { label: '💰 Economía y Tienda', description: '10 comandos — Dinero, trabajos, apuestas y tienda', value: 'economy', emoji: '💰' },
                { label: '🎵 Música DJ', description: '7 comandos — Reproducción premium con botones', value: 'music', emoji: '🎵' },
                { label: '🎮 Juegos y Diversión', description: '8 comandos — Blackjack, LFG y más', value: 'fun', emoji: '🎮' },
                { label: '🎯 Gaming Stats', description: '2 comandos — Stats de PUBG y CS2 en tiempo real', value: 'gaming', emoji: '🎯' },
                { label: '📈 Niveles y XP', description: '2 comandos — Rankings y 9 roles automáticos', value: 'levels', emoji: '📈' },
                { label: '🔧 Utilidades', description: '12 comandos — Herramientas, cumpleaños, encuestas', value: 'utility', emoji: '🔧' },
                { label: '🛡️ Moderación', description: '9 comandos — Herramientas exclusivas para Staff', value: 'moderation', emoji: '🛡️' },
                { label: '⚙️ Administración', description: '7 comandos — Setup, logs y sistemas avanzados', value: 'admin', emoji: '⚙️' },
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const response = await interaction.editReply({
            embeds: [mainEmbed],
            components: [row],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id,
            time: 300000
        });

        collector.on('collect', async i => {
            const value = i.values[0];
            let embed;

            switch (value) {
                case 'home':
                    embed = mainEmbed;
                    break;

                case 'economy':
                    embed = new EmbedBuilder()
                        .setColor(config.COLORES.PRINCIPAL)
                        .setAuthor({ name: '💰  Economía Prophet' })
                        .setDescription(
                            'Ganá dinero, comprá roles exclusivos y convertite en el más rico del servidor.\n\n' +
                            '**💵 Ganar dinero:**\n' +
                            '> `/daily` — Recompensa diaria (cada 24h)\n' +
                            '> `/work` — Trabajar para ganar monedas (cada 30min)\n' +
                            '> `/gamble <cantidad>` — Apostar: doble o nada (50/50)\n\n' +
                            '**🏦 Gestión:**\n' +
                            '> `/balance [usuario]` — Ver saldo (efectivo + banco)\n' +
                            '> `/deposit <cantidad>` — Depositar en el banco\n' +
                            '> `/withdraw <cantidad>` — Retirar del banco\n' +
                            '> `/pay <usuario> <cantidad>` — Transferir a otro usuario\n' +
                            '> `/ecotop` — Leaderboard de los usuarios más ricos\n\n' +
                            '**🛒 Tienda:**\n' +
                            '> `/shop` — Abrir tienda interactiva (comprar roles)\n' +
                            '> `/inventory [usuario]` — Ver items/roles comprados\n\n' +
                            '*💡 Tip: Guardá tu dinero en el banco para que no lo pierdas.*'
                        )
                        .setFooter({ text: '10 comandos  ·  Prophet Economy' })
                        .setTimestamp();
                    break;

                case 'music':
                    embed = new EmbedBuilder()
                        .setColor(config.COLORES.MUSICA || 0x9B59B6)
                        .setAuthor({ name: '🎵  Prophet Music Engine v3.0' })
                        .setDescription(
                            'Reproducí tus temas favoritos en el canal de voz con calidad premium.\n\n' +
                            '**🎶 Comandos:**\n' +
                            '> `/play <canción/URL>` — Reproducir (YouTube, Spotify, SoundCloud)\n' +
                            '> `/pause` — Pausar o reanudar la reproducción\n' +
                            '> `/skip` — Saltar a la siguiente canción\n' +
                            '> `/stop` — Detener y desconectar del canal\n' +
                            '> `/queue` — Ver la cola de reproducción\n' +
                            '> `/volumen <1-100>` — Ajustar volumen (con barra visual)\n' +
                            '> `/filter <filtro>` — Aplicar filtros de audio (bassboost, nightcore, etc.)\n\n' +
                            '**🎛️ Panel de control interactivo:**\n' +
                            '```\n' +
                            '⏮️ Anterior  ⏯️ Pausar  ⏭️ Saltar  ⏹️ Detener  🔄 Replay\n' +
                            '🔁 Loop      🔀 Shuffle  🔉 Vol-    🔊 Vol+    📋 Cola\n' +
                            '```\n\n' +
                            '**🌐 Plataformas soportadas:**\n' +
                            '> YouTube · Spotify · SoundCloud · Apple Music · Vimeo\n\n' +
                            '*💡 Tip: Usá los botones debajo del reproductor para controlar la música.*'
                        )
                        .setFooter({ text: '7 comandos + 10 botones  ·  Prophet Music' })
                        .setTimestamp();
                    break;

                case 'fun':
                    embed = new EmbedBuilder()
                        .setColor(config.COLORES.PRINCIPAL)
                        .setAuthor({ name: '🎮  Juegos y Diversión' })
                        .setDescription(
                            'Relajate y divertite con la comunidad Prophet.\n\n' +
                            '**🕹️ Mini-juegos:**\n' +
                            '> `/tictactoe <usuario>` — Tres en Raya con botones (PvP)\n' +
                            '> `/blackjack <apuesta>` — Jugar al Blackjack 21 interactivo\n' +
                            '> `/rps` — Piedra, Papel o Tijera contra el bot\n' +
                            '> `/8ball <pregunta>` — Bola mágica (respuestas color-coded)\n' +
                            '> `/coinflip` — Tirar una moneda: ¿Cara o Cruz?\n\n' +
                            '**📸 Social y Búsqueda:**\n' +
                            '> `/buscar-grupo` — Panel interactivo LFG para buscar premades\n' +
                            '> `/avatar [usuario]` — Ver avatar en alta resolución\n' +
                            '> `/confesion` — Enviar una confesión anónima al servidor\n\n' +
                            '*💡 Tip: En /buscar-grupo el bot te notifica a vos y a tu equipo automáticamente cuando la sala se llena.*'
                        )
                        .setFooter({ text: '8 comandos  ·  Prophet Fun' })
                        .setTimestamp();
                    break;

                case 'gaming':
                    embed = new EmbedBuilder()
                        .setColor(0xF2A900)
                        .setAuthor({ name: '🎯  Gaming Stats — PUBG & CS2' })
                        .setDescription(
                            'Consultá las estadísticas de tus juegos favoritos directamente desde Discord.\n\n' +
                            '**🔫 PUBG (API Oficial):**\n' +
                            '> `/pubg <nombre> [plataforma] [modo]` — Stats lifetime\n' +
                            '> 📊 K/D, Wins, Headshots, Daño, Distancias y más\n' +
                            '> 🖥️ Steam · 🎮 PlayStation · 🟢 Xbox\n' +
                            '> 🎯 Solo/Duo/Squad · FPP/TPP\n\n' +
                            '**💥 Counter-Strike 2 (tracker.gg):**\n' +
                            '> `/cs2 <steamid>` — Stats generales de CS2\n' +
                            '> 📊 K/D, Win Rate, Headshot %, Daño/Ronda\n' +
                            '> 🗺️ Stats por mapa · ⭐ MVPs · 🏆 Ranking\n\n' +
                            '**💡 Tips:**\n' +
                            '> • El nombre de PUBG es case-sensitive (mayúsculas importan)\n' +
                            '> • Para CS2 usá tu Steam64 ID o URL del perfil de Steam\n' +
                            '> • Los datos se cachean 5 min para no saturar las APIs'
                        )
                        .setFooter({ text: '2 comandos  ·  Prophet Gaming Stats' })
                        .setTimestamp();
                    break;

                case 'levels':
                    embed = new EmbedBuilder()
                        .setColor(config.COLORES.NIVEL || 0x69F0AE)
                        .setAuthor({ name: '📈  Sistema de Niveles y XP' })
                        .setDescription(
                            'Subí de nivel participando en el chat. ¡Cada mensaje cuenta!\n\n' +
                            '**📊 Comandos:**\n' +
                            '> `/nivel [usuario]` — Ver tu nivel, XP y progreso actual\n' +
                            '> `/top` — Leaderboard de los usuarios más activos\n\n' +
                            '**⚡ ¿Cómo funciona?**\n' +
                            `> Ganás entre \`${config.NIVELES.XP_MIN}-${config.NIVELES.XP_MAX}\` XP por mensaje\n` +
                            `> Cooldown: \`${config.NIVELES.COOLDOWN / 1000}s\` entre mensajes\n` +
                            '> Al subir de nivel, recibís un rol automáticamente\n\n' +
                            '**🏅 Roles por nivel:**\n' +
                            '```\n' +
                            ' Nv. 1   →  🌱 Novato\n' +
                            ' Nv. 5   →  🔹 Aprendiz\n' +
                            ' Nv. 10  →  🔷 Gamer\n' +
                            ' Nv. 20  →  💠 Pro Player\n' +
                            ' Nv. 30  →  🌟 Veterano\n' +
                            ' Nv. 40  →  👑 Elite\n' +
                            ' Nv. 50  →  🔥 Leyenda\n' +
                            ' Nv. 75  →  🐉 Maestro\n' +
                            ' Nv. 100 →  ⚡ Dios del Server\n' +
                            '```'
                        )
                        .setFooter({ text: '2 comandos + 9 roles automáticos  ·  Prophet Levels' })
                        .setTimestamp();
                    break;

                case 'utility':
                    embed = new EmbedBuilder()
                        .setColor(config.COLORES.INFO || 0x42A5F5)
                        .setAuthor({ name: '🔧  Utilidades' })
                        .setDescription(
                            'Herramientas útiles para todos los miembros del servidor.\n\n' +
                            '**📡 Info:**\n' +
                            '> `/ping` — Latencia, uptime, RAM e indicador de calidad\n' +
                            '> `/serverinfo` — Estadísticas completas del servidor\n' +
                            '> `/userinfo [usuario]` — Info detallada de una cuenta\n\n' +
                            '**💬 Hub Comunitario:**\n' +
                            '> `/cumple <DD/MM>` — Agendar tu cumpleaños para saludo y rol\n' +
                            '> `/afk [motivo]` — Ponerte AFK (se quita al hablar)\n' +
                            '> `/snipe` — Recuperar último mensaje borrado del canal\n' +
                            '> `/suggest <idea>` — Enviar sugerencia (con votación ✅/❌)\n' +
                            '> `/embed` — Crear un embed personalizado\n\n' +
                            '**📊 Encuestas y Eventos:**\n' +
                            '> `/encuesta` — Crear encuesta simple con reacciones\n' +
                            '> `/encuesta_pro` — Encuesta avanzada con gráficos en vivo\n' +
                            '> `/sorteo` — Crear un giveaway con timer automático\n' +
                            '> `/ayuda` — Este menú de ayuda\n\n' +
                            '*💡 Tip: El bot verificará diariamente quién cumpleaños para felicitarlo.*'
                        )
                        .setFooter({ text: '12 comandos  ·  Prophet Utility' })
                        .setTimestamp();
                    break;

                case 'moderation':
                    embed = new EmbedBuilder()
                        .setColor(config.COLORES.MODERACION || 0xE74C3C)
                        .setAuthor({ name: '🛡️  Moderación — Solo Staff' })
                        .setDescription(
                            'Herramientas exclusivas para el equipo de Staff de Prophet.\n\n' +
                            '**⚖️ Sanciones:**\n' +
                            '> `/ban <usuario> [razón] [días]` — Ban permanente (DM + log)\n' +
                            '> `/tempban <usuario> <duración> [razón]` — Ban temporal con countdown\n' +
                            '> `/kick <usuario> [razón]` — Expulsar (DM + log)\n' +
                            '> `/mute <usuario> <minutos> [razón]` — Timeout temporal\n\n' +
                            '**⚠️ Advertencias:**\n' +
                            '> `/warn <usuario> <razón>` — Emitir advertencia\n' +
                            '> `/warns <usuario>` — Ver historial de warns\n' +
                            `> ⚡ Auto-mute a las **${config.MODERACION.WARNS_PARA_MUTE}** warns\n` +
                            `> ⚡ Auto-kick a las **${config.MODERACION.WARNS_PARA_KICK}** warns\n\n` +
                            '**🧹 Limpieza:**\n' +
                            '> `/clear <cantidad> [usuario]` — Borrar mensajes\n' +
                            '> `/purge <cantidad> [filtro]` — Borrar con filtros avanzados\n' +
                            '> `/slowmode <segundos>` — Modo lento (0 = desactivar)\n\n' +
                            '*💡 Todos los comandos de moderación envían DM al usuario y log al canal de logs.*'
                        )
                        .setFooter({ text: '9 comandos  ·  Prophet Moderación' })
                        .setTimestamp();
                    break;

                case 'admin':
                    embed = new EmbedBuilder()
                        .setColor(0x37474F)
                        .setAuthor({ name: '⚙️  Administración — Solo Admins' })
                        .setDescription(
                            'Comandos de configuración y setup del servidor.\n\n' +
                            '**🔧 Setup:**\n' +
                            '> `/setup-voz` — Crear canales dinámicos "Join-To-Create"\n' +
                            '> `/setup-tickets` — Crear panel de tickets (con Transcript HTML)\n' +
                            '> `/setup-counting` — Configurar juego de contar\n' +
                            '> `/setup-confesiones` — Configurar canal de confesiones\n\n' +
                            '**🏷️ Auto-Roles:**\n' +
                            '> `/reactionroles` — Crear panel de roles personalizado\n\n' +
                            '**📋 Sistema:**\n' +
                            '> `/memoria` — Logs internos detallados de Moderación y Sistema\n\n' +
                            '**🤖 Sistemas automáticos:**\n' +
                            '> 🎙️ Canales Dinámicos — Salas temporales con estados gaming/tóxicos\n' +
                            '> ⭐ Starboard — Resalta mensajes populares por reacciones\n' +
                            '> 🎂 Cumpleaños — Anuncios y roles automáticos a las 00:00\n' +
                            '> 🛡️ Logs Mejorados — Baneo, Mod, Entradas/Salidas y Voice\n' +
                            '> 🎫 Tickets HTML — Transcripts reales en web enviados a logs'
                        )
                        .setFooter({ text: '7 comandos + 10 sistemas automáticos  ·  Prophet Admin' })
                        .setTimestamp();
                    break;
            }

            await i.update({ embeds: [embed] });
        });

        collector.on('end', () => {
            const expiredMenu = new StringSelectMenuBuilder()
                .setCustomId('help_menu_expired')
                .setPlaceholder('⏰ Menú expirado — Usá /ayuda nuevamente')
                .setDisabled(true)
                .addOptions([{ label: 'Expirado', value: 'expired' }]);
            const disabledRow = new ActionRowBuilder().addComponents(expiredMenu);
            interaction.editReply({ components: [disabledRow] }).catch(() => { });
        });
    }
};

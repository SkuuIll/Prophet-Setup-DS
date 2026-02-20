// ═══ COMANDO: /ayuda — Centro de Comandos Prophet Bot v2.5 ═══

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('📖 Muestra la guía completa de comandos y sistemas del bot'),

    async execute(interaction) {
        const mainEmbed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setAuthor({ name: '📖  Centro de Comandos', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('Prophet Bot v2.5')
            .setDescription(
                `¡Hola **${interaction.user.username}**! 👋\n` +
                `Soy el asistente oficial de **Prophet Gaming**.\n\n` +
                `> 🎵 **Música** · 💰 **Economía** · 🎮 **Juegos** · 📈 **Niveles**\n` +
                `> 🛡️ **Moderación** · 🔧 **Utilidades** · ⚙️ **Admin**\n\n` +
                `**📚 ¿Cómo funciona?**\n` +
                `Seleccioná una categoría del menú de abajo para ver los comandos detallados.\n\n` +
                `> 📶 **Ping:** \`${interaction.client.ws.ping}ms\` · **Comandos:** \`49\` · **Servidor:** \`${interaction.guild.memberCount} miembros\``
            )
            .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Prophet Bot v2.5  ·  Seleccioná una categoría abajo', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('📂 Seleccioná una categoría...')
            .addOptions([
                { label: '🏠 Inicio', description: 'Volver a la página principal', value: 'home', emoji: '🏠' },
                { label: '💰 Economía y Tienda', description: '9 comandos — Dinero, trabajos, items, apuestas', value: 'economy', emoji: '💰' },
                { label: '🎵 Música DJ', description: '6 comandos — Reproducción de alta calidad', value: 'music', emoji: '🎵' },
                { label: '🎮 Juegos y Diversión', description: '6 comandos — Minijuegos y entretenimiento', value: 'fun', emoji: '🎮' },
                { label: '📈 Niveles y XP', description: '2 comandos — Ranking y progresión', value: 'levels', emoji: '📈' },
                { label: '🔧 Utilidades', description: '11 comandos — Herramientas útiles', value: 'utility', emoji: '🔧' },
                { label: '🛡️ Moderación', description: '9 comandos — Herramientas de Staff', value: 'moderation', emoji: '🛡️' },
                { label: '⚙️ Administración', description: '6 comandos — Setup y configuración', value: 'admin', emoji: '⚙️' },
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const response = await interaction.reply({
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
                            'Ganá dinero, comprá items exclusivos y convertite en el más rico del servidor.\n\n' +
                            '**💵 Ganar dinero:**\n' +
                            '> `/daily` — Recompensa diaria (cada 24h)\n' +
                            '> `/work` — Trabajar para ganar monedas (cada 30min)\n' +
                            '> `/gamble <cantidad>` — Apostar: doble o nada (50/50)\n\n' +
                            '**🏦 Gestión:**\n' +
                            '> `/balance [usuario]` — Ver saldo (efectivo + banco)\n' +
                            '> `/deposit <cantidad>` — Depositar en el banco\n' +
                            '> `/withdraw <cantidad>` — Retirar del banco\n' +
                            '> `/pay <usuario> <cantidad>` — Transferir a otro usuario\n\n' +
                            '**🛒 Tienda:**\n' +
                            '> `/shop` — Abrir tienda interactiva (menú desplegable)\n' +
                            '> `/inventory [usuario]` — Ver items comprados\n\n' +
                            '*💡 Tip: Guardá tu dinero en el banco para que no lo pierdas.*'
                        )
                        .setFooter({ text: '9 comandos  ·  Prophet Economy' })
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
                            '> `/volumen <1-100>` — Ajustar volumen (con barra visual)\n\n' +
                            '**🎛️ Panel de control interactivo:**\n' +
                            '```\n' +
                            '⏮️ Anterior  ⏯️ Pausar  ⏭️ Saltar  ⏹️ Detener  🔄 Replay\n' +
                            '🔁 Loop      🔀 Shuffle  🔉 Vol-    🔊 Vol+    📋 Cola\n' +
                            '```\n\n' +
                            '**🌐 Plataformas soportadas:**\n' +
                            '> YouTube · Spotify · SoundCloud · Apple Music · Vimeo\n\n' +
                            '*💡 Tip: Usá los botones debajo del reproductor para controlar la música sin escribir comandos.*'
                        )
                        .setFooter({ text: '6 comandos + 10 botones  ·  Prophet Music' })
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
                            '> `/rps` — Piedra, Papel o Tijera contra el bot\n' +
                            '> `/8ball <pregunta>` — Bola mágica (respuestas color-coded)\n' +
                            '> `/coinflip` — Tirar una moneda: ¿Cara o Cruz?\n\n' +
                            '**📸 Social:**\n' +
                            '> `/avatar [usuario]` — Ver avatar en alta resolución\n' +
                            '> `/confesion` — Enviar una confesión anónima al servidor\n\n' +
                            '*💡 Tip: En /8ball, las respuestas cambian de color según si son positivas (verde), neutrales (naranja) o negativas (rojo).*'
                        )
                        .setFooter({ text: '6 comandos  ·  Prophet Fun' })
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
                            '**💬 Comunicación:**\n' +
                            '> `/afk [motivo]` — Ponerte AFK (se quita al hablar)\n' +
                            '> `/snipe` — Recuperar último mensaje borrado del canal\n' +
                            '> `/suggest <idea>` — Enviar sugerencia (con votación ✅/❌)\n' +
                            '> `/embed` — Crear un embed personalizado\n\n' +
                            '**📊 Encuestas y Eventos:**\n' +
                            '> `/encuesta` — Crear encuesta simple con reacciones\n' +
                            '> `/encuesta_pro` — Encuesta avanzada con gráficos en vivo\n' +
                            '> `/sorteo` — Crear un giveaway con timer automático\n' +
                            '> `/ayuda` — Este menú de ayuda\n\n' +
                            '*💡 Tip: `/ping` muestra si el bot tiene buena conexión con indicadores 🟢🟡🔴.*'
                        )
                        .setFooter({ text: '11 comandos  ·  Prophet Utility' })
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
                            '> `/setup-tickets` — Crear panel de tickets de soporte\n' +
                            '> `/setup-counting` — Configurar juego de contar\n' +
                            '> `/setup-confesiones` — Configurar canal de confesiones\n\n' +
                            '**🏷️ Auto-Roles:**\n' +
                            '> `/reactionroles` — Crear panel de roles personalizado\n' +
                            '> `/reactionroles_games` — Panel de roles para juegos (PUBG, CS, etc.)\n\n' +
                            '**📋 Sistema:**\n' +
                            '> `/memoria` — Ver últimas acciones del bot (logs internos)\n\n' +
                            '**🤖 Sistemas automáticos:**\n' +
                            '> 🛡️ Anti-Spam — Detecta flooding y texto repetido\n' +
                            '> 🚨 Anti-Raid — Alerta por entradas masivas sospechosas\n' +
                            '> 📝 Logs — Mensajes borrados/editados, entradas y salidas\n' +
                            '> 🎫 Tickets — Sistema de soporte con apertura/cierre\n' +
                            '> 🎉 Sorteos — Timer automático con participación por botón\n' +
                            '> 🔢 Counting — Juego de contar con celebraciones cada 100'
                        )
                        .setFooter({ text: '6 comandos + 6 sistemas automáticos  ·  Prophet Admin' })
                        .setTimestamp();
                    break;
            }

            await i.update({ embeds: [embed] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                menu.setDisabled(true).setPlaceholder('⏰ Menú expirado — Usá /ayuda de nuevo')
            );
            interaction.editReply({ components: [disabledRow] }).catch(() => { });
        });
    }
};

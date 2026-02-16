const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('📖 Muestra la guía completa de comandos y sistemas del bot'),

    async execute(interaction) {
        // Embed Principal
        const mainEmbed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle('🤖 CENTRO DE COMANDOS — PROPHET BOT v2.5')
            .setDescription(
                `¡Hola **${interaction.user.username}**! 👋\n` +
                `Soy el asistente oficial de **Prophet Gaming**. Estoy aquí para ayudarte con economía, música, diversión y moderación.\n\n` +
                `**📚 ¿Cómo usar este menú?**\n` +
                `Selecciona una categoría en el menú de abajo para ver los comandos detallados.`
            )
            .addFields(
                { name: '⚡ Estado', value: `> ✅ En línea\n> 📶 Ping: \`${interaction.client.ws.ping}ms\``, inline: true }
            )
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({ text: 'Prophet Gaming System | v2.5.0', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        // Menú de Selección
        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('📂 Selecciona una categoría...')
            .addOptions([
                {
                    label: 'Inicio',
                    description: 'Volver a la página principal',
                    value: 'home',
                    emoji: '🏠'
                },
                {
                    label: 'Economía & Tienda',
                    description: 'Dinero, trabajos, items y apuestas',
                    value: 'economy',
                    emoji: '💰'
                },
                {
                    label: 'Juegos & Diversión',
                    description: 'Minijuegos, confesiones y entretenimiento',
                    value: 'fun',
                    emoji: '🎮'
                },
                {
                    label: 'Música DJ',
                    description: 'Controles de reproducción de alta calidad',
                    value: 'music',
                    emoji: '🎵'
                },
                {
                    label: 'Niveles & Social',
                    description: 'Ranking, perfiles y utilidades sociales',
                    value: 'social',
                    emoji: '📊'
                },
                {
                    label: 'Moderación & Admin',
                    description: 'Herramientas para el Staff de Prophet',
                    value: 'moderation',
                    emoji: '🛡️'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const response = await interaction.reply({
            embeds: [mainEmbed],
            components: [row],
            fetchReply: true
        });

        // Collector para el menú
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id,
            time: 300000 // 5 minutos
        });

        collector.on('collect', async i => {
            const value = i.values[0];
            let newEmbed = new EmbedBuilder().setColor(config.COLORES.PRINCIPAL).setTimestamp();

            switch (value) {
                case 'home':
                    newEmbed = mainEmbed;
                    break;

                case 'economy':
                    newEmbed.setTitle('💰 Economía Prophet')
                        .setDescription('Ganá dinero, comprá items exclusivos y convertite en el más rico del servidor.')
                        .addFields(
                            { name: '`/balance`', value: 'Ver tu saldo actual (Efectivo y Banco).', inline: true },
                            { name: '`/work`', value: 'Trabajar para ganar dinero (Cada 30 min).', inline: true },
                            { name: '`/daily`', value: 'Reclamar tu recompensa diaria.', inline: true },
                            { name: '`/deposit <cantidad>`', value: 'Depositar dinero en el banco.', inline: true },
                            { name: '`/withdraw <cantidad>`', value: 'Retirar dinero del banco.', inline: true },
                            { name: '`/pay <usuario> <cantidad>`', value: 'Transferir dinero a otro usuario.', inline: true },
                            { name: '`/shop`', value: '🛒 **Nuevo:** Abrir la tienda de items y roles.', inline: true },
                            { name: '`/inventory`', value: '🎒 **Nuevo:** Ver tus objetos comprados.', inline: true },
                            { name: '`/gamble <cantidad>`', value: 'Apostar dinero (Todo o nada).', inline: true }
                        )
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/2489/2489696.png');
                    break;

                case 'fun':
                    newEmbed.setTitle('🎮 Diversión y Minijuegos')
                        .setDescription('Relajate y pasala bien con la comunidad Prophet.')
                        .addFields(
                            { name: '`/tictactoe <usuario>`', value: '⭕❌ Juega al Tres en Raya con botones.', inline: true },
                            { name: '`/rps`', value: '✂️ Piedra, Papel o Tijera contra el bot.', inline: true },
                            { name: '`/confesion`', value: '🕵️‍♂️ Envía un secreto anónimo al canal de confesiones.', inline: true },
                            { name: '`/8ball <pregunta>`', value: 'La bola mágica responde tu destino.', inline: true },
                            { name: '`/coinflip`', value: 'Lanza una moneda (Cara o Cruz).', inline: true },
                            { name: '`/avatar [usuario]`', value: 'Ver la foto de perfil en alta resolución.', inline: true }
                        )
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/808/808439.png');
                    break;

                case 'music':
                    newEmbed.setTitle('🎵 Música DJ')
                        .setDescription('Reproducí tus temas favoritos directamente en el canal de voz.')
                        .addFields(
                            { name: '`/play <canción>`', value: 'Reproducir música (YouTube/Spotify).', inline: true },
                            { name: '`/stop`', value: 'Detener la música y desconectar.', inline: true },
                            { name: '`/skip`', value: 'Saltar a la siguiente canción.', inline: true },
                            { name: '`/pause`', value: 'Pausar o reanudar la reproducción.', inline: true },
                            { name: '`/queue`', value: 'Ver la cola de reproducción actual.', inline: true },
                            { name: '`/volumen <número>`', value: 'Ajustar el volumen (1-100).', inline: true }
                        )
                        .setFooter({ text: '💡 Tip: Usa los botones debajo del reproductor para controlar la música.' })
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3075/3075977.png');
                    break;

                case 'social':
                    newEmbed.setTitle('📊 Niveles y Utilidades')
                        .setDescription('Interactuá con la comunidad, subí de rango y usá herramientas útiles.')
                        .addFields(
                            { name: '`/nivel [usuario]`', value: 'Ver tu tarjeta de nivel y XP actual.', inline: true },
                            { name: '`/top`', value: 'Ver el ranking de los usuarios más activos.', inline: true },
                            { name: '`/afk [motivo]`', value: '💤 Avisar que estás ausente (se quita al hablar).', inline: true },
                            { name: '`/snipe`', value: '👀 Recuperar el último mensaje borrado del canal.', inline: true },
                            { name: '`/suggest <idea>`', value: 'Enviar una sugerencia al servidor.', inline: true },
                            { name: '`/userinfo [usuario]`', value: 'Ver información detallada de una cuenta.', inline: true },
                            { name: '`/serverinfo`', value: 'Ver estadísticas del servidor.', inline: true }
                        )
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3287/3287959.png');
                    break;

                case 'moderation':
                    newEmbed.setTitle('🛡️ Moderación y Administración')
                        .setDescription('Herramientas exclusivas para el equipo de Staff de Prophet.')
                        .setColor(config.COLORES.MODERACION || 0xE74C3C)
                        .addFields(
                            { name: '`/kick <usuario>`', value: 'Expulsar a un miembro.', inline: true },
                            { name: '`/ban <usuario>`', value: 'Banear permanentemente.', inline: true },
                            { name: '`/mute <usuario>`', value: 'Silenciar temporalmente.', inline: true },
                            { name: '`/warn <usuario>`', value: 'Dar una advertencia oficial.', inline: true },
                            { name: '`/clear <cantidad>`', value: 'Borrar mensajes masivamente.', inline: true },
                            { name: '`/setuptickets`', value: '⚙️ Configurar el panel de soporte.', inline: true },
                            { name: '`/setup-confesiones`', value: '⚙️ Configurar canal de confesiones.', inline: true },
                            { name: '`/reactionroles`', value: '⚙️ Crear panel de roles manual.', inline: true },
                            { name: '`/reactionroles_games`', value: '⚙️ Auto-generar roles de juegos (PUBG, CSGO).', inline: true }
                        )
                        .setThumbnail('https://cdn-icons-png.flaticon.com/512/9638/9638102.png');
                    break;
            }

            await i.update({ embeds: [newEmbed] });
        });

        collector.on('end', () => {
            // Desactivar el menú al finalizar el tiempo
            const disabledRow = new ActionRowBuilder().addComponents(
                menu.setDisabled(true).setPlaceholder('Menú expirado')
            );
            interaction.editReply({ components: [disabledRow] }).catch(() => { });
        });
    }
};

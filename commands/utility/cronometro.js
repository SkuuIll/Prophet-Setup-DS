// ════════════════════════════════════════════════════════════════
// ⏱️ CRONÓMETRO - Comando Utility
// Cronómetro y temporizador con alarmas
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Almacenar cronómetros activos
const cronometrosActivos = new Map();
const temporizadores = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cronometro')
        .setDescription('⏱️ Cronómetro y temporizador')
        .addSubcommand(sub =>
            sub.setName('iniciar')
                .setDescription('▶️ Iniciar un nuevo cronómetro')
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nombre para identificar el cronómetro')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('detener')
                .setDescription('⏹️ Detener y mostrar tiempo del cronómetro')
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nombre del cronómetro a detener')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('temporizador')
                .setDescription('⏰ Iniciar temporizador (cuenta regresiva)')
                .addIntegerOption(opt =>
                    opt.setName('minutos')
                        .setDescription('Minutos')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(1440))
                .addIntegerOption(opt =>
                    opt.setName('segundos')
                        .setDescription('Segundos adicionales')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(59))
                .addStringOption(opt =>
                    opt.setName('mensaje')
                        .setDescription('Mensaje de recordatorio')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('📋 Ver cronómetros y temporizadores activos')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        switch (subcommand) {
            case 'iniciar':
                return this.iniciarCronometro(interaction, userId);
            case 'detener':
                return this.detenerCronometro(interaction, userId);
            case 'temporizador':
                return this.iniciarTemporizador(interaction, userId);
            case 'lista':
                return this.listaCronometros(interaction, userId);
        }
    },

    async iniciarCronometro(interaction, userId) {
        const nombre = interaction.options.getString('nombre') || 'principal';
        const key = `${userId}_${nombre}`;

        if (cronometrosActivos.has(key)) {
            return interaction.reply({ 
                content: `❌ Ya tenés un cronómetro activo llamado **"${nombre}"**. Detenelo primero.`, 
                ephemeral: true 
            });
        }

        cronometrosActivos.set(key, {
            inicio: Date.now(),
            nombre,
            channelId: interaction.channelId
        });

        const embed = new EmbedBuilder()
            .setTitle('▶️ Cronómetro Iniciado')
            .setDescription(`Cronómetro **"${nombre}"** iniciado`)
            .addFields(
                { name: '⏱️ Tiempo', value: '`00:00:00`', inline: true },
                { name: '🆔 Nombre', value: `\`${nombre}\``, inline: true }
            )
            .setColor(0x4CAF50)
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`crono_stop_${nombre}`)
                    .setLabel('Detener')
                    .setEmoji('⏹️')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`crono_lap_${nombre}`)
                    .setLabel('Lap')
                    .setEmoji('🏁')
                    .setStyle(ButtonStyle.Secondary)
            );

        return interaction.reply({ embeds: [embed], components: [row] });
    },

    async detenerCronometro(interaction, userId) {
        const nombre = interaction.options.getString('nombre') || 'principal';
        const key = `${userId}_${nombre}`;

        const crono = cronometrosActivos.get(key);
        if (!crono) {
            return interaction.reply({ 
                content: `❌ No tenés un cronómetro activo llamado **"${nombre}"**.`, 
                ephemeral: true 
            });
        }

        const tiempoTranscurrido = Date.now() - crono.inicio;
        cronometrosActivos.delete(key);

        const embed = new EmbedBuilder()
            .setTitle('⏹️ Cronómetro Detenido')
            .setDescription(`Cronómetro **"${nombre}"** finalizado`)
            .addFields(
                { name: '⏱️ Tiempo Total', value: `\`${formatTime(tiempoTranscurrido)}\``, inline: true },
                { name: '📊 Milisegundos', value: `\`${tiempoTranscurrido.toLocaleString()}ms\``, inline: true }
            )
            .setColor(0xF44336)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },

    async iniciarTemporizador(interaction, userId) {
        const minutos = interaction.options.getInteger('minutos');
        const segundos = interaction.options.getInteger('segundos') || 0;
        const mensaje = interaction.options.getString('mensaje') || '¡Tiempo!';

        const totalMs = (minutos * 60 + segundos) * 1000;
        const endTime = Date.now() + totalMs;

        const key = `${userId}_${endTime}`;
        temporizadores.set(key, {
            endTime,
            mensaje,
            channelId: interaction.channelId,
            userId
        });

        const embed = new EmbedBuilder()
            .setTitle('⏰ Temporizador Iniciado')
            .setDescription(`Te avisaré en **${minutos}m ${segundos}s**`)
            .addFields(
                { name: '📝 Mensaje', value: mensaje, inline: false },
                { name: '⏱️ Duración', value: `\`${minutos}:${segundos.toString().padStart(2, '0')}\``, inline: true }
            )
            .setColor(0xFF9800)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Programar alerta
        setTimeout(async () => {
            temporizadores.delete(key);
            
            try {
                const channel = await interaction.client.channels.fetch(interaction.channelId);
                if (channel) {
                    const alertEmbed = new EmbedBuilder()
                        .setTitle('⏰ ¡Tiempo!')
                        .setDescription(`**${mensaje}**`)
                        .addFields(
                            { name: '👤 Para', value: `<@${userId}>`, inline: true },
                            { name: '⏱️ Duración', value: `${minutos}m ${segundos}s`, inline: true }
                        )
                        .setColor(0xFF5722)
                        .setTimestamp();

                    await channel.send({ 
                        content: `<@${userId}>`,
                        embeds: [alertEmbed] 
                    });
                }
            } catch (err) {
                console.error('Error al enviar alerta de temporizador:', err);
            }
        }, totalMs);
    },

    async listaCronometros(interaction, userId) {
        const userCronos = [];
        const userTimers = [];

        for (const [key, value] of cronometrosActivos) {
            if (key.startsWith(userId)) {
                userCronos.push({
                    nombre: value.nombre,
                    transcurrido: formatTime(Date.now() - value.inicio)
                });
            }
        }

        for (const [key, value] of temporizadores) {
            if (value.userId === userId) {
                const restante = Math.max(0, value.endTime - Date.now());
                userTimers.push({
                    mensaje: value.mensaje,
                    restante: formatTime(restante)
                });
            }
        }

        if (userCronos.length === 0 && userTimers.length === 0) {
            return interaction.reply({ 
                content: '📋 No tenés cronómetros ni temporizadores activos.', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('⏱️ Tiempos Activos')
            .setColor(0x9C27B0)
            .setTimestamp();

        if (userCronos.length > 0) {
            embed.addFields({
                name: '▶️ Cronómetros',
                value: userCronos.map(c => `**${c.nombre}**: \`${c.transcurrido}\``).join('\n'),
                inline: false
            });
        }

        if (userTimers.length > 0) {
            embed.addFields({
                name: '⏰ Temporizadores',
                value: userTimers.map(t => `**${t.mensaje}**: \`${t.restante}\``).join('\n'),
                inline: false
            });
        }

        return interaction.reply({ embeds: [embed] });
    }
};

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

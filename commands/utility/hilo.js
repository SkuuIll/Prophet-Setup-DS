// ═══ COMANDO: /hilo ═══
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hilo')
        .setDescription('🧵 Crear un hilo en el canal actual')
        .addStringOption(o =>
            o.setName('titulo')
                .setDescription('Título del hilo')
                .setRequired(true)
                .setMaxLength(100))
        .addIntegerOption(o =>
            o.setName('duracion')
                .setDescription('Tiempo hasta archivar automáticamente (en minutos)')
                .addChoices(
                    { name: '1 hora', value: 60 },
                    { name: '1 día', value: 1440 },
                    { name: '3 días', value: 4320 },
                    { name: '1 semana', value: 10080 },
                )
                .setRequired(false))
        .addBooleanOption(o =>
            o.setName('privado')
                .setDescription('¿Hilo privado? (Solo usuarios invitados lo ven)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const titulo = interaction.options.getString('titulo');
        const duracion = interaction.options.getInteger('duracion') ?? 1440; // 1 día por defecto
        const privado = interaction.options.getBoolean('privado') ?? false;

        // Verificar que el canal soporta hilos
        const channel = interaction.channel;
        if (!channel.isTextBased() || channel.isThread()) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription('> ❌ No podés crear un hilo aquí. Usá este comando en un canal de texto.')
                ]
            });
        }

        try {
            const threadType = privado
                ? ChannelType.PrivateThread
                : ChannelType.PublicThread;

            // Verificar que el servidor soporta hilos privados (requiere nivel 2 de boost)
            if (privado && interaction.guild.premiumTier < 2) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.WARN || 0xFFB74D)
                        .setDescription('> ⚠️ Los hilos privados requieren que el servidor tenga **Nivel 2 de Boost** o superior.')
                    ]
                });
            }

            const thread = await channel.threads.create({
                name: titulo,
                autoArchiveDuration: duracion,
                type: threadType,
                reason: `Creado por ${interaction.user.tag} via /hilo`,
            });

            // Si es privado, añadir al creador
            if (privado) {
                await thread.members.add(interaction.user.id);
            }

            const tipoLabel = privado ? '🔒 Privado' : '🌐 Público';
            const archiveHoras = duracion >= 1440 ? `${duracion / 1440}d` : `${duracion / 60}h`;

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                    .setAuthor({ name: '🧵  Hilo Creado', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(
                        `> ✅ **${thread}** fue creado en ${channel}.\n\n` +
                        `> 🏷️ Tipo: **${tipoLabel}**\n` +
                        `> ⏰ Se archiva en: **${archiveHoras}** de inactividad\n` +
                        `> 📍 Canal padre: ${channel}`
                    )
                    .setFooter({ text: 'Prophet Bot  ·  /hilo para crear otro' })
                    .setTimestamp()
                ]
            });

            // Mensaje de bienvenida en el hilo
            await thread.send({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                    .setDescription(
                        `> 🧵 **Hilo creado por ${interaction.user}**\n\n` +
                        `> Usá este espacio para conversar sobre **"${titulo}"**.\n` +
                        `> Se archivará automáticamente después de **${archiveHoras}** de inactividad.`
                    )
                    .setFooter({ text: 'Prophet Bot' })
                ]
            });

        } catch (err) {
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setDescription(`> ❌ **Error al crear el hilo:** ${err.message}`)
                ]
            });
        }
    }
};

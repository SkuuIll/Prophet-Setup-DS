// ═══════════════════════════════════════════════════
//  COMANDO: /ascensor (El Ascensor Fantasma de Salas de Voz)
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ascensor')
        .setDescription('👻 Mueve a un usuario por múltiples salas de voz a toda velocidad y lo regresa a su canal')
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
        .addUserOption(opt =>
            opt.setName('usuario')
                .setDescription('Usuario objetivo a pasear en el ascensor')
                .setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('pisos')
                .setDescription('Cantidad de salas por las que pasará antes de volver (2 a 6, default: 3)')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(6)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario');
        const floorCount = interaction.options.getInteger('pisos') || 3;

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            return interaction.reply({
                content: '❌ No se pudo encontrar al miembro en el servidor.',
                ephemeral: true
            });
        }

        const initialChannel = member.voice?.channel;
        if (!initialChannel) {
            return interaction.reply({
                content: `❌ **${member.user.tag}** no está conectado a ninguna sala de voz.`,
                ephemeral: true
            });
        }

        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return interaction.reply({
                content: '❌ No tengo el permiso **Mover Miembros** en este servidor.',
                ephemeral: true
            });
        }

        if (member.id === interaction.guild.ownerId || member.roles.highest.position >= botMember.roles.highest.position) {
            return interaction.reply({
                content: `❌ No puedo mover a **${member.user.tag}** porque tiene un rol igual o superior al mío o es el dueño del servidor.`,
                ephemeral: true
            });
        }

        // Buscar salas de voz disponibles distintas a la actual
        const availableChannels = interaction.guild.channels.cache
            .filter(c => c.isVoiceBased() && c.id !== initialChannel.id);

        if (availableChannels.size === 0) {
            return interaction.reply({
                content: '❌ Se necesitan al menos 2 canales de voz en el servidor para ejecutar el ascensor fantasma.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const channelList = Array.from(availableChannels.values());
        const visitedChannels = [];

        try {
            console.log(`[Ascensor] Iniciando ascensor fantasma para ${member.user.tag} (${floorCount} pisos)`);

            for (let i = 0; i < floorCount; i++) {
                const targetChannel = channelList[i % channelList.length];
                visitedChannels.push(targetChannel.name);

                // Comprobar que el usuario no se haya desconectado en medio del trayecto
                const currentVoice = interaction.guild.voiceStates.cache.get(member.id);
                if (!currentVoice?.channelId) {
                    break;
                }

                await currentVoice.setChannel(targetChannel, '👻 Ascensor fantasma en progreso').catch(() => {});
                // Pausa de 380ms para que se sienta el salto entre canales
                await new Promise(r => setTimeout(r, 380));
            }

            // Regresar al usuario exactamente a su sala original
            const finalVoice = interaction.guild.voiceStates.cache.get(member.id);
            if (finalVoice?.channelId) {
                await finalVoice.setChannel(initialChannel, '👻 Fin del ascensor fantasma (regreso a sala original)').catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.WARN || 0xFFB74D)
                .setTitle('👻  ¡Ascensor Fantasma Ejecutado!')
                .setDescription(
                    `> 👤 **Víctima:** ${member} (\`${member.user.tag}\`)\n` +
                    `> 🏢 **Pisos recorridos:** \`${visitedChannels.length}\`\n` +
                    `> 📍 **Ruta del fantasma:** ${visitedChannels.map(name => `\`${name}\``).join(' ➔ ')}\n` +
                    `> 🚪 **Sala final restaurada:** <#${initialChannel.id}>\n\n` +
                    `> 😈 *Quedó pensando que se le rompió Discord.*`
                )
                .setFooter({ text: 'Prophet Gaming  ·  Modo Fantasma de Voz' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('[Ascensor] Error durante ascensor fantasma:', err);
            return interaction.editReply({
                content: `❌ Ocurrió un error al intentar mover al usuario: ${err.message}`
            });
        }
    }
};

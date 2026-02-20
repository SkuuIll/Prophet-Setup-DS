// ═══ COMANDO: /setup-voz ═══
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-voz')
        .setDescription('🎙️ Crea el sistema de canales de voz temporales (Join-To-Create)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;

        try {
            // Crea una categoría para alojar los canales
            const category = await guild.channels.create({
                name: '🔊 Salas Temporales',
                type: ChannelType.GuildCategory
            });

            // Crea el canal "creador"
            const voiceChannel = await guild.channels.create({
                name: '➕ Crear Sala',
                type: ChannelType.GuildVoice,
                parent: category.id
            });

            // Guardarlo temporal o idealmente en base de datos.
            // Utilizando config tables (si existe)
            stmts.setConfig('voice_generator_id', voiceChannel.id);
            stmts.setConfig('voice_category_id', category.id);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.EXITO || 0x69F0AE)
                .setTitle('✅ Sistema "Join-To-Create" configurado')
                .setDescription(`He creado la categoría <#${category.id}> y el canal de voz <#${voiceChannel.id}>.\n\nCuando alguien se una a ese canal, le generaré automáticamente su propia sala temporal.`)
                .setFooter({ text: 'Prophet Gaming' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            console.error('Error setup-voz:', e);
            await interaction.editReply({ content: '❌ Ocurrió un error al intentar crear los canales. Verifica que tenga permisos de Administrador.' });
        }
    }
};

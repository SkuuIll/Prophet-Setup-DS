// ═══ COMANDO: /reactionroles ═══
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionroles')
        .setDescription('Crear un panel de reaction roles con botones')
        .addStringOption(o => o.setName('titulo').setDescription('Título del panel').setRequired(true))
        .addRoleOption(o => o.setName('rol1').setDescription('Primer rol').setRequired(true))
        .addStringOption(o => o.setName('emoji1').setDescription('Emoji para rol1').setRequired(true))
        // Opcionales van después de TODOS los requeridos
        .addStringOption(o => o.setName('descripcion').setDescription('Descripción del panel'))
        .addRoleOption(o => o.setName('rol2').setDescription('Segundo rol'))
        .addStringOption(o => o.setName('emoji2').setDescription('Emoji para rol2'))
        .addRoleOption(o => o.setName('rol3').setDescription('Tercer rol'))
        .addStringOption(o => o.setName('emoji3').setDescription('Emoji para rol3'))
        .addRoleOption(o => o.setName('rol4').setDescription('Cuarto rol'))
        .addStringOption(o => o.setName('emoji4').setDescription('Emoji para rol4'))
        .addRoleOption(o => o.setName('rol5').setDescription('Quinto rol'))
        .addStringOption(o => o.setName('emoji5').setDescription('Emoji para rol5'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion') || 'Hacé click en un botón para obtener o quitar el rol.';

        const roles = [];
        for (let i = 1; i <= 5; i++) {
            const rol = interaction.options.getRole(`rol${i}`);
            const emoji = interaction.options.getString(`emoji${i}`);
            if (rol && emoji) {
                roles.push({ rol, emoji });
            }
        }

        if (roles.length === 0) {
            return interaction.reply({ content: '❌ Necesitás al menos un rol con su emoji.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle(titulo)
            .setDescription(
                descripcion + '\n\n' +
                roles.map(r => `${r.emoji} — ${r.rol}`).join('\n')
            )
            .setFooter({ text: 'Prophet Gaming | Roles' })
            .setTimestamp();

        const row = new ActionRowBuilder();
        for (const r of roles) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`rr_${r.rol.id}`)
                    .setLabel(r.rol.name)
                    .setEmoji(r.emoji)
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Panel de reaction roles creado.', ephemeral: true });
    }
};

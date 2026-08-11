// ═══ COMANDO: /nivel ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { obtenerNivel, barraProgreso } = require('../../modules/leveling');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nivel')
        .setDescription('Ver tu nivel o el de otro usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const data = obtenerNivel(target.id);

        if (!data) {
            return interaction.reply({ content: `❌ ${target.tag} no tiene datos todavía.`, ephemeral: true });
        }

        await interaction.deferReply();

        try {
            const { generarTarjetaNivel } = require('../../utils/canvas');
            const buffer = await generarTarjetaNivel(target, data);

            const { AttachmentBuilder } = require('discord.js');
            const attachment = new AttachmentBuilder(buffer, { name: `nivel-${target.id}.png` });

            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error('Error generando tarjeta de nivel:', error);
            // Fallback al embed tradicional si falla el canvas
            const progreso = data.xp / data.xpSiguiente;
            const barra = barraProgreso(progreso);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.NIVEL)
                .setTitle(`📊 Nivel de ${target.displayName}`)
                .setThumbnail(target.displayAvatarURL({ size: 128 }))
                .addFields(
                    { name: '🏆 Nivel', value: `**${data.level}**`, inline: true },
                    { name: '⭐ XP', value: `**${data.xp}** / ${data.xpSiguiente}`, inline: true },
                    { name: '🏅 Ranking', value: `#${data.rank}`, inline: true },
                    { name: 'Progreso', value: `${barra} ${Math.round(progreso * 100)}%` }
                )
                .setFooter({ text: 'Prophet Gaming | Niveles (Modo simple)' });

            await interaction.editReply({ embeds: [embed] });
        }
    }
};

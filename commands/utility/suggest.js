// ═══ COMANDO: /suggest ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('💡 Enviar una sugerencia al servidor')
        .addStringOption(o => o.setName('propuesta').setDescription('Tu sugerencia para el servidor').setRequired(true)),

    async execute(interaction) {
        const suggestion = interaction.options.getString('propuesta');
        const channelId = stmts.getConfig('SUGERENCIAS_CHANNEL')?.value ?? config.SUGERENCIAS.CHANNEL_ID;
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) {
            return interaction.reply({
                content: '> ❌ El canal de sugerencias no está configurado o no existe.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.INFO || 0x42A5F5)
            .setAuthor({ name: '💡  Nueva sugerencia', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `> ${suggestion}\n\n` +
                `**Propuesta por:** ${interaction.user}\n` +
                `**Estado:** 🟡 En revisión`
            )
            .setFooter({ text: `Prophet  ·  Sugerencias  ·  Reaccioná para votar` })
            .setTimestamp();

        const msg = await channel.send({ embeds: [embed] });
        await msg.react('✅');
        await msg.react('❌');

        const confirmEmbed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setDescription('> ✅ **¡Sugerencia enviada!** La comunidad puede votar con ✅/❌.')
            .setFooter({ text: 'Prophet  ·  Sugerencias' });

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
};

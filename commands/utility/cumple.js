// ═══ COMANDO: /cumple ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cumple')
        .setDescription('🎂 Registra tu fecha de cumpleaños para que el bot te felicite!')
        .addStringOption(o => o.setName('fecha').setDescription('Ejemplo: 15/05').setRequired(true)),

    async execute(interaction) {
        const fecha = interaction.options.getString('fecha');

        // Regex para DD/MM
        if (!/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])$/.test(fecha)) {
            return interaction.reply({
                content: '❌ **Formato inválido**. Usá el formato Día/Mes. Ejemplo: `15/05` (Para el 15 de Mayo)',
                ephemeral: true
            });
        }

        stmts.setBirthday(interaction.user.id, fecha);

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.EXITO || 0x69F0AE)
            .setAuthor({ name: '🎂 Cumpleaños Guardado' })
            .setDescription(`Genial, ${interaction.user.username}! He guardado el **${fecha}** como tu cumpleaños.\n\nA la medianoche de tu día te daremos una sorpresa 🎉`)
            .setFooter({ text: 'Prophet Gaming' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

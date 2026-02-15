// ═══ COMANDO: /balance ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Ver tu saldo o el de otro usuario')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const eco = stmts.getEconomy(target.id);
        const currency = config.ECONOMIA.CURRENCY;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.INFO)
            .setTitle(`💰 Balance de ${target.username}`)
            .addFields(
                { name: '💵 Efectivo', value: `${currency} ${eco.balance}`, inline: true },
                { name: '🏦 Banco', value: `${currency} ${eco.bank}`, inline: true },
                { name: '💎 Total', value: `${currency} ${eco.balance + eco.bank}`, inline: true }
            )
            .setThumbnail(target.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

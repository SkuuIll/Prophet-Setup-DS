const { SlashCommandBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');
const { makeEmbed, walletFields } = require('../../utils/discordUI');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Consultá tu cartera o la de otra persona')
        .addUserOption(o => o.setName('usuario').setDescription('Usuario a consultar')),

    async execute(interaction) {
        const target = interaction.options.getUser('usuario') || interaction.user;
        const eco = stmts.getEconomy(target.id);
        const currency = config.ECONOMIA?.CURRENCY || '💰';
        const cash = Number(eco.balance || 0);
        const bank = Number(eco.bank || 0);
        const total = cash + bank;
        const percentage = total > 0 ? Math.round(cash / total * 100) : 0;
        const blocks = Math.min(10, Math.max(0, Math.round(percentage / 10)));
        const bar = '▰'.repeat(blocks) + '▱'.repeat(10 - blocks);

        let ranking = 'Fuera del top 200';
        try {
            // Una consulta SQL, en lugar de 200 accesos separados a la base.
            const list = stmts.getEcoTop(200);
            const position = list.findIndex(row => row.id === target.id);
            if (position >= 0) ranking = '#' + (position + 1);
        } catch (error) {
            console.warn('[Balance] No se pudo consultar el ranking:', error.message);
            ranking = 'No disponible';
        }

        const tip = total === 0
            ? 'Empezá con /daily o /work para ganar tus primeras monedas.'
            : cash > bank
                ? 'Podés guardar parte de tu efectivo con /deposit.'
                : 'Consultá /shop para descubrir en qué usar tus monedas.';

        const embed = makeEmbed({
            title: target.id === interaction.user.id ? 'Tu cartera' : 'Cartera de ' + target.username,
            description: '**Distribución del saldo**\n'
                + 'Efectivo  `' + bar + '`  ' + percentage + '%\n'
                + 'Banco: ' + (100 - percentage) + '%\n\n'
                + '**Ranking económico:** ' + ranking + '\n'
                + '**Sugerencia:** ' + tip,
            fields: walletFields(cash, bank, currency),
            footer: 'Economía · /daily · /work · /deposit · /withdraw',
            iconURL: target.displayAvatarURL?.(),
        });
        return interaction.reply({ embeds: [embed] });
    }
};

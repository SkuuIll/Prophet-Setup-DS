// ═══ COMANDO: /ayuda ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('Ver todos los comandos del bot'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL)
            .setTitle('📚 **CENTRO DE AYUDA — PROPHET GAMING**')
            .setDescription('Aquí tienes la lista completa de comandos disponibles para interactuar con el bot.')
            .addFields(
                {
                    name: '🛡️ **MODERACIÓN**',
                    value: '`kick`, `ban`, `mute`, `warn`, `warns`, `clear`',
                    inline: false
                },
                {
                    name: '🎵 **MÚSICA**',
                    value: '`play`, `skip`, `stop`, `queue`, `pause`, `volumen`',
                    inline: false
                },
                {
                    name: '📊 **NIVELES Y RANKING**',
                    value: '`nivel`, `top`',
                    inline: false
                },
                {
                    name: '💰 **ECONOMÍA GLOBAL**',
                    value: '`balance`, `daily`, `work`, `deposit`, `withdraw`, `pay`, `gamble`',
                    inline: false
                },
                {
                    name: '🎉 **ENTRETENIMIENTO**',
                    value: '`8ball`, `coinflip`, `avatar`',
                    inline: false
                },
                {
                    name: '🛠️ **UTILIDADES**',
                    value: '`suggest`, `ping`, `sorteo`, `encuesta`, `userinfo`, `serverinfo`, `embed`',
                    inline: false
                },
                {
                    name: '⚙️ **ADMINISTRACIÓN**',
                    value: '`setuptickets`, `reactionroles`',
                    inline: false
                },
            )
            .setFooter({ text: 'Prophet Gaming | Sistema v2.1' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

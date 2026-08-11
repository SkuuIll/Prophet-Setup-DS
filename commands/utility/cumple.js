// ═══ COMANDO: /cumple ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function diasHastaCumple(dia, mes) {
    const hoy = new Date();
    const hoyMs = hoy.getTime();
    const year = hoy.getFullYear();

    let cumple = new Date(year, mes - 1, dia);
    if (cumple < hoy) cumple = new Date(year + 1, mes - 1, dia);

    const diff = cumple.getTime() - hoyMs;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cumple')
        .setDescription('🎂 Registra o consulta las fechas de cumpleaños del servidor')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('🎂 Registra tu fecha de cumpleaños')
                .addStringOption(o => o.setName('fecha').setDescription('Ejemplo: 15/05 (Día/Mes)').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('📋 Ver los próximos cumpleaños del servidor')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand() || 'set';

        if (subcommand === 'set') {
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

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'lista') {
            await interaction.deferReply();

            const usersWithBirthday = stmts.getAllBirthdays();
            if (!usersWithBirthday || usersWithBirthday.length === 0) {
                return interaction.editReply({ content: '🎂 Todavía nadie registró su cumpleaños en el servidor. ¡Sé el primero con `/cumple set`!' });
            }

            const parsedList = [];
            for (const row of usersWithBirthday) {
                if (!row.birthday) continue;
                const [d, m] = row.birthday.split('/').map(Number);
                if (!d || !m) continue;
                const dias = diasHastaCumple(d, m);
                parsedList.push({ userId: row.id, dia: d, mes: m, dias, fechaRaw: row.birthday });
            }

            parsedList.sort((a, b) => a.dias - b.dias);
            const proximos = parsedList.slice(0, 10);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
                .setTitle('🎂  Próximos Cumpleaños')
                .setDescription(proximos.map((item, idx) => {
                    const icon = item.dias === 0 ? '🎉' : '📅';
                    const diasTexto = item.dias === 0 ? '**¡HOY!** 🎈' : item.dias === 1 ? '¡Mañana!' : `en ${item.dias} días`;
                    return `${icon} **#${idx + 1}** <@${item.userId}> — **${item.dia} de ${MESES[item.mes - 1]}** (${diasTexto})`;
                }).join('\n\n'))
                .setFooter({ text: 'Registrá el tuyo con /cumple set' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }
};

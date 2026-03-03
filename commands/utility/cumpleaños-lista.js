// ═══ COMANDO: /cumpleaños-lista ═══
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
        .setName('cumpleaños-lista')
        .setDescription('🎂 Ver los próximos cumpleaños del servidor'),

    async execute(interaction) {
        await interaction.deferReply();
        await interaction.guild.members.fetch();

        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const diaActual = hoy.getDate();

        // Obtener todos los usuarios con cumpleaños registrado
        const allUsers = interaction.guild.members.cache;
        const cumpleList = [];

        for (const [memberId, member] of allUsers) {
            if (member.user.bot) continue;
            const bday = stmts.getBirthday(memberId);
            if (!bday) continue;

            const [diaStr, mesStr] = bday.split('/');
            const dia = parseInt(diaStr);
            const mes = parseInt(mesStr);
            if (isNaN(dia) || isNaN(mes)) continue;

            const esHoy = dia === diaActual && mes === mesActual;
            const diasRestantes = diasHastaCumple(dia, mes);

            cumpleList.push({
                membre: member,
                dia, mes, diasRestantes, esHoy,
                label: `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
            });
        }

        if (cumpleList.length === 0) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.INFO || 0x42A5F5)
                    .setAuthor({ name: '🎂  Cumpleaños del Servidor' })
                    .setDescription('> 📭 Aún nadie registró su cumpleaños.\n> Usá `/cumple <DD/MM>` para ser el primero.')
                    .setFooter({ text: 'Prophet Bot  ·  /cumple DD/MM para registrarte' })
                ]
            });
        }

        // Ordenar por días restantes
        cumpleList.sort((a, b) => a.diasRestantes - b.diasRestantes);

        const hoyBdays = cumpleList.filter(c => c.esHoy);
        const proximos = cumpleList.filter(c => !c.esHoy).slice(0, 10);

        let desc = '';

        if (hoyBdays.length > 0) {
            desc += `**🎉 ¡Hoy cumplen años!**\n`;
            for (const c of hoyBdays) {
                desc += `> 🎂 ${c.membre} \`(${c.label})\`\n`;
            }
            desc += '\n';
        }

        if (proximos.length > 0) {
            desc += `**📅 Próximos cumpleaños:**\n`;
            for (const c of proximos) {
                const cuando = c.diasRestantes === 0 ? '**¡Hoy!**'
                    : c.diasRestantes === 1 ? '**¡Mañana!**'
                        : `en **${c.diasRestantes} días** *(${c.label} · ${MESES[c.mes - 1]})*`;
                const icono = c.diasRestantes <= 3 ? '🔔' : c.diasRestantes <= 7 ? '📅' : '🗓️';
                desc += `> ${icono} ${c.membre.user.username} — ${cuando}\n`;
            }
        }

        if (!desc) desc = '> 📭 Sin cumpleaños próximos.';

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.PRINCIPAL || 0xBB86FC)
            .setAuthor({ name: '🎂  Cumpleaños del Servidor · Prophet Gaming', iconURL: interaction.guild.iconURL() })
            .setDescription(desc)
            .addFields(
                { name: '👥 Registrados', value: `\`${cumpleList.length}\` miembros`, inline: true },
                { name: '🎉 Hoy', value: `\`${hoyBdays.length}\` cumpleaños`, inline: true },
                { name: '📅 Este mes', value: `\`${cumpleList.filter(c => c.mes === mesActual).length}\` en ${MESES[mesActual - 1]}`, inline: true }
            )
            .setFooter({ text: 'Registrá el tuyo con /cumple DD/MM  ·  Prophet Bot' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

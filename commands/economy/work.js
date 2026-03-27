// ═══ COMANDO: /work ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');

const TRABAJOS = [
    { text: '👵 Ayudaste a cruzar la calle a una anciana agradecida', salario: 'Propina generosa' },
    { text: '💻 Programaste un bot de Discord para un servidor rival', salario: 'Contrato backend' },
    { text: '🔧 Reparaste una PC gamer que no encendía desde el 2019', salario: 'Reparación técnica' },
    { text: '🏆 Ganaste un torneo de Valorant con tu equipo de randoms', salario: 'Premio del torneo' },
    { text: '⛏️ Minaste un bloque de diamante en Minecraft hard mode', salario: 'Venta en el mercado' },
    { text: '🍋 Pusiste un puesto de limonada y vendiste todo en 10 min', salario: 'Ganancias del día' },
    { text: '🚗 Hiciste de Uber y llevaste a un streamer famoso al evento', salario: 'Tarifa + propina' },
    { text: '🎨 Diseñaste un logo épico para un clan de gaming top 10', salario: 'Trabajo de diseño' },
    { text: '📦 Completaste un delivery de comida en tiempo récord 🏃', salario: 'Pago por envío' },
    { text: '🎬 Editaste un video que se hizo viral con 1M de views', salario: 'Contrato de edición' },
    { text: '🛠️ Armaste un mueble de IKEA sin instrucciones y funcionó', salario: 'Servicio de armado' },
    { text: '🐕 Paseaste 7 perros a la vez sin perder ninguno 🦮', salario: 'Paseador el día' },
    { text: '🎧 Fuiste DJ en una fiesta y la gente pidió bis', salario: 'Cachet de DJ' },
    { text: '📸 Sacaste las fotos del torneo y quedaron increíbles', salario: 'Sesión fotográfica' },
    { text: '🧹 Baneaste 42 spam bots del servidor y te aplaudieron', salario: 'Trabajo de moderación' },
    { text: '🐉 Completaste una raid entera como healer improvisado', salario: 'Recompensas de raid' },
    { text: '🏗️ Terminaste el primer piso de tu base en Rust sin morir', salario: 'Recursos salvados' },
    { text: '🎓 Tutor online de mates: tu alumno sacó 10', salario: 'Honorarios de tutor' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('👷 Trabajar para ganar monedas'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const eco = stmts.getEconomy(userId);
        const ahora = Date.now();
        const cooldown = config.ECONOMIA.WORK_COOLDOWN;

        if (ahora - eco.last_work < cooldown) {
            const restante = cooldown - (ahora - eco.last_work);
            const minutos = Math.floor(restante / 60000);
            const segundos = Math.floor((restante % 60000) / 1000);

            // Barra de progreso del cooldown
            const pasado = cooldown - restante;
            const pct = Math.round((pasado / cooldown) * 10);
            const barraCD = '🟩'.repeat(pct) + '⬛'.repeat(10 - pct);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setAuthor({ name: '👷  Work · Necesitás descansar', iconURL: interaction.user.displayAvatarURL() })
                .setDescription(
                    `> ⏳ **Cansancio activo** — Descansá **${minutos}m ${segundos}s** más.\n\n` +
                    `> Recuperación:\n` +
                    `> ${barraCD} \`${Math.round((pasado / cooldown) * 100)}%\``
                )
                .setFooter({ text: 'Prophet Economy  ·  Podés trabajar cada 30 minutos' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const reward = Math.floor(Math.random() * (config.ECONOMIA.WORK_MAX - config.ECONOMIA.WORK_MIN + 1)) + config.ECONOMIA.WORK_MIN;
        const trabajo = TRABAJOS[Math.floor(Math.random() * TRABAJOS.length)];

        stmts.addMoney(userId, reward, 'balance');
        stmts.setEconomy(userId, 'last_work', ahora);

        const nuevoSaldo = stmts.getEconomy(userId);

        // ── Overtime chance (25%) ──
        const hasOvertime = Math.random() < 0.25;

        const embed = new EmbedBuilder()
            .setColor(config.COLORES.SUCCESS || 0x69F0AE)
            .setAuthor({ name: '👷  Trabajo Completado', iconURL: interaction.user.displayAvatarURL() })
            .setDescription(
                `> 📋 ${trabajo.text}\n\n` +
                `> 💼 Concepto: **${trabajo.salario}**\n` +
                `> 💰 **+${config.ECONOMIA.CURRENCY} ${reward.toLocaleString()}** ganados\n` +
                `> 💵 Saldo actual: **${config.ECONOMIA.CURRENCY} ${nuevoSaldo.balance.toLocaleString()}**` +
                (hasOvertime ? '\n\n> ⚡ **¡HORA EXTRA DISPONIBLE!** Presioná el botón en 5s para ganar bonus.' : '')
            )
            .setFooter({ text: 'Prophet Economy  ·  Trabajá cada 30 minutos' })
            .setTimestamp();

        if (!hasOvertime) {
            return interaction.reply({ embeds: [embed] });
        }

        // Overtime mini-game
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
        const overtimeBonus = Math.floor(reward * 0.5); // 50% extra

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('work_overtime')
                .setLabel(`⚡ Hora Extra (+${config.ECONOMIA.CURRENCY} ${overtimeBonus})`)
                .setStyle(ButtonStyle.Success)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 5000,
            filter: i => i.user.id === userId,
            max: 1
        });

        collector.on('collect', async i => {
            stmts.addMoney(userId, overtimeBonus, 'balance');
            const finalBal = stmts.getEconomy(userId);

            embed.setDescription(
                `> 📋 ${trabajo.text}\n\n` +
                `> 💼 Concepto: **${trabajo.salario}**\n` +
                `> 💰 **+${config.ECONOMIA.CURRENCY} ${reward.toLocaleString()}** ganados\n` +
                `> ⚡ **+${config.ECONOMIA.CURRENCY} ${overtimeBonus.toLocaleString()}** bonus hora extra!\n` +
                `> 💵 Saldo final: **${config.ECONOMIA.CURRENCY} ${finalBal.balance.toLocaleString()}**`
            );
            embed.setColor(0xFFD700);

            await i.update({ embeds: [embed], components: [] });
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                embed.setDescription(
                    embed.data.description.replace('⚡ **¡HORA EXTRA DISPONIBLE!** Presioná el botón en 5s para ganar bonus.', '⏰ *Hora extra expirada — fuiste muy lento.*')
                );
                interaction.editReply({ embeds: [embed], components: [] }).catch(() => {});
            }
        });
    }
};

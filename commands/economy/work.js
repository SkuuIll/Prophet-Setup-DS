// ═══ COMANDO: /work ═══
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { stmts } = require('../../database');
const config = require('../../config');
const { makeEmbed, notice } = require('../../utils/discordUI');

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
    // PUBG
    { text: '🪖 Entrenaste a un squad de PUBG y los llevaste al Chicken Dinner', salario: 'Coaching de PUBG' },
    { text: '🎯 Eliminaste 15 jugadores en Erangel con solo pistola — la gente te contrató de coach', salario: 'Premio de clutch' },
    { text: '🚁 Caíste en Pochinki, limpiaste el drop y saliste vivo. El squad te pagó el drop', salario: 'Loot vendido' },
    { text: '🛡️ Fuiste el último de tu squad vivo y ganaste con un pan y un vendaje', salario: 'Recompensa de superviviente' },
    { text: '🗺️ Marcaste la zona perfecta y el squad llegó top 2 sin pelear', salario: 'Estrategia maestra' },
    // CS2
    { text: '🔫 Clutcheaste un 1v5 en matchmaking y el rival team te invitó a su clan', salario: 'Oferta de clan' },
    { text: '💣 Defuseaste la bomba con 0.3s y toda la faceit te lo agradeció con coins', salario: 'Premio de defusal' },
    { text: '🖱️ Le enseñaste a apuntar a un plata y llegó a oro en dos semanas', salario: 'Sesión de aim training' },
    { text: '🎙️ Callcheaste perfectamente la rotación y el equipo gana pistol round', salario: 'IGL profesional' },
    { text: '📊 Analizaste el demo del partido perdido y encontraste el error del equipo', salario: 'Análisis táctico' },
    // Extra fun
    { text: '🧋 Vendiste bubble tea gamer en el torneo y agotaste el stock en 20 min', salario: 'Ventas récord' },
    { text: '🤝 Hiciste de traductor entre el IGL y el jugador brasileño — ganaron igual', salario: 'Servicio de traducción' },
    { text: '🖨️ Imprimiste los memes del squad para decorar la sala de juego', salario: 'Trabajo creativo' },
    { text: '🧃 Alcanzaste jugo a todo el café gaming y ninguno se fue sediento', salario: 'Propina colectiva' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Trabajar para ganar monedas'),
    async execute(interaction) {
        const userId = interaction.user.id;
        const now = Date.now();
        const cooldown = config.ECONOMIA.WORK_COOLDOWN;
        const wallet = stmts.getEconomy(userId);
        const until = (wallet.last_work || 0) + cooldown;
        if (now < until) {
            return interaction.reply(notice({
                title: 'Todavía estás descansando',
                description: 'Podés volver a trabajar <t:' + Math.floor(until / 1000) + ':R>.',
                tone: 'warning',
            }));
        }

        const coins = Math.floor(Math.random() *
            (config.ECONOMIA.WORK_MAX - config.ECONOMIA.WORK_MIN + 1)) + config.ECONOMIA.WORK_MIN;
        const job = TRABAJOS[Math.floor(Math.random() * TRABAJOS.length)];
        const claim = stmts.claimTimedReward(userId, 'work', coins, now, cooldown);
        if (!claim.success) {
            return interaction.reply(notice({
                title: 'Recompensa no disponible',
                description: 'Es posible que ya la hayas cobrado o que hayas alcanzado el saldo máximo.',
                tone: 'warning',
            }));
        }

        const bonus = Math.floor(coins / 2);
        const hasOvertime = bonus > 0 && Math.random() < 0.25;
        const build = (status, balance) => makeEmbed({
            title: status === 'claimed' ? 'Trabajo completado'
                : status === 'bonus' ? 'Hora extra completada' : 'Trabajo completado',
            tone: status === 'bonus' ? 'success' : 'primary',
            description: job.text + '\\n**Concepto:** ' + job.salario
                + (status === 'claimed' && hasOvertime
                    ? '\\n\\n**Hora extra disponible:** tenés 5 segundos para reclamarla.'
                    : status === 'expired' ? '\\n\\nLa oferta de hora extra venció.' : ''),
            fields: [
                { name: 'Sueldo', value: '+' + config.ECONOMIA.CURRENCY + ' ' + coins.toLocaleString('es-AR'), inline: true },
                ...(status === 'bonus' ? [{ name: 'Hora extra', value: '+' + config.ECONOMIA.CURRENCY + ' ' + bonus.toLocaleString('es-AR'), inline: true }] : []),
                { name: 'Saldo actual', value: config.ECONOMIA.CURRENCY + ' ' + balance.toLocaleString('es-AR'), inline: true },
            ],
            footer: 'Economía · /work · /balance',
            iconURL: interaction.user.displayAvatarURL?.(),
        });

        if (!hasOvertime) return interaction.reply({ embeds: [build('claimed', claim.balance)] });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('work_overtime')
                .setLabel('Reclamar hora extra (+' + bonus + ')')
                .setStyle(ButtonStyle.Success),
        );
        const response = await interaction.reply({
            embeds: [build('claimed', claim.balance)], components: [row], fetchReply: true,
        });
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 5000, max: 1,
            filter: button => button.user.id === userId && button.customId === 'work_overtime',
        });
        collector.on('collect', async button => {
            // El bonus no sobrepasa el límite de enteros y queda registrado en game_logs.
            const settled = stmts.atomicModifyBalance(userId, bonus, 'work', 'overtime');
            if (!settled.success) {
                return button.update({ embeds: [build('expired', claim.balance)], components: [] })
                    .catch(error => console.warn('[Work] No se pudo actualizar aviso:', error.message));
            }
            await button.update({ embeds: [build('bonus', settled.balance)], components: [] })
                .catch(error => console.warn('[Work] No se pudo actualizar hora extra:', error.message));
        });
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ embeds: [build('expired', claim.balance)], components: [] })
                    .catch(() => {});
            }
        });
    },
};

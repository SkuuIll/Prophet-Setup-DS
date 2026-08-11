// ═══════════════════════════════════════════════════
//  COMANDO: /fakeban (El Susto del Baneo)
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fakeban')
        .setDescription('🚨 Asusta a un amigo con un baneo permanente ultra-realista que luego explota en trolleo')
        .addUserOption(opt =>
            opt.setName('usuario')
                .setDescription('Usuario a quien asustar con el falso baneo')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('motivo')
                .setDescription('Motivo falso de la sanción')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('usuario');
        const customReason = interaction.options.getString('motivo')
            || 'Uso indebido de hacks de manco, falta de manos reiterada y tilteo tóxico';

        const caseId = Math.floor(100000 + Math.random() * 900000);

        // Embed serio de moderación oficial
        const seriousEmbed = new EmbedBuilder()
            .setColor(0xEF5350) // Rojo advertencia
            .setAuthor({
                name: '🛡️  SISTEMA DE MODERACIÓN OFICIAL — PROPHET GAMING',
                iconURL: interaction.guild.iconURL()
            })
            .setTitle('🔨  USUARIO SANCIONADO: EXPULSIÓN PERMANENTE (BAN)')
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setDescription(
                `> 👤 **Usuario Sancionado:** ${targetUser} (\`${targetUser.tag}\`)\n` +
                `> 🆔 **ID del Usuario:** \`${targetUser.id}\`\n` +
                `> 👮 **Moderador:** ${interaction.user}\n` +
                `> 📋 **Motivo:** \`${customReason}\`\n` +
                `> 📁 **Expediente:** \`#SANC-${caseId}\`\n` +
                `> ⏱️ **Duración:** **PERMANENTE (Hardware & IP Ban)**\n\n` +
                `> ⚠️ *Esta sanción es inapelable. Se ha revocado el acceso completo a los canales de Prophet Gaming.*`
            )
            .setFooter({ text: 'Prophet Security  ·  Sanción Administrativa' })
            .setTimestamp();

        // Responder con el embed serio
        const replyMessage = await interaction.reply({
            embeds: [seriousEmbed],
            fetchReply: true
        });

        // A los 4.5 segundos: revelar el trolleo
        setTimeout(async () => {
            try {
                const trollEmbed = new EmbedBuilder()
                    .setColor(config.COLORES?.WARN || 0xFFB74D)
                    .setAuthor({
                        name: '🤡  MINISTERIO DEL BARDO Y TROLLEO',
                        iconURL: targetUser.displayAvatarURL()
                    })
                    .setTitle('🤡  ¡TE LA CREÍSTE, PELOTUDO!')
                    .setDescription(
                        `> 😂 Tranquilo ${targetUser}, **no fuiste baneado un carajo**.\n` +
                        `> 🎭 Todo fue una tramoya armada por: ${interaction.user}\n\n` +
                        `> 💀 *Casi se te cae el corazón al piso, ¿no?*\n` +
                        `> 🎮 Ponete las manos, tomate un fernet y seguí jugando. 👊`
                    )
                    .setImage('https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif')
                    .setFooter({ text: 'Prophet Gaming  ·  ¡Te la re comiste doblada!' })
                    .setTimestamp();

                await interaction.editReply({ embeds: [trollEmbed] });
            } catch (err) {
                console.error('[FakeBan] Error editando mensaje de fakeban:', err.message);
            }
        }, 4500);
    }
};

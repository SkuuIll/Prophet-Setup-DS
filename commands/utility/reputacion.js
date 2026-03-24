// ═══════════════════════════════════════════════════
//  COMANDO: /reputacion
//  Sistema de reputación entre usuarios
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stmts } = require('../../database');
const { trackReputation } = require('../../modules/profileSystem');

const REP_COOLDOWN = 24 * 60 * 60 * 1000; // 24 horas

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reputacion')
        .setDescription('Sistema de reputación')
        .addSubcommand(sub =>
            sub.setName('dar')
                .setDescription('Dar un punto de reputación a un usuario')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario que recibirá la reputación')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('razon')
                        .setDescription('Razón de la reputación (opcional)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver la reputación de un usuario')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario cuya reputación quieres ver')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('top')
                .setDescription('Ver los usuarios con más reputación')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'dar') {
            return await handleGiveRep(interaction);
        }

        if (subcommand === 'ver') {
            return await handleViewRep(interaction);
        }

        if (subcommand === 'top') {
            return await handleTopRep(interaction);
        }
    }
};

async function handleGiveRep(interaction) {
    const giver = interaction.user;
    const receiver = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon');

    // Validaciones
    if (receiver.bot) {
        return interaction.reply({ content: '❌ No puedes dar reputación a bots.', ephemeral: true });
    }

    if (receiver.id === giver.id) {
        return interaction.reply({ content: '❌ No puedes darte reputación a ti mismo.', ephemeral: true });
    }

    // Verificar cooldown
    const prefs = stmts.getUserPreferences(giver.id);
    const lastRep = prefs?.last_rep_given || 0;
    const now = Date.now();

    if (now - lastRep < REP_COOLDOWN) {
        const remaining = REP_COOLDOWN - (now - lastRep);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
        return interaction.reply({
            content: `⏰ Debes esperar **${hours}h ${minutes}m** antes de dar otra reputación.`,
            ephemeral: true
        });
    }

    // Dar reputación
    const newRep = stmts.addReputation(receiver.id, 1);

    // Guardar cooldown
    if (!prefs) {
        stmts.setUserPreference(giver.id, 'last_rep_given', now);
    } else {
        const db = require('../../database')._db;
        db.prepare('UPDATE user_preferences SET last_rep_given = ? WHERE user_id = ?').run(now, giver.id);
    }

    // Track para badges/achievements
    trackReputation(receiver.id, newRep);

    // Log
    stmts.addLog('reputation_given', {
        giver: giver.id,
        receiver: receiver.id,
        reason: reason || null
    });

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setAuthor({
            name: `${giver.username} dio reputación a ${receiver.username}`,
            iconURL: receiver.displayAvatarURL({ dynamic: true })
        })
        .setDescription(
            `⭐ **${receiver}** ahora tiene **${newRep}** punto(s) de reputación.\n` +
            (reason ? `\n> *"${reason}"*` : '')
        )
        .setFooter({ text: 'Vuelve en 24 horas para dar más reputación' });

    await interaction.reply({ embeds: [embed] });
}

async function handleViewRep(interaction) {
    const target = interaction.options.getUser('usuario') || interaction.user;
    const rep = stmts.getReputation(target.id);

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setAuthor({
            name: `Reputación de ${target.username}`,
            iconURL: target.displayAvatarURL({ dynamic: true })
        })
        .setDescription(`⭐ **${rep}** punto(s) de reputación`);

    await interaction.reply({ embeds: [embed] });
}

async function handleTopRep(interaction) {
    await interaction.deferReply();

    const top = stmts.getTopReputation(10);

    if (top.length === 0) {
        return interaction.editReply('Aún no hay usuarios con reputación.');
    }

    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('⭐ Top Reputación')
        .setDescription(
            top.map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
                return `${medal} <@${u.id}> — **${u.reputation}** pts`;
            }).join('\n')
        );

    await interaction.editReply({ embeds: [embed] });
}

// ═══════════════════════════════════════════════════
//  COMANDO: /valorant
//  Estadísticas de VALORANT
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const riot = require('../../modules/riotIntegration');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('valorant')
        .setDescription('Estadísticas de VALORANT')
        .addSubcommand(sub =>
            sub.setName('vincular')
                .setDescription('Vincula tu cuenta de VALORANT')
                .addStringOption(opt => opt.setName('usuario').setDescription('Nombre de jugador').setRequired(true))
                .addStringOption(opt => opt.setName('tag').setDescription('Tag (ej: LAT, #TAG)').setRequired(true))
                .addStringOption(opt => opt.setName('region').setDescription('Tu región').setRequired(false)
                    .addChoices(
                        { name: '🌎 LATAM', value: 'latam' },
                        { name: '🇺🇸 NA', value: 'na' },
                        { name: '🇧🇷 BR', value: 'br' },
                        { name: '🇪🇺 EU', value: 'eu' },
                        { name: '🌏 APAC', value: 'ap' },
                        { name: '🇰🇷 KR', value: 'kr' }
                    )))
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('Muestra estadísticas de un jugador')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuario de Discord').setRequired(false))
                .addStringOption(opt => opt.setName('jugador').setDescription('Nombre#Tag del jugador').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('desvincular')
                .setDescription('Desvincula tu cuenta de VALORANT')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const apiKey = process.env.RIOT_API_KEY;

        if (!apiKey) {
            return interaction.reply({ 
                content: '❌ La integración de Riot Games no está configurada.', 
                ephemeral: true 
            });
        }

        switch (subcommand) {
            case 'vincular':
                return await handleVincular(interaction, apiKey);
            case 'stats':
                return await handleStats(interaction, apiKey);
            case 'desvincular':
                return await handleDesvincular(interaction);
        }
    }
};

async function handleVincular(interaction, apiKey) {
    const usuario = interaction.options.getString('usuario');
    let tag = interaction.options.getString('tag').replace('#', '');
    const region = interaction.options.getString('region') || 'latam';

    await interaction.deferReply();

    const result = await riot.linkRiotAccount(
        interaction.user.id,
        interaction.guildId,
        'valorant',
        usuario,
        tag,
        region,
        apiKey
    );

    if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.error}` });
    }

    const embed = new EmbedBuilder()
        .setColor(0xFF4655)
        .setTitle(' VALORANT vinculado')
        .setDescription(`Tu cuenta **${result.gameName}#${result.tagLine}** fue vinculada correctamente.`)
        .addFields({ name: 'Región', value: region.toUpperCase(), inline: true })
        .setFooter({ text: 'Usa /valorant stats para ver tu ranking' });

    return interaction.editReply({ embeds: [embed] });
}

async function handleStats(interaction, apiKey) {
    const discordUser = interaction.options.getUser('usuario');
    const jugadorInput = interaction.options.getString('jugador');

    let account;

    if (jugadorInput) {
        // Buscar por nombre#tag
        const [name, tag] = jugadorInput.split('#');
        if (!name || !tag) {
            return interaction.reply({ content: '❌ Formato inválido. Usa: Nombre#Tag', ephemeral: true });
        }

        const riotAccount = await riot.getAccountByRiotId(name, tag, apiKey);
        if (riotAccount.error) {
            return interaction.reply({ content: `❌ ${riotAccount.error}`, ephemeral: true });
        }

        account = {
            puuid: riotAccount.puuid,
            gameName: name,
            tagLine: tag,
            region: 'latam'
        };
    } else {
        // Buscar cuenta vinculada
        const userId = discordUser?.id || interaction.user.id;
        account = riot.getLinkedAccount(userId, interaction.guildId, 'valorant');

        if (!account) {
            return interaction.reply({ 
                content: discordUser 
                    ? `❌ ${discordUser.username} no tiene una cuenta de VALORANT vinculada.`
                    : '❌ No tienes una cuenta de VALORANT vinculada. Usa `/valorant vincular` primero.',
                ephemeral: true 
            });
        }
    }

    await interaction.deferReply();

    const embed = await riot.generateValorantStatsEmbed(account, apiKey);

    if (embed.error) {
        return interaction.editReply({ content: `❌ ${embed.error}` });
    }

    return interaction.editReply({ embeds: [embed] });
}

async function handleDesvincular(interaction) {
    const deleted = riot.unlinkRiotAccount(interaction.user.id, interaction.guildId, 'valorant');

    if (deleted) {
        return interaction.reply({ content: '✅ Tu cuenta de VALORANT fue desvinculada.', ephemeral: true });
    } else {
        return interaction.reply({ content: '❌ No tenías una cuenta de VALORANT vinculada.', ephemeral: true });
    }
}

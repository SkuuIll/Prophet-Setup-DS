// ═══════════════════════════════════════════════════
//  COMANDO: /lol
//  Estadísticas de League of Legends
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const riot = require('../../modules/riotIntegration');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lol')
        .setDescription('Estadísticas de League of Legends')
        .addSubcommand(sub =>
            sub.setName('vincular')
                .setDescription('Vincula tu cuenta de LoL')
                .addStringOption(opt => opt.setName('usuario').setDescription('Nombre de invocador (ej: Player123)').setRequired(true))
                .addStringOption(opt => opt.setName('tag').setDescription('Tag (ej: LAN, NA, #TAG)').setRequired(true))
                .addStringOption(opt => opt.setName('region').setDescription('Tu región').setRequired(false)
                    .addChoices(
                        { name: '🇲🇽 LATAM Norte', value: 'la1' },
                        { name: '🇦🇷 LATAM Sur', value: 'la2' },
                        { name: '🇺🇸 NA', value: 'na1' },
                        { name: '🇧🇷 BR', value: 'br1' },
                        { name: '🇪🇺 EUW', value: 'euw1' },
                        { name: '🇪🇺 EUNE', value: 'eun1' },
                        { name: '🇰🇷 KR', value: 'kr' }
                    )))
        .addSubcommand(sub =>
            sub.setName('perfil')
                .setDescription('Muestra tu perfil de LoL vinculado'))
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('Muestra estadísticas de un jugador')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuario de Discord').setRequired(false))
                .addStringOption(opt => opt.setName('invocador').setDescription('Nombre#Tag del invocador').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('partidas')
                .setDescription('Muestra partidas recientes')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuario de Discord').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('desvincular')
                .setDescription('Desvincula tu cuenta de LoL')),

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
            case 'perfil':
            case 'stats':
                return await handleStats(interaction, apiKey);
            case 'partidas':
                return await handlePartidas(interaction, apiKey);
            case 'desvincular':
                return await handleDesvincular(interaction);
        }
    }
};

async function handleVincular(interaction, apiKey) {
    const usuario = interaction.options.getString('usuario');
    let tag = interaction.options.getString('tag').replace('#', '');
    const region = interaction.options.getString('region') || 'la1';

    await interaction.deferReply();

    const result = await riot.linkRiotAccount(
        interaction.user.id,
        interaction.guildId,
        'lol',
        usuario,
        tag,
        region,
        apiKey
    );

    if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.error}` });
    }

    const embed = new EmbedBuilder()
        .setColor(0xC89B3C)
        .setTitle(' League of Legends vinculado')
        .setDescription(`Tu cuenta **${result.gameName}#${result.tagLine}** fue vinculada correctamente.`)
        .addFields({ name: 'Región', value: region.toUpperCase(), inline: true })
        .setFooter({ text: 'Usa /lol stats para ver tus estadísticas' });

    return interaction.editReply({ embeds: [embed] });
}

async function handleStats(interaction, apiKey) {
    const discordUser = interaction.options.getUser('usuario');
    const invocadorInput = interaction.options.getString('invocador');

    let account;

    if (invocadorInput) {
        // Buscar por nombre#tag
        const [name, tag] = invocadorInput.split('#');
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
            region: 'la1'
        };
    } else {
        // Buscar cuenta vinculada
        const userId = discordUser?.id || interaction.user.id;
        account = riot.getLinkedAccount(userId, interaction.guildId, 'lol');

        if (!account) {
            return interaction.reply({ 
                content: discordUser 
                    ? `❌ ${discordUser.username} no tiene una cuenta de LoL vinculada.`
                    : '❌ No tienes una cuenta de LoL vinculada. Usa `/lol vincular` primero.',
                ephemeral: true 
            });
        }
    }

    await interaction.deferReply();

    const embed = await riot.generateLoLStatsEmbed(account, apiKey);

    if (embed.error) {
        return interaction.editReply({ content: `❌ ${embed.error}` });
    }

    // Botón para ver partidas
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`lol_matches_${account.puuid}_${account.region}`)
                .setLabel('Ver Partidas')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎮')
        );

    return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handlePartidas(interaction, apiKey) {
    const discordUser = interaction.options.getUser('usuario');
    const userId = discordUser?.id || interaction.user.id;

    const account = riot.getLinkedAccount(userId, interaction.guildId, 'lol');

    if (!account) {
        return interaction.reply({ 
            content: '❌ No tienes una cuenta de LoL vinculada. Usa `/lol vincular` primero.',
            ephemeral: true 
        });
    }

    await interaction.deferReply();

    const embed = await riot.generateMatchHistoryEmbed(account, apiKey);

    if (embed.error) {
        return interaction.editReply({ content: `❌ ${embed.error}` });
    }

    return interaction.editReply({ embeds: [embed] });
}

async function handleDesvincular(interaction) {
    const deleted = riot.unlinkRiotAccount(interaction.user.id, interaction.guildId, 'lol');

    if (deleted) {
        return interaction.reply({ content: '✅ Tu cuenta de LoL fue desvinculada.', ephemeral: true });
    } else {
        return interaction.reply({ content: '❌ No tenías una cuenta de LoL vinculada.', ephemeral: true });
    }
}

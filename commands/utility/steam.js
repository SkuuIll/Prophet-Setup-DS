// ═══════════════════════════════════════════════════
//  COMANDO: /steam
//  Integración con Steam
// ═══════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const steam = require('../../modules/steamIntegration');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steam')
        .setDescription('Integración con Steam')
        .addSubcommand(sub =>
            sub.setName('vincular')
                .setDescription('Vincula tu cuenta de Steam')
                .addStringOption(opt => 
                    opt.setName('perfil')
                        .setDescription('Steam ID, URL o vanity name')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('perfil')
                .setDescription('Muestra tu perfil de Steam vinculado')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuario de Discord').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('juegos')
                .setDescription('Muestra tu biblioteca de juegos')
                .addUserOption(opt => opt.setName('usuario').setDescription('Usuario de Discord').setRequired(false))
                .addIntegerOption(opt => opt.setName('pagina').setDescription('Página de resultados').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('Información de un juego de Steam')
                .addIntegerOption(opt => opt.setName('app_id').setDescription('App ID del juego').setRequired(false))
                .addStringOption(opt => opt.setName('nombre').setDescription('Nombre del juego').setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('desvincular')
                .setDescription('Desvincula tu cuenta de Steam')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const apiKey = process.env.STEAM_API_KEY;

        if (!apiKey && ['vincular', 'perfil', 'juegos', 'info'].includes(subcommand)) {
            return interaction.reply({ 
                content: '❌ La integración de Steam no está configurada.', 
                ephemeral: true 
            });
        }

        switch (subcommand) {
            case 'vincular':
                return await handleVincular(interaction, apiKey);
            case 'perfil':
                return await handlePerfil(interaction, apiKey);
            case 'juegos':
                return await handleJuegos(interaction);
            case 'info':
                return await handleInfo(interaction, apiKey);
            case 'desvincular':
                return await handleDesvincular(interaction);
        }
    }
};

async function handleVincular(interaction, apiKey) {
    const perfilInput = interaction.options.getString('perfil');

    await interaction.deferReply();

    const result = await steam.linkSteamAccount(
        interaction.user.id,
        interaction.guildId,
        perfilInput,
        apiKey
    );

    if (!result.success) {
        return interaction.editReply({ content: `❌ ${result.error}` });
    }

    const embed = new EmbedBuilder()
        .setColor(0x1b2838)
        .setTitle(' Steam vinculado')
        .setThumbnail(result.profile.avatar)
        .setDescription(`Tu cuenta **${result.profile.personaName}** fue vinculada correctamente.`)
        .addFields(
            { name: '🆔 Steam ID', value: result.profile.steamId, inline: true },
            { name: '🌐 País', value: result.profile.countryCode || 'N/A', inline: true }
        )
        .setFooter({ text: 'Usa /steam perfil para ver tus estadísticas' });

    return interaction.editReply({ embeds: [embed] });
}

async function handlePerfil(interaction, apiKey) {
    const discordUser = interaction.options.getUser('usuario');
    const userId = discordUser?.id || interaction.user.id;

    const account = steam.getLinkedSteamAccount(userId, interaction.guildId);

    if (!account) {
        return interaction.reply({ 
            content: discordUser 
                ? `❌ ${discordUser.username} no tiene una cuenta de Steam vinculada.`
                : '❌ No tienes una cuenta de Steam vinculada. Usa `/steam vincular` primero.',
            ephemeral: true 
        });
    }

    await interaction.deferReply();

    const embed = await steam.generateSteamProfileEmbed(account, apiKey);

    if (embed.error) {
        return interaction.editReply({ content: `❌ ${embed.error}` });
    }

    // Botones
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`steam_games_${userId}_0`)
                .setLabel('Ver Juegos')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📚'),
            new ButtonBuilder()
                .setLabel('Perfil Steam')
                .setStyle(ButtonStyle.Link)
                .setURL(account.profile_url)
        );

    return interaction.editReply({ embeds: [embed], components: [row] });
}

async function handleJuegos(interaction) {
    const discordUser = interaction.options.getUser('usuario');
    const userId = discordUser?.id || interaction.user.id;
    const pagina = interaction.options.getInteger('pagina') || 0;

    const account = steam.getLinkedSteamAccount(userId, interaction.guildId);

    if (!account) {
        return interaction.reply({ 
            content: '❌ No tienes una cuenta de Steam vinculada.',
            ephemeral: true 
        });
    }

    const embed = steam.generateLibraryEmbed(account, pagina);

    if (embed.error) {
        return interaction.reply({ content: `❌ ${embed.error}`, ephemeral: true });
    }

    // Botones de navegación
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`steam_games_${userId}_${pagina - 1}`)
                .setLabel('◀️ Anterior')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pagina === 0),
            new ButtonBuilder()
                .setCustomId(`steam_games_${userId}_${pagina + 1}`)
                .setLabel('Siguiente ▶️')
                .setStyle(ButtonStyle.Secondary)
        );

    return interaction.reply({ embeds: [embed], components: [row] });
}

async function handleInfo(interaction, apiKey) {
    let appId = interaction.options.getInteger('app_id');
    const nombre = interaction.options.getString('nombre');

    // Si se busca por nombre, buscar el app ID
    if (!appId && nombre) {
        // Buscar en la tienda de Steam
        try {
            const searchRes = await fetch(
                `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(nombre)}&cc=AR&l=spanish`
            );
            const searchData = await searchRes.json();

            if (searchData.items?.length > 0) {
                appId = searchData.items[0].id;
            } else {
                return interaction.reply({ content: '❌ Juego no encontrado.', ephemeral: true });
            }
        } catch (e) {
            return interaction.reply({ content: '❌ Error buscando el juego.', ephemeral: true });
        }
    }

    if (!appId) {
        return interaction.reply({ content: '❌ Debes especificar un app_id o nombre de juego.', ephemeral: true });
    }

    await interaction.deferReply();

    const embed = await steam.generateGameEmbed(appId, null, apiKey);

    if (embed.error) {
        return interaction.editReply({ content: `❌ ${embed.error}` });
    }

    return interaction.editReply({ embeds: [embed] });
}

async function handleDesvincular(interaction) {
    const deleted = steam.unlinkSteamAccount(interaction.user.id, interaction.guildId);

    if (deleted) {
        return interaction.reply({ content: '✅ Tu cuenta de Steam fue desvinculada.', ephemeral: true });
    } else {
        return interaction.reply({ content: '❌ No tenías una cuenta de Steam vinculada.', ephemeral: true });
    }
}

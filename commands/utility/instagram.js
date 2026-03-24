// ════════════════════════════════════════════════════════════════
// 📸 INSTAGRAM - Comando Utility
// Ver perfil/posts de Instagram
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('instagram')
        .setDescription('📸 Ver perfiles y posts de Instagram')
        .addSubcommand(sub =>
            sub.setName('perfil')
                .setDescription('👤 Ver perfil de usuario')
                .addStringOption(opt =>
                    opt.setName('username')
                        .setDescription('Nombre de usuario (sin @)')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('post')
                .setDescription('📷 Ver información de un post')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del post de Instagram')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('historia')
                .setDescription('📖 Descargar historia (URL)')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL de la historia')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('reel')
                .setDescription('🎬 Descargar Reel')
                .addStringOption(opt =>
                    opt.setName('url')
                        .setDescription('URL del Reel')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'perfil':
                return this.verPerfil(interaction);
            case 'post':
                return this.verPost(interaction);
            case 'historia':
                return this.descargarHistoria(interaction);
            case 'reel':
                return this.descargarReel(interaction);
        }
    },

    async verPerfil(interaction) {
        const username = interaction.options.getString('username').replace('@', '');

        try {
            // Usar APIs públicas alternativas
            const profileUrl = `https://www.instagram.com/${username}/`;
            
            const embed = new EmbedBuilder()
                .setTitle(`📸 @${username}`)
                .setURL(profileUrl)
                .setDescription(`Perfil de Instagram`)
                .setColor(0xE4405F)
                .addFields(
                    { name: '🔗 Ver Perfil', value: `[Abrir en Instagram](${profileUrl})`, inline: true },
                    { name: '📱 Picuki', value: `[Ver en Picuki](https://picuki.com/profile/${username})`, inline: true }
                )
                .setThumbnail(`https://ui-avatars.com/api/?name=${username}&background=E4405F&color=fff&size=200`)
                .setFooter({ text: 'Datos de fuente pública' })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('Ver en Instagram')
                        .setStyle(ButtonStyle.Link)
                        .setURL(profileUrl)
                        .setEmoji('📸'),
                    new ButtonBuilder()
                        .setLabel('Ver en Picuki')
                        .setStyle(ButtonStyle.Link)
                        .setURL(`https://picuki.com/profile/${username}`)
                );

            return interaction.editReply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error('Error buscando perfil Instagram:', error);
            return interaction.editReply({ 
                content: `❌ Error al buscar el perfil.`, 
                ephemeral: true 
            });
        }
    },

    async verPost(interaction) {
        const url = interaction.options.getString('url');

        // Validar URL de Instagram
        if (!url.match(/instagram\.com\/(p|reel|tv)\//)) {
            return interaction.editReply({ 
                content: '❌ URL de Instagram inválida. Debe ser un post, reel o IGTV.', 
                ephemeral: true 
            });
        }

        // Extraer código del post
        const postMatch = url.match(/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
        if (!postMatch) {
            return interaction.editReply({ content: '❌ No pude extraer el ID del post.', ephemeral: true });
        }

        const [, type, code] = postMatch;
        const postId = code;

        const embed = new EmbedBuilder()
            .setTitle(`📷 Post de Instagram`)
            .setURL(url)
            .setDescription(`[Ver post original](${url})`)
            .setColor(0xE4405F)
            .addFields(
                { name: '🆔 Código', value: postId, inline: true },
                { name: '📁 Tipo', value: type === 'p' ? 'Post' : type === 'reel' ? 'Reel' : 'IGTV', inline: true }
            )
            .setFooter({ text: 'Usa servicios de descarga para guardar el contenido' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ver Original')
                    .setStyle(ButtonStyle.Link)
                    .setURL(url),
                new ButtonBuilder()
                    .setLabel('Descargar (InstaSave)')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://instasave.website/${url}`),
                new ButtonBuilder()
                    .setLabel('Descargar (SaveInsta)')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://saveinsta.io/?url=${encodeURIComponent(url)}`)
            );

        return interaction.editReply({ embeds: [embed], components: [row] });
    },

    async descargarHistoria(interaction) {
        const url = interaction.options.getString('url');

        // Las historias requieren servicios especializados
        const embed = new EmbedBuilder()
            .setTitle('📖 Historia de Instagram')
            .setDescription(`Para descargar historias, usa uno de estos servicios:`)
            .setColor(0xE4405F)
            .addFields(
                { name: '🔗 Servicios de descarga', value: 
                    '• [StoriesIG](https://storiesig.info/)\n' +
                    '• [StorySaver](https://storysaver.net/)\n' +
                    '• [InstaStories](https://instastories.net/)', inline: false }
            )
            .setFooter({ text: 'Estos servicios son de terceros' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },

    async descargarReel(interaction) {
        const url = interaction.options.getString('url');

        const reelMatch = url.match(/reel\/([A-Za-z0-9_-]+)/);
        if (!reelMatch) {
            return interaction.editReply({ 
                content: '❌ URL de Reel inválida.', 
                ephemeral: true 
            });
        }

        const code = reelMatch[1];

        const embed = new EmbedBuilder()
            .setTitle('🎬 Reel de Instagram')
            .setURL(url)
            .setDescription(`[Ver Reel original](${url})`)
            .setColor(0xE4405F)
            .addFields({ name: '🆔 Código', value: code, inline: true })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ver Original')
                    .setStyle(ButtonStyle.Link)
                    .setURL(url),
                new ButtonBuilder()
                    .setLabel('Descargar (InstaSave)')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://instasave.website/${url}`),
                new ButtonBuilder()
                    .setLabel('Descargar (SnapInsta)')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://snapinsta.app/${url}`)
            );

        return interaction.editReply({ embeds: [embed], components: [row] });
    }
};

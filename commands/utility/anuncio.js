// ═══ COMANDO: /anuncio ═══

const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, WebhookClient } = require('discord.js');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anuncio')
        .setDescription('📢 Publica un anuncio con la identidad del servidor (vía webhook)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(o => o.setName('mensaje').setDescription('Contenido del anuncio').setRequired(true))
        .addStringOption(o => o.setName('titulo').setDescription('Título del embed').setRequired(false))
        .addChannelOption(o => o.setName('canal').setDescription('Canal donde publicar (default: canal actual)').setRequired(false))
        .addStringOption(o => o.setName('imagen').setDescription('URL de imagen para el embed').setRequired(false))
        .addStringOption(o => o.setName('color').setDescription('Color hex del embed (ej: #BB86FC)').setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const mensaje = interaction.options.getString('mensaje');
        const titulo = interaction.options.getString('titulo');
        const targetChannel = interaction.options.getChannel('canal') || interaction.channel;
        const imagenUrl = interaction.options.getString('imagen');
        const colorStr = interaction.options.getString('color');

        // Parsear color
        let color = 0xBB86FC;
        if (colorStr) {
            const parsed = parseInt(colorStr.replace('#', ''), 16);
            if (!isNaN(parsed)) color = parsed;
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setDescription(mensaje)
            .setTimestamp();

        if (titulo) embed.setTitle(titulo);
        if (imagenUrl) {
            try { new URL(imagenUrl); embed.setImage(imagenUrl); } catch (_) { }
        }

        // Obtener o crear webhook para el canal
        let webhookUrl = stmts.getDiscordWebhook(targetChannel.id);

        if (!webhookUrl) {
            // Crear un nuevo webhook en el canal
            try {
                const webhook = await targetChannel.createWebhook({
                    name: interaction.guild.name,
                    avatar: interaction.guild.iconURL({ size: 256 }),
                    reason: `Webhook para /anuncio — solicitado por ${interaction.user.username}`
                });
                webhookUrl = webhook.url;
                stmts.setDiscordWebhook(targetChannel.id, webhookUrl);
            } catch (e) {
                return interaction.editReply({
                    content: `❌ No pude crear el webhook. Necesito permiso \`Manage Webhooks\` en ${targetChannel}.\n\`${e.message}\``
                });
            }
        }

        // Enviar el anuncio vía webhook
        try {
            const wh = new WebhookClient({ url: webhookUrl });
            await wh.send({
                embeds: [embed],
                username: interaction.guild.name,
                avatarURL: interaction.guild.iconURL({ size: 256 }) || interaction.client.user.displayAvatarURL()
            });

            return interaction.editReply({
                content: `✅ Anuncio publicado en ${targetChannel} con la identidad de **${interaction.guild.name}**.`
            });

        } catch (e) {
            // Webhook puede haberse eliminado manualmente
            if (e.code === 10015) {
                stmts.removeDiscordWebhook(targetChannel.id);
                return interaction.editReply({ content: '❌ El webhook ya no existe. Intentá de nuevo para crear uno nuevo.' });
            }
            return interaction.editReply({ content: `❌ Error enviando el anuncio: \`${e.message}\`` });
        }
    }
};

// ════════════════════════════════════════════════════════════════
// 🎭 STICKER - Comando Fun
// Crear sticker desde imagen
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticker')
        .setDescription('🎭 Crear y gestionar stickers del servidor')
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('➕ Crear un nuevo sticker')
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nombre del sticker')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('imagen')
                        .setDescription('URL de la imagen (PNG/JPG/GIF/APNG)')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('tags')
                        .setDescription('Tags de búsqueda separados por coma')
                        .setRequired(false))
                .addStringOption(opt =>
                    opt.setName('descripcion')
                        .setDescription('Descripción del sticker')
                        .setRequired(false)))
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('ℹ️ Ver info de un sticker')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('ID del sticker')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('📋 Ver todos los stickers del servidor'))
        .addSubcommand(sub =>
            sub.setName('borrar')
                .setDescription('🗑️ Eliminar un sticker')
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('ID del sticker')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'crear':
                return this.crearSticker(interaction);
            case 'info':
                return this.infoSticker(interaction);
            case 'lista':
                return this.listaStickers(interaction);
            case 'borrar':
                return this.borrarSticker(interaction);
        }
    },

    async crearSticker(interaction) {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            return interaction.reply({ 
                content: '❌ No tenés permisos para gestionar stickers.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const nombre = interaction.options.getString('nombre');
        const imagenUrl = interaction.options.getString('imagen');
        const tags = interaction.options.getString('tags') || nombre;
        const descripcion = interaction.options.getString('descripcion') || '';

        if (nombre.length < 2 || nombre.length > 30) {
            return interaction.editReply({ 
                content: '❌ El nombre debe tener entre 2 y 30 caracteres.', 
                ephemeral: true 
            });
        }

        try {
            // Descargar imagen
            const response = await axios.get(imagenUrl, { 
                responseType: 'arraybuffer',
                maxContentLength: 500 * 1024 // 500KB max para stickers
            });

            const contentType = response.headers['content-type'];
            if (!contentType?.match(/image\/(png|jpeg|gif|webp)/)) {
                throw new Error('Formato no soportado. Usa PNG, JPG, GIF o WebP.');
            }

            const imageBuffer = Buffer.from(response.data);

            // Verificar límite de stickers
            const stickerCount = interaction.guild.stickers.cache.size;
            const maxStickers = interaction.guild.premiumTier >= 3 ? 60 : 
                                interaction.guild.premiumTier >= 2 ? 30 : 
                                interaction.guild.premiumTier >= 1 ? 15 : 5;

            if (stickerCount >= maxStickers) {
                return interaction.editReply({ 
                    content: `❌ El servidor alcanzó el límite de ${maxStickers} stickers.`, 
                    ephemeral: true 
                });
            }

            // Crear sticker
            const sticker = await interaction.guild.stickers.create({
                file: imageBuffer,
                name: nombre,
                tags: tags.split(',').map(t => t.trim()).slice(0, 5).join(', '),
                description: descripcion.substring(0, 100),
                reason: `Creado por ${interaction.user.tag}`
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Sticker Creado')
                .setDescription(`**${nombre}**`)
                .addFields(
                    { name: '📝 Nombre', value: nombre, inline: true },
                    { name: '🏷️ Tags', value: sticker.tags, inline: true },
                    { name: '🆔 ID', value: sticker.id, inline: true },
                    { name: '📊 Total stickers', value: `${stickerCount + 1}/${maxStickers}`, inline: true }
                )
                .setThumbnail(sticker.url)
                .setColor(0x4CAF50)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error creando sticker:', error);
            return interaction.editReply({ 
                content: `❌ Error al crear el sticker: ${error.message}`, 
                ephemeral: true 
            });
        }
    },

    async infoSticker(interaction) {
        const stickerId = interaction.options.getString('id');
        const sticker = interaction.guild.stickers.cache.get(stickerId);

        if (!sticker) {
            return interaction.reply({ 
                content: '❌ No encontré ese sticker en este servidor.', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎭 ${sticker.name}`)
            .setThumbnail(sticker.url)
            .addFields(
                { name: '📝 Nombre', value: sticker.name, inline: true },
                { name: '🏷️ Tags', value: sticker.tags, inline: true },
                { name: '🆔 ID', value: sticker.id, inline: true },
                { name: '🎭 Tipo', value: sticker.format, inline: true },
                { name: '📅 Creado', value: `<t:${Math.floor(sticker.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '🔗 URL', value: `[Ver original](${sticker.url})`, inline: true }
            )
            .setColor(0xE91E63)
            .setTimestamp();

        if (sticker.description) {
            embed.addFields({ name: '📄 Descripción', value: sticker.description, inline: false });
        }

        return interaction.reply({ embeds: [embed] });
    },

    async listaStickers(interaction) {
        const stickers = [...interaction.guild.stickers.cache.values()];
        
        if (stickers.length === 0) {
            return interaction.reply({ 
                content: '📋 Este servidor no tiene stickers personalizados.', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎭 Stickers del Servidor')
            .setDescription(`Total: **${stickers.length}** stickers`)
            .setColor(0xE91E63)
            .setTimestamp();

        const stickerList = stickers.slice(0, 15).map(s => 
            `• **${s.name}** (\`${s.id}\`) - ${s.tags}`
        ).join('\n');

        embed.addFields({ name: '📝 Lista', value: stickerList + (stickers.length > 15 ? `\n*...y ${stickers.length - 15} más*` : '') });

        return interaction.reply({ embeds: [embed] });
    },

    async borrarSticker(interaction) {
        const stickerId = interaction.options.getString('id');
        const sticker = interaction.guild.stickers.cache.get(stickerId);

        if (!sticker) {
            return interaction.reply({ 
                content: '❌ No encontré ese sticker.', 
                ephemeral: true 
            });
        }

        const name = sticker.name;
        await sticker.delete();

        return interaction.reply({ 
            content: `🗑️ Sticker **"${name}"** eliminado correctamente.`, 
            ephemeral: true 
        });
    }
};

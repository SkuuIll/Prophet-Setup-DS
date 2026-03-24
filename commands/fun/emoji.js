// ════════════════════════════════════════════════════════════════
// 😀 EMOJI - Comando Fun
// Crear emoji desde imagen/URL
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji')
        .setDescription('😀 Crear y gestionar emojis del servidor')
        .addSubcommand(sub =>
            sub.setName('crear')
                .setDescription('➕ Crear un nuevo emoji')
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nombre del emoji (sin :)')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('imagen')
                        .setDescription('URL de la imagen (PNG/JPG/GIF)')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('info')
                .setDescription('ℹ️ Ver info de un emoji')
                .addStringOption(opt =>
                    opt.setName('emoji')
                        .setDescription('El emoji a inspeccionar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('📋 Ver todos los emojis del servidor'))
        .addSubcommand(sub =>
            sub.setName('borrar')
                .setDescription('🗑️ Eliminar un emoji')
                .addStringOption(opt =>
                    opt.setName('emoji')
                        .setDescription('El emoji a eliminar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('editar')
                .setDescription('✏️ Editar emoji del servidor')
                .addStringOption(opt =>
                    opt.setName('emoji')
                        .setDescription('El emoji a editar')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('nombre')
                        .setDescription('Nuevo nombre')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'crear':
                return this.crearEmoji(interaction);
            case 'info':
                return this.infoEmoji(interaction);
            case 'lista':
                return this.listaEmojis(interaction);
            case 'borrar':
                return this.borrarEmoji(interaction);
            case 'editar':
                return this.editarEmoji(interaction);
        }
    },

    async crearEmoji(interaction) {
        // Verificar permisos
        if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
            return interaction.reply({ 
                content: '❌ No tenés permisos para gestionar emojis.', 
                ephemeral: true 
            });
        }

        await interaction.deferReply();

        const nombre = interaction.options.getString('nombre').toLowerCase().replace(/[^a-z0-9_]/g, '');
        const imagenUrl = interaction.options.getString('imagen');

        if (nombre.length < 2 || nombre.length > 32) {
            return interaction.editReply({ 
                content: '❌ El nombre debe tener entre 2 y 32 caracteres alfanuméricos.', 
                ephemeral: true 
            });
        }

        try {
            // Descargar imagen
            const response = await axios.get(imagenUrl, { 
                responseType: 'arraybuffer',
                maxContentLength: 256 * 1024 // 256KB max
            });

            // Verificar tipo
            const contentType = response.headers['content-type'];
            if (!contentType?.match(/image\/(png|jpeg|gif|webp)/)) {
                throw new Error('Formato de imagen no soportado. Usa PNG, JPG, GIF o WebP.');
            }

            // Redimensionar si es necesario
            let imageBuffer = Buffer.from(response.data);
            
            // Verificar tamaño del servidor
            const emojiCount = interaction.guild.emojis.cache.size;
            const maxEmojis = interaction.guild.premiumTier >= 3 ? 500 : 
                              interaction.guild.premiumTier >= 2 ? 150 : 
                              interaction.guild.premiumTier >= 1 ? 100 : 50;

            if (emojiCount >= maxEmojis) {
                return interaction.editReply({ 
                    content: `❌ El servidor alcanzó el límite de ${maxEmojis} emojis.`, 
                    ephemeral: true 
                });
            }

            // Crear emoji
            const emoji = await interaction.guild.emojis.create({
                attachment: imageBuffer,
                name: nombre
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Emoji Creado')
                .setDescription(`${emoji} \`:${nombre}:\``)
                .addFields(
                    { name: '📝 Nombre', value: nombre, inline: true },
                    { name: '🆔 ID', value: emoji.id, inline: true },
                    { name: '📊 Total emojis', value: `${emojiCount + 1}/${maxEmojis}`, inline: true }
                )
                .setThumbnail(emoji.url)
                .setColor(0x4CAF50)
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error creando emoji:', error);
            return interaction.editReply({ 
                content: `❌ Error al crear el emoji: ${error.message}`, 
                ephemeral: true 
            });
        }
    },

    async infoEmoji(interaction) {
        const emojiInput = interaction.options.getString('emoji');

        // Parsear emoji custom
        const emojiMatch = emojiInput.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
        
        if (!emojiMatch) {
            return interaction.reply({ 
                content: '❌ Eso no parece ser un emoji custom del servidor.', 
                ephemeral: true 
            });
        }

        const [, animated, name, id] = emojiMatch;
        const emoji = interaction.guild.emojis.cache.get(id);

        if (!emoji) {
            return interaction.reply({ 
                content: '❌ Ese emoji no está en este servidor.', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`${emoji} Info del Emoji`)
            .setThumbnail(emoji.url)
            .addFields(
                { name: '📝 Nombre', value: `\`:${emoji.name}:\``, inline: true },
                { name: '🆔 ID', value: emoji.id, inline: true },
                { name: '🎭 Tipo', value: emoji.animated ? 'Animado (GIF)' : 'Estático', inline: true },
                { name: '📅 Creado', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👤 Creador', value: emoji.author ? `<@${emoji.author.id}>` : 'Desconocido', inline: true },
                { name: '🔗 URL', value: `[Ver original](${emoji.url})`, inline: true }
            )
            .setColor(0x9C27B0)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    },

    async listaEmojis(interaction) {
        const emojis = [...interaction.guild.emojis.cache.values()];
        
        if (emojis.length === 0) {
            return interaction.reply({ 
                content: '📋 Este servidor no tiene emojis personalizados.', 
                ephemeral: true 
            });
        }

        const animated = emojis.filter(e => e.animated);
        const statics = emojis.filter(e => !e.animated);

        const embed = new EmbedBuilder()
            .setTitle('😀 Emojis del Servidor')
            .addFields(
                { name: '📊 Total', value: `${emojis.length}`, inline: true },
                { name: '🖼️ Estáticos', value: `${statics.length}`, inline: true },
                { name: '🎬 Animados', value: `${animated.length}`, inline: true }
            )
            .setColor(0x2196F3)
            .setTimestamp();

        // Mostrar emojis (máximo 20 para no spamear)
        const emojiList = emojis.slice(0, 20).map(e => `${e} \`:${e.name}:\``).join('\n');
        if (emojis.length > 20) {
            embed.addFields({ name: `📝 Lista (${emojis.length} total)`, value: emojiList + `\n*...y ${emojis.length - 20} más*` });
        } else {
            embed.addFields({ name: '📝 Lista', value: emojiList });
        }

        return interaction.reply({ embeds: [embed] });
    },

    async borrarEmoji(interaction) {
        const emojiInput = interaction.options.getString('emoji');
        const emojiMatch = emojiInput.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
        
        if (!emojiMatch) {
            return interaction.reply({ content: '❌ Emoji inválido.', ephemeral: true });
        }

        const emoji = interaction.guild.emojis.cache.get(emojiMatch[3]);
        
        if (!emoji) {
            return interaction.reply({ content: '❌ Ese emoji no está en este servidor.', ephemeral: true });
        }

        const name = emoji.name;
        await emoji.delete();

        return interaction.reply({ 
            content: `🗑️ Emoji **\`:${name}:\`** eliminado correctamente.`, 
            ephemeral: true 
        });
    },

    async editarEmoji(interaction) {
        const emojiInput = interaction.options.getString('emoji');
        const nuevoNombre = interaction.options.getString('nombre').toLowerCase().replace(/[^a-z0-9_]/g, '');
        
        const emojiMatch = emojiInput.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
        
        if (!emojiMatch) {
            return interaction.reply({ content: '❌ Emoji inválido.', ephemeral: true });
        }

        const emoji = interaction.guild.emojis.cache.get(emojiMatch[3]);
        
        if (!emoji) {
            return interaction.reply({ content: '❌ Ese emoji no está en este servidor.', ephemeral: true });
        }

        await emoji.setName(nuevoNombre);

        return interaction.reply({ 
            content: `✅ Emoji renombrado a **\`:${nuevoNombre}:\`** ${emoji}`, 
            ephemeral: true 
        });
    }
};

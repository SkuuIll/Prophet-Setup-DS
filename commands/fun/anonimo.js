const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anonimo')
        .setDescription('🕵️ Enviar un mensaje anónimo resaltante al chat principal')
        .addStringOption(opt =>
            opt.setName('mensaje')
                .setDescription('El mensaje anónimo que querés enviar al chat general')
                .setRequired(true)
                .setMaxLength(500)
        )
        .addUserOption(opt =>
            opt.setName('mencionar')
                .setDescription('Etiquetar a alguien para que le llegue notificación')
                .setRequired(false)
        ),

    async execute(interaction) {
        const texto = interaction.options.getString('mensaje');
        const usuario = interaction.options.getUser('mencionar');

        // Buscar el canal de chat principal usando la configuración resuelta
        const chatChannelId = config.CHANNELS.CHAT;
        const chatChannel = interaction.guild.channels.cache.get(chatChannelId) 
                            || interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes('chat') && c.isTextBased());

        if (!chatChannel) {
            return interaction.reply({
                content: `❌ No pude encontrar el canal principal del servidor para enviar el mensaje.`,
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Crear el Embed ultra resaltante para el mensaje anónimo
            const embed = new EmbedBuilder()
                .setColor(0x000000) // Color negro o muy oscuro para darle misterio
                .setAuthor({ name: '🕵️ ALGUIEN HA ENVIADO UN MENSAJE ANÓNIMO' })
                .setDescription(`\n\n# "${texto}"\n\n`) // Markdown h1 para que se vea gigante y resaltante
                .setFooter({ text: 'ProphetBot - Sistema de Confesiones Anónimas' })
                .setTimestamp();

            // Mensaje final (si hay usuario, lo mencionamos fuera del embed para que llegue la noti)
            const payload = { embeds: [embed] };
            if (usuario) {
                payload.content = `¡Hey ${usuario}! Te dejaron esto... 👀`;
            }

            // Enviar al canal principal
            await chatChannel.send(payload);

            // ====== SISTEMA DE LOGS ======
            // "en logs debe salir todo" -> Registramos silenciosamente quién lo envió para el Staff
            const logsChannelId = config.CHANNELS.LOGS;
            const logsChannel = interaction.guild.channels.cache.get(logsChannelId)
                                || interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes('log') && c.isTextBased());
            
            if (logsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor(config.COLORES.WARN || 0xFFB74D)
                    .setAuthor({ name: '📝 Log de Mensaje Anónimo', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`**Autor:** ${interaction.user} (\`${interaction.user.tag}\`)\n**Destinatario:** ${usuario ? usuario : 'Nadie (Chat General)'}\n\n**Mensaje Enviado:**\n\`\`\`\n${texto}\n\`\`\``)
                    .setFooter({ text: `User ID: ${interaction.user.id}` })
                    .setTimestamp();
                await logsChannel.send({ embeds: [logEmbed] }).catch(() => {}); // Evitamos que falle si falta el canal de logs
            }
            // =============================

            // Confirmar al usuario de forma privada
            const confirmEmbed = new EmbedBuilder()
                .setColor(config.COLORES.SUCCESS || 0x69F0AE)
                .setDescription(`> ✅ **¡Tu mensaje anónimo fue enviado al chat!**\n> Podés ir a verlo a <#${chatChannel.id}>.\n> *Tu secreto está a salvo.*`);

            return interaction.editReply({ embeds: [confirmEmbed] });
        } catch (err) {
            console.error('[Anonimo] Error ejecutando comando:', err);
            return interaction.editReply({
                content: `❌ Ocurrió un error al intentar enviar el mensaje: ${err.message}`
            });
        }
    }
};

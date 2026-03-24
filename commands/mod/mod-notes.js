// ═══════════════════════════════════════════════════════════════
// COMANDO: /mod-notes - Sistema de notas de moderación
// Prophet Bot v2.9
// ═══════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { addModNote, getUserModNotes, deleteModNote, logSecurityEvent } = require('../../modules/advancedMod');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod-notes')
        .setDescription('Sistema de notas de moderación para usuarios')
        .addSubcommand(sub =>
            sub.setName('agregar')
                .setDescription('Agregar una nota a un usuario')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario al que agregar la nota')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('nota')
                        .setDescription('Contenido de la nota')
                        .setRequired(true)
                        .setMaxLength(1000))
                .addStringOption(opt =>
                    opt.setName('tipo')
                        .setDescription('Tipo de nota')
                        .setRequired(false)
                        .addChoices(
                            { name: 'ℹ️ Info', value: 'info' },
                            { name: '⚠️ Advertencia', value: 'warning' },
                            { name: '🔴 Grave', value: 'danger' },
                            { name: '✅ Positivo', value: 'positive' }
                        )))
        .addSubcommand(sub =>
            sub.setName('ver')
                .setDescription('Ver notas de un usuario')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario a verificar')
                        .setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('eliminar')
                .setDescription('Eliminar una nota específica')
                .addIntegerOption(opt =>
                    opt.setName('id')
                        .setDescription('ID de la nota a eliminar')
                        .setRequired(true))),

    async execute(interaction) {
        // Verificar permisos
        if (!interaction.member.permissions.has('ModerateMembers')) {
            return interaction.reply({
                content: '❌ No tenés permisos para usar este comando.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const modId = interaction.user.id;

        switch (subcommand) {
            case 'agregar':
                return await addNote(interaction, guildId, modId);
            case 'ver':
                return await viewNotes(interaction, guildId);
            case 'eliminar':
                return await deleteNote(interaction, modId);
        }
    }
};

async function addNote(interaction, guildId, modId) {
    const user = interaction.options.getUser('usuario');
    const note = interaction.options.getString('nota');
    const type = interaction.options.getString('tipo') || 'info';

    addModNote(user.id, guildId, note, type, modId);

    // Log de seguridad
    logSecurityEvent(guildId, 'mod_note_added', {
        target_user: user.id,
        note_type: type,
        note_preview: note.substring(0, 100)
    }, 'low', modId);

    const typeEmoji = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'danger': '🔴',
        'positive': '✅'
    };

    const typeColor = {
        'info': 0x42A5F5,
        'warning': 0xFFB74D,
        'danger': 0xEF5350,
        'positive': 0x69F0AE
    };

    const embed = new EmbedBuilder()
        .setTitle(`${typeEmoji[type]} Nota Agregada`)
        .setColor(typeColor[type])
        .addFields(
            { name: 'Usuario', value: `<@${user.id}> (${user.tag})`, inline: true },
            { name: 'Tipo', value: type.toUpperCase(), inline: true },
            { name: 'Nota', value: note }
        )
        .setFooter({ text: `Por ${interaction.user.tag}` })
        .setTimestamp();

    // Notificar al usuario si es warning o danger
    if (['warning', 'danger'].includes(type)) {
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle(`${typeEmoji[type]} Nota de Moderación`)
                .setColor(typeColor[type])
                .setDescription(`Se te ha agregado una nota de moderación en **${interaction.guild.name}**.`)
                .addFields({ name: 'Mensaje', value: note })
                .setFooter({ text: 'Si creés que es un error, contactá al staff.' })
                .setTimestamp();
            
            await user.send({ embeds: [dmEmbed] });
            embed.addFields({ name: 'DM', value: '✅ Enviado', inline: true });
        } catch {
            embed.addFields({ name: 'DM', value: '❌ No se pudo enviar', inline: true });
        }
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
}

async function viewNotes(interaction, guildId) {
    const user = interaction.options.getUser('usuario');
    const notes = getUserModNotes(user.id, guildId);

    if (notes.length === 0) {
        return interaction.reply({
            content: `📭 <@${user.id}> no tiene notas de moderación.`,
            ephemeral: true
        });
    }

    const typeEmoji = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'danger': '🔴',
        'positive': '✅'
    };

    const embed = new EmbedBuilder()
        .setTitle(`📋 Notas de ${user.tag}`)
        .setColor(0xBB86FC)
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setDescription(`Total: ${notes.length} notas`)
        .setTimestamp();

    // Mostrar las últimas 10 notas
    const recentNotes = notes.slice(0, 10);
    
    for (const note of recentNotes) {
        const date = new Date(note.created_at);
        const dateStr = date.toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        
        embed.addFields({
            name: `${typeEmoji[note.note_type] || '📄'} #${note.id} — ${dateStr}`,
            value: `${note.note.substring(0, 150)}${note.note.length > 150 ? '...' : ''}\n*Por: <@${note.created_by}>*`,
            inline: false
        });
    }

    if (notes.length > 10) {
        embed.setFooter({ text: `Mostrando 10 de ${notes.length} notas` });
    }

    // Agregar botón para ver más
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`notes_export_${user.id}`)
                .setLabel('📄 Exportar Todas')
                .setStyle(ButtonStyle.Secondary)
        );

    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function deleteNote(interaction, modId) {
    const noteId = interaction.options.getInteger('id');

    const result = deleteModNote(noteId);

    if (result.changes === 0) {
        return interaction.reply({
            content: '❌ No encontré una nota con ese ID.',
            ephemeral: true
        });
    }

    logSecurityEvent(interaction.guild.id, 'mod_note_deleted', {
        note_id: noteId
    }, 'low', modId);

    return interaction.reply({
        content: `🗑️ Nota #${noteId} eliminada correctamente.`,
        ephemeral: true
    });
}

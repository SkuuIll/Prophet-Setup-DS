// ═══ COMANDO: /snipe — Ver últimos mensajes borrados/editados ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('👀 Ver mensajes borrados o editados recientemente')
        .addSubcommand(sub =>
            sub.setName('borrado')
                .setDescription('👀 Ver el último mensaje borrado en este canal')
                .addIntegerOption(o =>
                    o.setName('numero')
                        .setDescription('Cuántos mensajes atrás (1-5)')
                        .setMinValue(1)
                        .setMaxValue(5)))
        .addSubcommand(sub =>
            sub.setName('editado')
                .setDescription('✏️ Ver la última edición de un mensaje en este canal')
                .addIntegerOption(o =>
                    o.setName('numero')
                        .setDescription('Cuántas ediciones atrás (1-5)')
                        .setMinValue(1)
                        .setMaxValue(5))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const index = (interaction.options.getInteger('numero') || 1) - 1;

        if (sub === 'borrado') {
            const snipeList = interaction.client.snipes?.get(interaction.channel.id);

            // Soportar tanto el formato viejo (objeto suelto) como el nuevo (array)
            const snipes = Array.isArray(snipeList) ? snipeList : (snipeList ? [snipeList] : []);

            if (snipes.length === 0 || !snipes[index]) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.WARN || 0xFFB74D)
                        .setDescription('> 🕳️ No hay mensajes borrados recientemente en este canal.')
                        .setFooter({ text: 'Prophet  ·  Snipe' })],
                    ephemeral: true
                });
            }

            const snipe = snipes[index];
            const hace = formatTimeAgo(snipe.timestamp);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.ERROR || 0xEF5350)
                .setAuthor({ name: `🗑️  Mensaje borrado #${index + 1}`, iconURL: snipe.author.displayAvatarURL() })
                .setDescription(
                    `> **Autor:** ${snipe.author.tag}\n` +
                    `> **Borrado hace:** \`${hace}\`\n\n` +
                    `\`\`\`\n${(snipe.content || '[Solo imagen/archivo]').slice(0, 800)}\n\`\`\``
                )
                .setFooter({ text: `${snipes.length} borrados en caché  ·  Prophet Snipe` })
                .setTimestamp(snipe.timestamp);

            if (snipe.image) embed.setImage(snipe.image);

            return interaction.reply({ embeds: [embed] });

        } else if (sub === 'editado') {
            const editList = interaction.client.editSnipes?.get(interaction.channel.id);

            if (!editList || editList.length === 0 || !editList[index]) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.WARN || 0xFFB74D)
                        .setDescription('> ✏️ No hay ediciones recientes en este canal.')
                        .setFooter({ text: 'Prophet  ·  Edit Snipe' })],
                    ephemeral: true
                });
            }

            const edit = editList[index];
            const hace = formatTimeAgo(edit.timestamp);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES.WARN || 0xFFB74D)
                .setAuthor({ name: `✏️  Edición #${index + 1}`, iconURL: edit.author.displayAvatarURL() })
                .setDescription(
                    `> **Autor:** ${edit.author.tag}\n` +
                    `> **Editado hace:** \`${hace}\`\n\n` +
                    `**Antes:**\n\`\`\`\n${edit.oldContent.slice(0, 400)}\n\`\`\`\n` +
                    `**Después:**\n\`\`\`\n${edit.newContent.slice(0, 400)}\n\`\`\``
                )
                .setFooter({ text: `${editList.length} ediciones en caché  ·  Prophet Snipe` })
                .setTimestamp(edit.timestamp);

            return interaction.reply({ embeds: [embed] });
        }
    }
};

function formatTimeAgo(timestamp) {
    const seg = Math.floor((Date.now() - timestamp) / 1000);
    if (seg < 60) return `${seg}s`;
    if (seg < 3600) return `${Math.floor(seg / 60)}m ${seg % 60}s`;
    return `${Math.floor(seg / 3600)}h ${Math.floor((seg % 3600) / 60)}m`;
}

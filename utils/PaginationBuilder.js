// ═══════════════════════════════════════════════════
//  UTILIDAD: PaginationBuilder
//  Paginación reutilizable con botones para embeds
// ═══════════════════════════════════════════════════

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

/**
 * Crea una respuesta paginada con botones ⬅️ ➡️
 * 
 * @param {ChatInputCommandInteraction} interaction - La interacción del comando
 * @param {EmbedBuilder[]} pages - Array de embeds (uno por página)
 * @param {Object} options - Opciones adicionales
 * @param {number} options.timeout - Tiempo en ms antes de desactivar (default: 120000)
 * @param {boolean} options.ephemeral - Si la respuesta es efímera (default: false)
 * @param {boolean} options.showPageCount - Mostrar contador de páginas (default: true)
 * @param {string} options.footerPrefix - Prefijo del footer (default: '')
 * @returns {Promise<Message>}
 * 
 * @example
 * const pages = items.map((chunk, i) => {
 *     return new EmbedBuilder()
 *         .setTitle('Mi Lista')
 *         .setDescription(chunk.join('\n'));
 * });
 * await paginate(interaction, pages);
 */
async function paginate(interaction, pages, options = {}) {
    const {
        timeout = 120000,
        ephemeral = false,
        showPageCount = true,
        footerPrefix = '',
    } = options;

    if (!pages || pages.length === 0) {
        return interaction.editReply({ content: '📭 No hay nada que mostrar.', embeds: [], components: [] });
    }

    // Si es una sola página, no necesitamos botones
    if (pages.length === 1) {
        const singleEmbed = pages[0];
        if (showPageCount) {
            const currentFooter = singleEmbed.data.footer?.text || '';
            singleEmbed.setFooter({
                text: footerPrefix ? `${footerPrefix}  ·  1 resultado` : (currentFooter || '1 resultado'),
                iconURL: singleEmbed.data.footer?.icon_url
            });
        }
        return interaction.editReply({ embeds: [singleEmbed], components: [] });
    }

    let currentPage = 0;

    // Aplicar footer con contador de páginas
    function applyPageFooter(embed, pageNum) {
        if (!showPageCount) return embed;
        const pageText = `Página ${pageNum + 1}/${pages.length}`;
        const prefix = footerPrefix ? `${footerPrefix}  ·  ` : '';
        embed.setFooter({
            text: `${prefix}${pageText}`,
            iconURL: embed.data.footer?.icon_url
        });
        return embed;
    }

    function buildButtons(page) {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('page_first')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('page_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('page_indicator')
                .setLabel(`${page + 1} / ${pages.length}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('page_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === pages.length - 1),
            new ButtonBuilder()
                .setCustomId('page_last')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === pages.length - 1),
        );
    }

    applyPageFooter(pages[currentPage], currentPage);

    const response = await interaction.editReply({
        embeds: [pages[currentPage]],
        components: [buildButtons(currentPage)],
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith('page_'),
        time: timeout
    });

    collector.on('collect', async i => {
        switch (i.customId) {
            case 'page_first':
                currentPage = 0;
                break;
            case 'page_prev':
                currentPage = Math.max(0, currentPage - 1);
                break;
            case 'page_next':
                currentPage = Math.min(pages.length - 1, currentPage + 1);
                break;
            case 'page_last':
                currentPage = pages.length - 1;
                break;
        }

        applyPageFooter(pages[currentPage], currentPage);

        await i.update({
            embeds: [pages[currentPage]],
            components: [buildButtons(currentPage)]
        });
    });

    collector.on('end', () => {
        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('page_expired')
                .setLabel(`Expirado  ·  ${pages.length} páginas`)
                .setEmoji('⏰')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        );
        interaction.editReply({ components: [disabledRow] }).catch(() => { });
    });

    return response;
}

/**
 * Helper para chunkar un array en páginas de tamaño fijo
 * @param {Array} array - Array a dividir
 * @param {number} size - Tamaño de cada chunk
 * @returns {Array[]}
 */
function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

module.exports = { paginate, chunk };

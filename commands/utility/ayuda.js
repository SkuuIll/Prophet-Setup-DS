const {
    SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ButtonBuilder, ButtonStyle, ComponentType, MessageFlags,
} = require('discord.js');
const { makeEmbed } = require('../../utils/discordUI');
const { canExecuteRegisteredCommand } = require('../../utils/commandPermissions');

const PAGE_SIZE = 9;
const CATEGORIES = [
    { id: 'home', emoji: '🏠', title: 'Inicio', description: 'Resumen de las funciones' },
    { id: 'quickstart', emoji: '🚀', title: 'Empezar', description: 'Primeros pasos' },
    { id: 'economy', emoji: '💰', title: 'Economía', description: 'Monedas, banco y tienda' },
    { id: 'music', emoji: '🎵', title: 'Música', description: 'Reproducción y controles' },
    { id: 'fun', emoji: '🎮', title: 'Diversión', description: 'Juegos y actividades' },
    { id: 'gaming', emoji: '🎯', title: 'Gaming', description: 'Estadísticas de videojuegos' },
    { id: 'levels', emoji: '📈', title: 'Niveles', description: 'XP, misiones y ranking' },
    { id: 'profile', emoji: '👤', title: 'Perfil', description: 'Cuenta y reputación' },
    { id: 'utility', emoji: '🧰', title: 'Utilidades', description: 'Herramientas y consultas' },
    { id: 'context', emoji: '🖱️', title: 'Menú contextual', description: 'Clic derecho sobre usuarios' },
    { id: 'moderation', emoji: '🛡️', title: 'Moderación', description: 'Acciones para moderadores' },
    { id: 'admin', emoji: '⚙️', title: 'Administración', description: 'Configuración del servidor' },
];
const SPECIAL_LEVELS = new Set(['nivel', 'misiones', 'ranking', 'reputacion']);
const MUSIC = [
    ['play', 'Buscar y reproducir una canción'],
    ['pause', 'Pausar o reanudar la música'],
    ['skip', 'Saltar a la canción siguiente'],
    ['queue', 'Consultar la cola de reproducción'],
    ['stop', 'Detener la música y vaciar la cola'],
    ['shuffle', 'Mezclar la cola'],
    ['loop', 'Cambiar el modo de repetición'],
    ['filter', 'Aplicar efectos de audio'],
    ['volumen', 'Modificar el volumen'],
];

function categoryFor(command) {
    if (command.category === 'mod') return 'moderation';
    if (command.category === 'profile' && SPECIAL_LEVELS.has(command.data.name)) return 'levels';
    return command.category || 'utility';
}

function getCategoryCommands(client, category, permissions) {
    if (category === 'music') {
        return MUSIC.map(([name, description]) => ({ name, description, context: false }));
    }
    if (!client?.commands) return [];
    return [...client.commands.values()]
        .filter(command => categoryFor(command) === category
            && canExecuteRegisteredCommand(command.data, permissions))
        .map(command => {
            const data = command.data.toJSON();
            return {
                name: data.name,
                description: String(data.description || 'Sin descripción').replace(/^[^\p{L}\p{N}]+/u, '').slice(0, 110),
                context: command.category === 'context',
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function categoryIsVisible(client, category, permissions) {
    return category === 'home' || category === 'quickstart'
        || getCategoryCommands(client, category, permissions).length > 0;
}

function viewFor(client, user, permissions, category, page = 0) {
    const selected = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];
    const options = CATEGORIES.filter(c => categoryIsVisible(client, c.id, permissions));
    let entries = [];
    let pages = 1;
    let actualPage = 0;
    let embed;

    if (selected.id === 'home') {
        const categories = options.filter(c => !['home', 'quickstart'].includes(c.id))
            .map(c => {
                const n = getCategoryCommands(client, c.id, permissions).length;
                return c.emoji + ' **' + c.title + '** · ' + n + ' comando' + (n !== 1 ? 's' : '');
            });
        embed = makeEmbed({
            title: 'Prophet Gaming · Centro de ayuda',
            description: 'Hola, **' + (user?.globalName || user?.username || 'jugador') + '**.\n'
                + 'Elegí una categoría en el menú para explorar los comandos disponibles para vos.\n\n'
                + categories.join('\n')
                + '\n\n**Consejo:** usá `/ayuda categoria:` para entrar directamente en una sección.',
            footer: 'Información tomada de los comandos cargados · Menú válido 5 minutos',
        });
    } else if (selected.id === 'quickstart') {
        embed = makeEmbed({
            title: 'Empezá con Prophet Gaming',
            tone: 'success',
            description:
                '**1. Ganá tus primeras monedas**\n`/daily` te da una recompensa diaria y `/work` permite trabajar.\n\n'
                + '**2. Guardá y administrá tu saldo**\nConsultá `/balance`, guardá dinero con `/deposit` y retiralo con `/withdraw`.\n\n'
                + '**3. Descubrí juegos**\nUsá `/jugar` para entrar al catálogo y `/ayuda categoria:fun` para conocer otras opciones.\n\n'
                + '**4. Mirá tu progreso**\nProbá `/perfil`, `/nivel` y `/misiones`.\n\n'
                + '**5. Música y soporte**\nEntrá a un canal de voz y usá `/play`. Para pedir ayuda al equipo, utilizá el panel de tickets del servidor.',
            footer: 'Primeros pasos',
        });
    } else {
        entries = getCategoryCommands(client, selected.id, permissions);
        pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
        actualPage = Math.min(Math.max(Number(page) || 0, 0), pages - 1);
        const shown = entries.slice(actualPage * PAGE_SIZE, (actualPage + 1) * PAGE_SIZE);
        const items = shown.map(entry =>
            entry.context
                ? '**' + entry.name + '**\nClic derecho sobre un usuario → Aplicaciones · ' + entry.description
                : '**`/' + entry.name + '`**\n' + entry.description
        );
        embed = makeEmbed({
            title: selected.emoji + ' · ' + selected.title,
            tone: selected.id === 'music' ? 'music'
                : ['moderation', 'admin'].includes(selected.id) ? 'warning' : 'primary',
            description: selected.description + '\n\n'
                + (items.length ? items.join('\n\n') : 'No tenés comandos disponibles en esta categoría.'),
            footer: entries.length + ' comandos · Página ' + (actualPage + 1) + '/' + pages,
        });
    }
    return { embed, pages, page: actualPage, options, selected: selected.id };
}

function componentsFor(view, disabled = false) {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('prophet_help_category')
        .setPlaceholder('Elegí una sección…')
        .setDisabled(disabled)
        .addOptions(view.options.map(c => ({
            label: c.title,
            value: c.id,
            description: c.description,
            emoji: c.emoji,
            default: c.id === view.selected,
        })));
    const row1 = new ActionRowBuilder().addComponents(menu);
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prophet_help_prev').setLabel('Anterior')
            .setStyle(ButtonStyle.Secondary).setDisabled(disabled || view.page <= 0),
        new ButtonBuilder().setCustomId('prophet_help_home').setLabel('Inicio')
            .setStyle(ButtonStyle.Primary).setDisabled(disabled || view.selected === 'home'),
        new ButtonBuilder().setCustomId('prophet_help_next').setLabel('Siguiente')
            .setStyle(ButtonStyle.Secondary).setDisabled(disabled || view.page >= view.pages - 1),
    );
    return [row1, row2];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('Consultá las secciones y comandos que podés usar')
        .addStringOption(opt => opt.setName('categoria')
            .setDescription('Abrir una sección directamente')
            .addChoices(...CATEGORIES.filter(c => c.id !== 'home')
                .map(c => ({ name: c.title, value: c.id })))),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const client = interaction.client;
        const permissions = interaction.memberPermissions;
        let category = interaction.options.getString('categoria') || 'home';
        if (!categoryIsVisible(client, category, permissions)) category = 'home';
        let view = viewFor(client, interaction.user, permissions, category);
        const response = await interaction.editReply({
            embeds: [view.embed], components: componentsFor(view),
        });
        const collector = response.createMessageComponentCollector({ time: 300000 });
        collector.on('collect', async component => {
            if (component.user.id !== interaction.user.id) {
                return component.reply({ content: 'Abrí tu propio menú con `/ayuda`.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            if (component.isStringSelectMenu() && component.customId === 'prophet_help_category') {
                category = component.values[0];
                view = viewFor(client, interaction.user, permissions, category, 0);
            } else if (component.isButton() && component.customId === 'prophet_help_prev') {
                view = viewFor(client, interaction.user, permissions, category, view.page - 1);
            } else if (component.isButton() && component.customId === 'prophet_help_next') {
                view = viewFor(client, interaction.user, permissions, category, view.page + 1);
            } else if (component.isButton() && component.customId === 'prophet_help_home') {
                category = 'home';
                view = viewFor(client, interaction.user, permissions, category);
            } else return;
            await component.update({ embeds: [view.embed], components: componentsFor(view) })
                .catch(err => console.error('[Ayuda] Error al actualizar la sección:', err.message));
        });
        collector.on('end', () => {
            interaction.editReply({ components: componentsFor(view, true) }).catch(() => {});
        });
    },
    _test: { getCategoryCommands, viewFor, componentsFor, categoryFor },
};

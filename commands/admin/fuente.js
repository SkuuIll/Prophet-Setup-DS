'use strict';

// ═══════════════════════════════════════════════════════════
//  💎 COMANDO: /fuente — Estilizar Nombres del Clan
// ═══════════════════════════════════════════════════════════

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require('discord.js');
const config = require('../../config');
const {
    convertText,
    canManageMember,
    applyClanFont,
    applyClanFontToAll,
    restoreMemberFont,
    restoreAllMembersFont,
    getFontStylesList,
    isAutoClanFontEnabled,
    setAutoClanFontEnabled,
    getClanFontStyle,
    setClanFontStyle
} = require('../../modules/clanFont');

const FONT_CHOICES = [
    { name: 'Small Caps (Clanes Gaming) — ᴘʀᴏᴘʜᴇᴛ', value: 'small-caps' },
    { name: 'Sans Bold (Moderna Gruesa) — 𝗣𝗿𝗼𝗽𝗵𝗲𝘁', value: 'bold-sans' },
    { name: 'Serif Bold (Elegante) — 𝐏𝐫𝐨𝐩𝐡𝐞𝐭', value: 'bold-serif' },
    { name: 'Gótica / Fraktur — 𝔓𝔯𝔬𝔭𝔥𝔢𝔱', value: 'gothic' },
    { name: 'Doble Línea (Aesthetic) — ℙ𝕣𝕠𝕡𝕙𝕖𝕥', value: 'double-struck' },
    { name: 'Monospace (Código) — 𝙿𝚛𝚘𝚙𝚑𝚎𝚝', value: 'monospace' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fuente')
        .setDescription('✨ Gestiona la tipografía estilizada de los nombres de vista del clan')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addSubcommand(sub =>
            sub.setName('todos')
                .setDescription('✨ Aplica la fuente estilizada al nombre de vista de todos los miembros del clan')
                .addStringOption(opt =>
                    opt.setName('estilo')
                        .setDescription('Estilo de tipografía (Por defecto: Small Caps)')
                        .setRequired(false)
                        .addChoices(...FONT_CHOICES)
                )
        )
        .addSubcommand(sub =>
            sub.setName('usuario')
                .setDescription('✨ Aplica la fuente estilizada al nombre de vista de un usuario específico')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario al que se le aplicará la tipografía')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('estilo')
                        .setDescription('Estilo de tipografía (Por defecto: Small Caps)')
                        .setRequired(false)
                        .addChoices(...FONT_CHOICES)
                )
        )
        .addSubcommand(sub =>
            sub.setName('restaurar-todos')
                .setDescription('↩️ Restaura los nombres de vista originales de todos los miembros del clan')
        )
        .addSubcommand(sub =>
            sub.setName('restaurar-usuario')
                .setDescription('↩️ Restaura el nombre de vista original de un usuario específico')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario a restaurar')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('📜 Muestra todas las fuentes disponibles y sus ejemplos')
        )
        .addSubcommand(sub =>
            sub.setName('preview')
                .setDescription('👀 Previsualiza un texto en el estilo de fuente elegido')
                .addStringOption(opt =>
                    opt.setName('texto')
                        .setDescription('Texto o apodo a previsualizar')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('estilo')
                        .setDescription('Estilo de tipografía')
                        .setRequired(false)
                        .addChoices(...FONT_CHOICES)
                )
        )
        .addSubcommand(sub =>
            sub.setName('auto')
                .setDescription('⚙️ Configura la auto-aplicación de fuente para nuevos miembros que ingresen')
                .addBooleanOption(opt =>
                    opt.setName('activado')
                        .setDescription('True para activar la auto-aplicación al unirse, False para desactivar')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('estilo')
                        .setDescription('Estilo por defecto (Por defecto: Small Caps)')
                        .setRequired(false)
                        .addChoices(...FONT_CHOICES)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'lista') {
            const styles = getFontStylesList();
            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.PRINCIPAL || 0xBB86FC)
                .setTitle('💎  Catálogo de Fuentes Estilizadas del Clan')
                .setDescription(
                    'Puedes aplicar cualquiera de estas fuentes con `/fuente todos estilo:...` o `/fuente usuario:...`\n\n' +
                    styles.map(s => `**${s.name}** (\`${s.id}\`)\n> 📝 *Ejemplo:* \`${s.preview}\`\n> ℹ️ ${s.description}`).join('\n\n')
                )
                .setFooter({ text: 'Prophet Gaming  ·  Tipografías de Clan' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (subcommand === 'preview') {
            const texto = interaction.options.getString('texto');
            const estilo = interaction.options.getString('estilo') || 'small-caps';
            const convertido = convertText(texto, estilo);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.INFO || 0x42A5F5)
                .setTitle('👀  Previsualización de Fuente')
                .setDescription(
                    `> **Texto Original:** \`${texto}\`\n` +
                    `> **Estilo:** \`${estilo}\`\n` +
                    `> **Resultado:** \`${convertido}\`\n` +
                    `> **Longitud:** \`${convertido.length}/32 caracteres\``
                )
                .setFooter({ text: 'Prophet Gaming' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (subcommand === 'usuario') {
            const targetUser = interaction.options.getUser('usuario');
            const estilo = interaction.options.getString('estilo') || 'small-caps';
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: '❌ No se pudo encontrar al miembro en el servidor.',
                    flags: 64
                });
            }

            if (!canManageMember(member)) {
                return interaction.reply({
                    content: `❌ No puedo cambiar el apodo de **${member.user.tag}** (es el dueño del servidor o tiene un rol igual/superior al bot).`,
                    flags: 64
                });
            }

            await interaction.deferReply();
            const result = await applyClanFont(member, estilo, `Comando por ${interaction.user.tag}`);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES?.SUCCESS || 0x66BB6A)
                    .setTitle('✨  Fuente Aplicada con Éxito')
                    .setDescription(
                        `> **Usuario:** ${member} (\`${member.user.tag}\`)\n` +
                        `> **Estilo:** \`${estilo}\`\n` +
                        `> **Nombre Anterior (Vista):** \`${result.originalDisplayName}\`\n` +
                        `> **Nuevo Apodo:** \`${result.newNickname}\``
                    )
                    .setFooter({ text: 'Prophet Gaming  ·  Tipografías del Clan' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({
                    content: `❌ Error al aplicar fuente: \`${result.reason}\``
                });
            }
        }

        if (subcommand === 'restaurar-usuario') {
            const targetUser = interaction.options.getUser('usuario');
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: '❌ No se pudo encontrar al miembro en el servidor.',
                    flags: 64
                });
            }

            if (!canManageMember(member)) {
                return interaction.reply({
                    content: `❌ No tengo permisos para gestionar el apodo de **${member.user.tag}**.`,
                    flags: 64
                });
            }

            await interaction.deferReply();
            const result = await restoreMemberFont(member);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES?.INFO || 0x42A5F5)
                    .setTitle('↩️  Nombre de Vista Restaurado')
                    .setDescription(
                        `> **Usuario:** ${member} (\`${member.user.tag}\`)\n` +
                        `> **Nombre Restaurado:** \`${result.restoredName}\``
                    )
                    .setFooter({ text: 'Prophet Gaming' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({
                    content: `❌ No se pudo restaurar: \`${result.reason}\``
                });
            }
        }

        if (subcommand === 'todos') {
            const estilo = interaction.options.getString('estilo') || 'small-caps';
            await interaction.deferReply();

            const result = await applyClanFontToAll(interaction.guild, estilo, 250);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.SUCCESS || 0x66BB6A)
                .setTitle('✨  Fuente del Clan Aplicada a Todos')
                .setDescription(
                    `> 📊 **Total de miembros escaneados:** \`${result.total}\`\n` +
                    `> 💎 **Apodos convertidos:** \`${result.applied}\`\n` +
                    `> ⏭️ **Omitidos (Dueño / Roles superiores):** \`${result.skipped}\`\n` +
                    `> 🎨 **Estilo aplicado:** \`${estilo}\`\n\n` +
                    (result.applied > 0
                        ? '> 🔥 ¡Todos los integrantes del clan ahora tienen sus nombres de vista estilizados!'
                        : '> ⚠️ No se pudo modificar ningún apodo. Verifica los permisos del bot.')
                )
                .setFooter({ text: 'Prophet Gaming  ·  Clan Font Manager' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'restaurar-todos') {
            await interaction.deferReply();

            const result = await restoreAllMembersFont(interaction.guild, 250);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.INFO || 0x42A5F5)
                .setTitle('↩️  Restauración Masiva Completada')
                .setDescription(
                    `> 📊 **Total registrados en backup:** \`${result.total}\`\n` +
                    `> ↩️ **Nombres restaurados:** \`${result.restored}\`\n` +
                    `> ⏭️ **Omitidos / Sin cambios:** \`${result.skipped}\`\n\n` +
                    '> ✅ Todos los miembros con respaldo han vuelto a su nombre de vista original.'
                )
                .setFooter({ text: 'Prophet Gaming  ·  Clan Font Manager' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'auto') {
            const activado = interaction.options.getBoolean('activado');
            const estilo = interaction.options.getString('estilo') || getClanFontStyle();

            setAutoClanFontEnabled(activado);
            if (estilo) {
                setClanFontStyle(estilo);
            }

            const embed = new EmbedBuilder()
                .setColor(activado ? (config.COLORES?.SUCCESS || 0x66BB6A) : (config.COLORES?.WARN || 0xFFB74D))
                .setTitle(activado ? '✅  Auto-Fuente del Clan Activada' : '⏸️  Auto-Fuente del Clan Desactivada')
                .setDescription(
                    activado
                        ? `> ✨ Cuando un nuevo miembro ingrese al servidor, su nombre de vista se convertirá automáticamente al estilo **\`${estilo}\`**.\n` +
                          `> ℹ️ *Puedes desactivarlo en cualquier momento usando \`/fuente auto activado:False\`.*`
                        : `> 🛑 La auto-aplicación de fuentes al ingresar ha sido **desactivada**.\n` +
                          `> Los nuevos miembros conservarán su nombre sin alteraciones al unirse.`
                )
                .setFooter({ text: 'Prophet Gaming  ·  Auto Clan Font' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }
    }
};

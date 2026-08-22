// ═══════════════════════════════════════════════════
//  COMANDO: /trollnick (Gestión de Apodos Trol Argentinos)
// ═══════════════════════════════════════════════════

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require('discord.js');
const config = require('../../config');
const {
    isTrollEnabled,
    setTrollEnabled,
    getMinLevel,
    setMinLevel,
    applyTrollNickname,
    applyAllTrollNicknames,
    restoreNickname,
    restoreAllTrollNicknames,
    getTrollNicknamesList,
    canManageMember
} = require('../../modules/trollNicknames');
const { stmts } = require('../../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trollnick')
        .setDescription('🎭 Gestiona y prueba el sistema de apodos trol y tóxicos estilo argentino (Nivel 10+)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addSubcommand(sub =>
            sub.setName('test')
                .setDescription('🧪 Aplica un apodo trol argentino inmediatamente a un usuario (forzado)')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario al que se le aplicará el apodo trol')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('restore')
                .setDescription('↩️ Restaura el apodo original de un usuario')
                .addUserOption(opt =>
                    opt.setName('usuario')
                        .setDescription('Usuario a quien restaurar el apodo')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('restore-all')
                .setDescription('↩️ Restaura los apodos originales de TODOS los miembros con apodo trol')
        )
        .addSubcommand(sub =>
            sub.setName('toggle')
                .setDescription('⚡ Activa o desactiva el sistema automático de apodos trol')
                .addBooleanOption(opt =>
                    opt.setName('activado')
                        .setDescription('True para activar, False para desactivar')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('nivel')
                .setDescription('📈 Configura el nivel mínimo requerido para los apodos trol')
                .addIntegerOption(opt =>
                    opt.setName('minimo')
                        .setDescription('Nivel mínimo (por defecto 10)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('📜 Muestra la lista de apodos trols tóxicos argentinos disponibles')
        )
        .addSubcommand(sub =>
            sub.setName('all')
                .setDescription('⚡ Aplica apodos trols a TODOS los miembros elegibles del servidor')
                .addBooleanOption(opt =>
                    opt.setName('forzar')
                        .setDescription('True para aplicar a todos sin importar el nivel (False = solo nivel 10+)')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'test') {
            const targetUser = interaction.options.getUser('usuario') || interaction.user;
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: '❌ No se pudo encontrar al miembro en el servidor.',
                    flags: 64
                });
            }

            if (!canManageMember(member)) {
                return interaction.reply({
                    content: `❌ No tengo permisos suficientes para cambiar el apodo de **${member.user.tag}** (es el dueño del servidor o tiene un rol igual/superior al mío).`,
                    flags: 64
                });
            }

            await interaction.deferReply();
            const result = await applyTrollNickname(member, `Comando manual por ${interaction.user.tag}`, true);

            if (result.success) {
                const userData = stmts.getUser(member.id);
                const userLevel = userData?.level || 0;

                const embed = new EmbedBuilder()
                    .setColor(config.COLORES?.WARN || 0xFFB74D)
                    .setTitle('🎭  ¡Apodo Trol Argentino Aplicado!')
                    .setDescription(
                        `> **Víctima:** ${member} (\`${member.user.tag}\`)\n` +
                        `> **Nivel:** **${userLevel}**\n` +
                        `> **Nombre Anterior:** \`${result.originalNickname}\`\n` +
                        `> **Nuevo Apodo Trol:** \`${result.nickname}\` 🔥`
                    )
                    .setFooter({ text: 'Prophet Gaming  ·  Modo Tóxico Argentino' })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({
                    content: `❌ Error aplicando apodo: ${result.reason || 'Error desconocido'}`
                });
            }
        }

        if (subcommand === 'restore') {
            const targetUser = interaction.options.getUser('usuario');
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: '❌ No se pudo encontrar al miembro en el servidor.',
                    flags: 64
                });
            }

            await interaction.deferReply({ flags: 64 });
            const result = await restoreNickname(member);

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(config.COLORES?.EXITO || 0x69F0AE)
                    .setTitle('↩️  Apodo Restaurado')
                    .setDescription(`> Se restauró el apodo de ${member} a: **\`${result.restoredNickname}\`**`)
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({
                    content: `❌ Error restaurando apodo: ${result.reason || 'Error desconocido'}`
                });
            }
        }

        if (subcommand === 'restore-all') {
            await interaction.deferReply();
            const result = await restoreAllTrollNicknames(interaction.guild);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.EXITO || 0x69F0AE)
                .setTitle('↩️  Restauración Masiva de Apodos')
                .setDescription(
                    `> 📊 **Registros de apodos trol encontrados:** \`${result.total}\`\n` +
                    `> ✅ **Apodos restaurados con éxito:** \`${result.restored}\`\n` +
                    (result.errors.length > 0 ? `> ⚠️ **Omitidos/Errores:** \`${result.errors.length}\` (rol superior o permisos)` : '')
                )
                .setFooter({ text: 'Prophet Gaming' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'toggle') {
            const explicit = interaction.options.getBoolean('activado');
            const current = isTrollEnabled();
            const newState = explicit !== null ? explicit : !current;

            setTrollEnabled(newState);

            let extraInfo = '';
            if (!newState) {
                await interaction.deferReply();
                const res = await restoreAllTrollNicknames(interaction.guild);
                if (res.restored > 0) {
                    extraInfo = `\n\n> ↩️ **${res.restored} apodo(s) restaurado(s)** automáticamente a su nombre original.`;
                }
            }

            const embed = new EmbedBuilder()
                .setColor(newState ? (config.COLORES?.EXITO || 0x69F0AE) : (config.COLORES?.ERROR || 0xEF5350))
                .setTitle(`🎭  Sistema de Apodos Trol: ${newState ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}`)
                .setDescription(
                    `> El cambio automático de apodos al conectarse a voz para usuarios de **Nivel ${getMinLevel()}+** ` +
                    `está ahora **${newState ? 'HABILITADO' : 'DESHABILITADO'}**.\n` +
                    `> Estado persistido: \`${newState ? 'true' : 'false'}\`${extraInfo}`
                )
                .setFooter({ text: 'Prophet Gaming' })
                .setTimestamp();

            if (!newState) {
                return interaction.editReply({ embeds: [embed] });
            }
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'nivel') {
            const nuevoMin = interaction.options.getInteger('minimo');
            const actual = setMinLevel(nuevoMin);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.PRINCIPAL || 0xBB86FC)
                .setTitle('📈  Nivel Mínimo Actualizado')
                .setDescription(`> Ahora se requiere **Nivel ${actual} o superior** para recibir apodos trols automáticos al conectarse a voz.`)
                .setFooter({ text: 'Prophet Gaming' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === 'list') {
            const pool = getTrollNicknamesList();
            const sample = pool.slice(0, 30);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.WARN || 0xFFB74D)
                .setTitle('📜  Pool de Apodos Tóxicos Argentinos')
                .setDescription(
                    `> **Total de apodos en la base:** ${pool.length}\n` +
                    `> **Nivel mínimo actual:** ${getMinLevel()}\n` +
                    `> **Estado:** ${isTrollEnabled() ? '✅ Activo' : '❌ Inactivo'}\n\n` +
                    '**Ejemplos de apodos:**\n' +
                    sample.map(n => `• \`${n}\``).join('\n') +
                    (pool.length > 30 ? `\n*...y ${pool.length - 30} más + plantillas dinámicas*` : '')
                )
                .setFooter({ text: 'Prophet Gaming  ·  Cultura Gamer Argentina' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], flags: 64 });
        }

        if (subcommand === 'all') {
            if (!isTrollEnabled()) {
                return interaction.reply({
                    content: '❌ El sistema de apodos trol está **desactivado**. Para usar esta función, primero debes activarlo con `/trollnick toggle activado:True`.',
                    flags: 64
                });
            }

            const forzar = interaction.options.getBoolean('forzar') || false;
            await interaction.deferReply();

            const result = await applyAllTrollNicknames(interaction.guild, forzar);

            const embed = new EmbedBuilder()
                .setColor(config.COLORES?.WARN || 0xFFB74D)
                .setTitle('🎭  Aplicación Masiva de Apodos')
                .setDescription(
                    `> 📊 **Total miembros escaneados:** \`${result.total}\`\n` +
                    `> ✅ **Apodos cambiados con éxito:** \`${result.applied}\`\n` +
                    `> ⏭️ **Omitidos (por rol superior/dueño/nivel):** \`${result.skipped}\`\n\n` +
                    (result.applied > 0
                        ? '> 🔥 ¡Todos los miembros elegibles ahora tienen apodos trols tóxicos argentinos!'
                        : '> ⚠️ Ningún miembro pudo ser modificado. Asegurate de que el rol del bot esté arriba en la jerarquía de roles.')
                )
                .setFooter({ text: 'Prophet Gaming  ·  Modo Tóxico Server-Wide' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }
    }
};

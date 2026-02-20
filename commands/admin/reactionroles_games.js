const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, PermissionFlagsBits } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionroles_games')
        .setDescription('Crea el panel de roles para juegos (PUBG, CSGO, Ranks)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Verificar permisos
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Solo los administradores pueden usar esto.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        // Definición de Roles a crear/asignar
        // Estructura: Categoría -> { nombre_rol, color, emoji }
        const rolesConfig = {
            "PUBG Ranks": [
                { name: "PUBG: Bronze", color: 0xcd7f32, emoji: "🥉" },
                { name: "PUBG: Silver", color: 0xc0c0c0, emoji: "🥈" },
                { name: "PUBG: Gold", color: 0xffd700, emoji: "🥇" },
                { name: "PUBG: Platinum", color: 0x00ced1, emoji: "💠" },
                { name: "PUBG: Diamond", color: 0xb9f2ff, emoji: "💎" },
                { name: "PUBG: Master", color: 0xff4500, emoji: "🔥" }
            ],
            "CS:GO / CS2": [
                { name: "CS: Silver", color: 0xc0c0c0, emoji: "🔫" },
                { name: "CS: Gold Nova", color: 0xffd700, emoji: "⭐" },
                { name: "CS: Master Guardian", color: 0x4169e1, emoji: "🛡️" },
                { name: "CS: Global Elite", color: 0xffffff, emoji: "🌍" }
            ],
            "Roles Diversión/Troll": [
                { name: "Manco", color: 0x999999, emoji: "💩" },
                { name: "Carreado", color: 0xff69b4, emoji: "👶" },
                { name: "Tryhard", color: 0xff0000, emoji: "😤" },
                { name: "Tóxico", color: 0x00ff00, emoji: "☣️" }
            ]
        };

        const createdRoles = {};
        let logMsg = "⚙️ **Procesando Roles...**\n";

        // 1. Crear roles si no existen
        for (const [category, roles] of Object.entries(rolesConfig)) {
            for (const r of roles) {
                let role = interaction.guild.roles.cache.find(x => x.name === r.name);
                if (!role) {
                    try {
                        role = await interaction.guild.roles.create({
                            name: r.name,
                            color: r.color,
                            reason: 'Auto-generado por Prophet Bot para Reaction Roles'
                        });
                        logMsg += `✅ Creado rol: **${r.name}**\n`;
                    } catch (e) {
                        logMsg += `❌ Error creando rol **${r.name}**: ${e.message}\n`;
                        continue;
                    }
                } else {
                    logMsg += `ℹ️ Rol existente: **${r.name}**\n`;
                }
                createdRoles[r.name] = role;
            }
        }

        await interaction.editReply({ content: logMsg + "\n📦 **Creando paneles...**" });

        // 2. Enviar Paneles
        const channel = interaction.channel;

        for (const [category, roles] of Object.entries(rolesConfig)) {
            const embed = new EmbedBuilder()
                .setTitle(`🎮 Roles de ${category}`)
                .setDescription(`Selecciona tu rango o rol para **${category}** haciendo click en los botones.`)
                .setColor(config.COLORES.PRINCIPAL)
                .setFooter({ text: 'Prophet Gaming | Auto-Roles' });

            const rows = [];
            let currentRow = new ActionRowBuilder();

            for (let i = 0; i < roles.length; i++) {
                const roleData = roles[i];
                const roleObj = createdRoles[roleData.name];

                if (!roleObj) continue;

                const btn = new ButtonBuilder()
                    .setCustomId(`rr_auto_${roleObj.id}`) // ID especial para detectar en interactionCreate
                    .setLabel(roleData.name.replace('PUBG: ', '').replace('CS: ', ''))
                    .setEmoji(roleData.emoji)
                    .setStyle(ButtonStyle.Secondary);

                currentRow.addComponents(btn);

                if (currentRow.components.length === 5 || i === roles.length - 1) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }
            }

            if (rows.length > 0) {
                await channel.send({ embeds: [embed], components: rows });
            }
        }

        await interaction.followUp({ content: '✅ ¡Roles creados y paneles enviados exitosamente!', ephemeral: true });
    }
};

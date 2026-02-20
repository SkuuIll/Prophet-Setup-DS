// ═══ EVENTO: interactionCreate (Slash commands + Botones) ═══

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { stmts } = require('../database');
const { abrirTicket, cerrarTicket } = require('../modules/tickets');
const { participarSorteo } = require('../modules/giveaways');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction, client) {
        // ═══ SLASH COMMANDS ═══
        if (interaction.isChatInputCommand()) {
            const comando = client.commands.get(interaction.commandName);
            if (!comando) return;

            try {
                await comando.execute(interaction, client);
                stmts.addLog('COMMAND', {
                    user: interaction.user.tag,
                    userId: interaction.user.id,
                    command: interaction.commandName,
                    channel: interaction.channel.name
                });
            } catch (error) {
                console.error(`Error en /${interaction.commandName}:`, error.message);
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '⚠️  Error del sistema' })
                    .setDescription(
                        `> No se pudo ejecutar \`/${interaction.commandName}\`.\n` +
                        `> Si el problema persiste, avisá al Staff.\n\n` +
                        `\`\`\`\n${error.message.substring(0, 200)}\n\`\`\``
                    )
                    .setFooter({ text: 'Prophet Bot  ·  Error handler' })
                    .setTimestamp();

                const respuesta = { embeds: [errorEmbed], ephemeral: true };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(respuesta).catch(() => { });
                } else {
                    await interaction.reply(respuesta).catch(() => { });
                }
            }
            return;
        }

        // ═══ BOTONES ═══
        if (interaction.isButton()) {
            const id = interaction.customId;

            if (id === 'ticket_abrir') return abrirTicket(interaction);
            if (id === 'ticket_cerrar') return cerrarTicket(interaction);
            if (id === 'sorteo_participar') return participarSorteo(interaction);

            // Reaction roles via botón
            if (id.startsWith('rr_')) {
                const roleId = id.replace('rr_', '').replace('auto_', '');
                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({
                        content: '> ❌ **Rol no encontrado** — Es posible que haya sido eliminado del servidor.',
                        ephemeral: true
                    });
                }

                try {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(role);
                        await interaction.reply({
                            content: `> ➖ Se te removió el rol **${role.name}**.`,
                            ephemeral: true
                        });
                    } else {
                        await member.roles.add(role);
                        await interaction.reply({
                            content: `> ✅ Se te asignó el rol **${role.name}**.`,
                            ephemeral: true
                        });
                    }
                } catch (e) {
                    console.error('Error RR:', e);
                    await interaction.reply({
                        content: `> ❌ **Error de permisos** — No pude modificar el rol. Avisá al Staff.\n> \`${e.message}\``,
                        ephemeral: true
                    });
                }
            }
        }

        // ═══ MODALS (Formularios) ═══
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_confesion') {
                const comando = client.commands.get('confesion');
                if (comando) {
                    await comando.handleModal(interaction);
                }
            }
        }

        // ═══ SELECT MENUS (Menús desplegables) ═══
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'auto_roles_juegos') {
                const member = interaction.member;
                const guild = interaction.guild;
                const values = interaction.values; // Array de values (ej: 'role_valorant')

                // Mapeo de value a ID de rol. Asegurate de reemplazar estos IDs con los de tu servidor
                // o usar config.ROLES si están definidos ahí. Si no, buscar por nombre.
                // Como es genérico, buscaremos los roles por los nombres que definimos o algo similar
                const roleMap = {
                    'role_valorant': guild.roles.cache.find(r => r.name.toLowerCase().includes('valorant'))?.id,
                    'role_lol': guild.roles.cache.find(r => r.name.toLowerCase().includes('league') || r.name.toLowerCase().includes('lol'))?.id,
                    'role_minecraft': guild.roles.cache.find(r => r.name.toLowerCase().includes('minecraft'))?.id,
                    'role_cs2': guild.roles.cache.find(r => r.name.toLowerCase().includes('cs') || r.name.toLowerCase().includes('counter'))?.id,
                    'role_gta': guild.roles.cache.find(r => r.name.toLowerCase().includes('gta') || r.name.toLowerCase().includes('roleplay'))?.id,
                };

                let assigned = [];
                let removed = [];

                // Todos los IDs que maneja este menú
                const allMenuRoleIds = Object.values(roleMap).filter(id => id);

                try {
                    // Remover roles de este menú que el usuario NO seleccionó
                    for (const roleId of allMenuRoleIds) {
                        const isSelected = Object.keys(roleMap).some(key => roleMap[key] === roleId && values.includes(key));
                        if (!isSelected && member.roles.cache.has(roleId)) {
                            await member.roles.remove(roleId);
                            removed.push(guild.roles.cache.get(roleId).name);
                        }
                    }

                    // Añadir roles que el usuario SI seleccionó
                    for (const value of values) {
                        const roleId = roleMap[value];
                        if (roleId && !member.roles.cache.has(roleId)) {
                            await member.roles.add(roleId);
                            assigned.push(guild.roles.cache.get(roleId).name);
                        }
                    }

                    let msg = '✅ **Roles actualizados correctamente.**\n';
                    if (assigned.length > 0) msg += `> ➕ **Añadidos:** ${assigned.join(', ')}\n`;
                    if (removed.length > 0) msg += `> ➖ **Removidos:** ${removed.join(', ')}\n`;
                    if (assigned.length === 0 && removed.length === 0) msg = '✅ **Tus roles ya estaban al día.**';

                    await interaction.reply({ content: msg, ephemeral: true });

                } catch (e) {
                    console.error('Error aplicando Select Menu Roles:', e);
                    await interaction.reply({ content: '❌ **Error de permisos.** No pude modificar tus roles.', ephemeral: true });
                }
            }
        }
    }
};

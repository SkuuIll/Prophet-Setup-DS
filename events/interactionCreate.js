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
            } catch (error) {
                console.error(`Error en /${interaction.commandName}:`, error.message);
                const respuesta = {
                    content: '❌ Hubo un error ejecutando el comando.',
                    ephemeral: true
                };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(respuesta);
                } else {
                    await interaction.reply(respuesta);
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
                const roleId = id.replace('rr_', '');
                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(roleId);
                if (!role) return interaction.reply({ content: '❌ Rol no encontrado.', ephemeral: true });

                try {
                    if (member.roles.cache.has(roleId)) {
                        await member.roles.remove(role);
                        await interaction.reply({ content: `❌ Rol **${role.name}** removido.`, ephemeral: true });
                    } else {
                        await member.roles.add(role);
                        await interaction.reply({ content: `✅ Rol **${role.name}** asignado.`, ephemeral: true });
                    }
                } catch (e) {
                    await interaction.reply({ content: `❌ No pude modificar el rol: ${e.message}`, ephemeral: true });
                }
            }
        }

        // ═══ REACTION ROLES (legacy reactions) ═══
        // Se manejan directamente por los botones ahora
    }
};

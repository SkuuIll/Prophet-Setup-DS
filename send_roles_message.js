const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('./config');
const { getChannel } = require('./utils/runtimeConfig');
require('dotenv').config();

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('clientReady', async () => {
    console.log(`🤖 Logueado como ${client.user.tag}`);
    const guild = client.guilds.cache.get(config.GUILD_ID);

    if (!guild) {
        console.error('❌ No se encontró el servidor.');
        process.exit(1);
    }

    const channel = getChannel(guild, 'ROLES');

    if (!channel) {
        console.error('❌ No se encontró el canal de roles.');
        process.exit(1);
    }

    // Helper para buscar rol por nombre y formatearlo
    const getRole = (name) => {
        const role = guild.roles.cache.find(r => r.name === name);
        return role ? `<@&${role.id}>` : `**${name}**`;
    };

    const embed = new EmbedBuilder()
        .setColor(config.COLORES.PRINCIPAL)
        .setTitle('🏷️ ROLES Y RANGOS DE PROPHET GAMING')
        .setDescription('Acá tenés una guía completa de todos los roles del servidor y cómo conseguirlos.')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setImage('https://media.discordapp.net/attachments/123456789/123456789/banner_roles.png?width=800&height=200') // Placeholder o usar el banner si hubiera URL pública
        .addFields(
            {
                name: '👑 STAFF (Administración)',
                value:
                    `${getRole('👑 Prophet')} ➤ Dueño y fundador.\n` +
                    `${getRole('🛡️ Staff')} ➤ Administradores del servidor.\n` +
                    `${getRole('⚔️ Moderador')} ➤ Encargados de mantener el orden.`
            },
            {
                name: '💎 MEMBRESÍA',
                value:
                    `${getRole('💎 VIP')} ➤ Miembros con beneficios exclusivos.\n` +
                    `${getRole('👤 Miembro')} ➤ Usuarios verificados de la comunidad.\n` +
                    `${getRole('🆕 Nuevo')} ➤ Usuarios recién llegados.`
            },
            {
                name: '🏆 SISTEMA DE NIVELES (Chat XP)',
                value: 'Subís de nivel hablando en el chat. Cada nivel desbloquea un nuevo rol automáticamente.'
            }
        );

    // Agregar niveles
    let nivelesTexto = '';
    const sortedLevels = Object.entries(config.NIVELES.ROLES_POR_NIVEL).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

    for (const [lvl, roleName] of sortedLevels) {
        nivelesTexto += `\`Lvl ${lvl}\` ➤ ${getRole(roleName)}\n`;
    }

    embed.addFields({ name: '📈 Rangos por XP', value: nivelesTexto });

    embed.setFooter({ text: 'Prophet Gaming | Sistema de Roles', iconURL: client.user.displayAvatarURL() });
    embed.setTimestamp();

    // Enviar mensaje
    try {
        // Opcional: Borrar mensajes viejos del bot en ese canal para limpiar
        // const messages = await channel.messages.fetch({ limit: 10 });
        // const botMsgs = messages.filter(m => m.author.id === client.user.id);
        // if (botMsgs.size > 0) await channel.bulkDelete(botMsgs);

        await channel.send({ embeds: [embed] });
        console.log(`✅ Embed de roles enviado correctamente a #${channel.name}`);
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
    }

    process.exit(0);
});

client.login(config.TOKEN);

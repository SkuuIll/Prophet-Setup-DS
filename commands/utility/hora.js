// ════════════════════════════════════════════════════════════════
// 🕐 HORA - Comando Utility
// Hora mundial con conversión de zonas horarias
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const TIMEZONES = {
    'argentina': 'America/Argentina/Buenos_Aires',
    'chile': 'America/Santiago',
    'colombia': 'America/Bogota',
    'mexico': 'America/Mexico_City',
    'peru': 'America/Lima',
    'españa': 'Europe/Madrid',
    'new_york': 'America/New_York',
    'los_angeles': 'America/Los_Angeles',
    'london': 'Europe/London',
    'paris': 'Europe/Paris',
    'tokyo': 'Asia/Tokyo',
    'dubai': 'Asia/Dubai',
    'sydney': 'Australia/Sydney',
    'utc': 'UTC'
};

const POPULAR_CITIES = [
    { name: 'Buenos Aires', tz: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
    { name: 'Madrid', tz: 'Europe/Madrid', flag: '🇪🇸' },
    { name: 'Ciudad de México', tz: 'America/Mexico_City', flag: '🇲🇽' },
    { name: 'Nueva York', tz: 'America/New_York', flag: '🇺🇸' },
    { name: 'Londres', tz: 'Europe/London', flag: '🇬🇧' },
    { name: 'Tokio', tz: 'Asia/Tokyo', flag: '🇯🇵' },
    { name: 'Sídney', tz: 'Australia/Sydney', flag: '🇦🇺' },
    { name: 'Dubái', tz: 'Asia/Dubai', flag: '🇦🇪' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hora')
        .setDescription('🕐 Consulta la hora en cualquier parte del mundo')
        .addStringOption(opt =>
            opt.setName('zona')
                .setDescription('Ciudad o zona horaria')
                .setRequired(false)
                .setAutocomplete(true))
        .addBooleanOption(opt =>
            opt.setName('comparar')
                .setDescription('Mostrar comparación con otras ciudades')
                .setRequired(false)),

    async execute(interaction) {
        const zonaInput = interaction.options.getString('zona');
        const comparar = interaction.options.getBoolean('comparar') ?? false;

        const embed = new EmbedBuilder()
            .setColor(0x7C4DFF)
            .setTimestamp();

        if (zonaInput) {
            // Buscar zona horaria
            const tzKey = zonaInput.toLowerCase().replace(/[\s-]/g, '_');
            const timezone = TIMEZONES[tzKey] || TIMEZONES[zonaInput.toLowerCase()];
            
            if (!timezone) {
                return interaction.reply({ 
                    content: `❌ No encontré la zona horaria **"${zonaInput}"**.\nProbá con: argentina, españa, mexico, new_york, tokyo, etc.`,
                    ephemeral: true 
                });
            }

            const time = getTimeInZone(timezone);
            
            embed.setTitle(`🕐 Hora en ${zonaInput}`)
                .addFields(
                    { name: '⏰ Hora', value: `**${time.time}**`, inline: true },
                    { name: '📅 Fecha', value: `**${time.date}**`, inline: true },
                    { name: '🌍 Zona', value: `\`${timezone}\``, inline: true }
                );

            if (comparar) {
                embed.addFields({ name: '\u200B', value: '**🌍 Otras ciudades:**' });
                for (const city of POPULAR_CITIES) {
                    const cityTime = getTimeInZone(city.tz);
                    embed.addFields({ 
                        name: `${city.flag} ${city.name}`, 
                        value: `${cityTime.time}`, 
                        inline: true 
                    });
                }
            }
        } else {
            // Mostrar hora en múltiples ciudades
            embed.setTitle('🕐 Hora Mundial');
            
            const rows = [];
            for (const city of POPULAR_CITIES) {
                const time = getTimeInZone(city.tz);
                rows.push(`${city.flag} **${city.name}**: ${time.time} - ${time.dateShort}`);
            }
            
            embed.setDescription(rows.join('\n'));
        }

        return interaction.reply({ embeds: [embed] });
    },

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = Object.keys(TIMEZONES).concat(POPULAR_CITIES.map(c => c.name));
        
        const filtered = choices
            .filter(c => c.toLowerCase().includes(focused))
            .slice(0, 25);
        
        await interaction.respond(filtered.map(c => ({ name: c, value: c })));
    }
};

function getTimeInZone(timezone) {
    const now = new Date();
    
    const time = now.toLocaleTimeString('es-ES', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const date = now.toLocaleDateString('es-ES', {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const dateShort = now.toLocaleDateString('es-ES', {
        timeZone: timezone,
        day: '2-digit',
        month: 'short'
    });

    return { time, date, dateShort };
}

// ════════════════════════════════════════════════════════════════
// 🌤️ CLIMA - Comando Utility
// Info meteorológica con pronóstico extendido
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const WEATHER_CODES = {
    0: { desc: 'Despejado', emoji: '☀️' },
    1: { desc: 'Mayormente despejado', emoji: '🌤️' },
    2: { desc: 'Parcialmente nublado', emoji: '⛅' },
    3: { desc: 'Nublado', emoji: '☁️' },
    45: { desc: 'Neblina', emoji: '🌫️' },
    48: { desc: 'Neblina con escarcha', emoji: '🌫️' },
    51: { desc: 'Llovizna ligera', emoji: '🌧️' },
    53: { desc: 'Llovizna moderada', emoji: '🌧️' },
    55: { desc: 'Llovizna intensa', emoji: '🌧️' },
    61: { desc: 'Lluvia ligera', emoji: '🌧️' },
    63: { desc: 'Lluvia moderada', emoji: '🌧️' },
    65: { desc: 'Lluvia intensa', emoji: '🌧️' },
    71: { desc: 'Nevada ligera', emoji: '🌨️' },
    73: { desc: 'Nevada moderada', emoji: '🌨️' },
    75: { desc: 'Nevada intensa', emoji: '❄️' },
    77: { desc: 'Granizo', emoji: '🌨️' },
    80: { desc: 'Chubascos ligeros', emoji: '🌦️' },
    81: { desc: 'Chubascos moderados', emoji: '🌦️' },
    82: { desc: 'Chubascos violentos', emoji: '⛈️' },
    85: { desc: 'Chubascos de nieve ligeros', emoji: '🌨️' },
    86: { desc: 'Chubascos de nieve intensos', emoji: '🌨️' },
    95: { desc: 'Tormenta', emoji: '⛈️' },
    96: { desc: 'Tormenta con granizo ligero', emoji: '⛈️' },
    99: { desc: 'Tormenta con granizo intenso', emoji: '⛈️' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clima')
        .setDescription('🌤️ Consulta el clima actual y pronóstico')
        .addStringOption(opt => 
            opt.setName('ciudad')
                .setDescription('Nombre de la ciudad')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('unidad')
                .setDescription('Unidad de temperatura')
                .setRequired(false)
                .addChoices(
                    { name: 'Celsius (°C)', value: 'celsius' },
                    { name: 'Fahrenheit (°F)', value: 'fahrenheit' }
                )),

    async execute(interaction) {
        await interaction.deferReply();

        const ciudad = interaction.options.getString('ciudad');
        const unidad = interaction.options.getString('unidad') || 'celsius';

        try {
            // Geocoding - obtener coordenadas
            const geoRes = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
                params: {
                    name: ciudad,
                    count: 1,
                    language: 'es',
                    format: 'json'
                }
            });

            if (!geoRes.data.results || geoRes.data.results.length === 0) {
                return interaction.editReply({ 
                    content: `❌ No encontré la ciudad **"${ciudad}"**. Probá con otra búsqueda.`,
                    ephemeral: true 
                });
            }

            const location = geoRes.data.results[0];
            const { latitude, longitude, name, country, admin1 } = location;

            // Weather API (Open-Meteo - gratuito, sin API key)
            const weatherRes = await axios.get('https://api.open-meteo.com/v1/forecast', {
                params: {
                    latitude,
                    longitude,
                    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,uv_index',
                    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                    timezone: 'auto',
                    forecast_days: 5,
                    temperature_unit: unidad === 'fahrenheit' ? 'fahrenheit' : 'celsius'
                }
            });

            const current = weatherRes.data.current;
            const daily = weatherRes.data.daily;
            const tempUnit = unidad === 'fahrenheit' ? '°F' : '°C';
            const weatherInfo = WEATHER_CODES[current.weather_code] || { desc: 'Desconocido', emoji: '🌡️' };

            // Embed principal
            const embed = new EmbedBuilder()
                .setTitle(`${weatherInfo.emoji} Clima en ${name}`)
                .setDescription(`**${admin1 ? admin1 + ', ' : ''}${country}**`)
                .setColor(0x4FC3F7)
                .addFields(
                    { 
                        name: '🌡️ Temperatura', 
                        value: `**${Math.round(current.temperature_2m)}${tempUnit}**\n(Sensación: ${Math.round(current.apparent_temperature)}${tempUnit})`, 
                        inline: true 
                    },
                    { 
                        name: '☁️ Condición', 
                        value: `**${weatherInfo.desc}**`, 
                        inline: true 
                    },
                    { 
                        name: '💧 Humedad', 
                        value: `**${current.relative_humidity_2m}%**`, 
                        inline: true 
                    },
                    { 
                        name: '💨 Viento', 
                        value: `**${Math.round(current.wind_speed_10m)} km/h**\n${getWindDirection(current.wind_direction_10m)}`, 
                        inline: true 
                    },
                    { 
                        name: '🔵 Presión', 
                        value: `**${Math.round(current.pressure_msl)} hPa**`, 
                        inline: true 
                    },
                    { 
                        name: '☀️ UV Index', 
                        value: `**${current.uv_index || 'N/A'}** ${getUVLevel(current.uv_index)}`, 
                        inline: true 
                    }
                )
                .setFooter({ text: `Actualizado • Datos de Open-Meteo` })
                .setTimestamp();

            // Pronóstico extendido
            const forecastLines = [];
            for (let i = 0; i < Math.min(5, daily.time.length); i++) {
                const date = new Date(daily.time[i]);
                const dayName = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : 
                    date.toLocaleDateString('es-ES', { weekday: 'short' });
                const dayWeather = WEATHER_CODES[daily.weather_code[i]] || { emoji: '🌡️' };
                
                forecastLines.push(
                    `**${dayName}** ${dayWeather.emoji} ${Math.round(daily.temperature_2m_min[i])}° - ${Math.round(daily.temperature_2m_max[i])}° ${daily.precipitation_probability_max[i] > 50 ? '🌧️' : ''}`
                );
            }

            embed.addFields({ 
                name: '📅 Pronóstico 5 días', 
                value: forecastLines.join('\n'), 
                inline: false 
            });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error en /clima:', error.message);
            return interaction.editReply({ 
                content: `❌ Error al obtener el clima. Probá de nuevo más tarde.`,
                ephemeral: true 
            });
        }
    }
};

function getWindDirection(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

function getUVLevel(uv) {
    if (!uv) return '';
    if (uv < 3) return '(Bajo)';
    if (uv < 6) return '(Moderado)';
    if (uv < 8) return '(Alto)';
    if (uv < 11) return '(Muy alto)';
    return '(Extremo)';
}

// ═══ COMANDO: /color ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const int = parseInt(clean, 16);
    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255,
    };
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function getColorName(r, g, b) {
    // Categorización aproximada por nombre
    const h = rgbToHsl(r, g, b).h;
    const s = rgbToHsl(r, g, b).s;
    const l = rgbToHsl(r, g, b).l;

    if (l < 10) return 'Negro';
    if (l > 90) return 'Blanco';
    if (s < 15) return l < 50 ? 'Gris oscuro' : 'Gris claro';

    if (h < 15 || h >= 345) return 'Rojo';
    if (h < 30) return 'Rojo-Naranja';
    if (h < 45) return 'Naranja';
    if (h < 65) return 'Amarillo';
    if (h < 80) return 'Amarillo-Verde';
    if (h < 150) return 'Verde';
    if (h < 170) return 'Verde-Azulado';
    if (h < 200) return 'Cian';
    if (h < 255) return 'Azul';
    if (h < 285) return 'Azul-Violeta';
    if (h < 320) return 'Violeta';
    if (h < 345) return 'Rosa';
    return 'Rojo';
}

function getTonalidad(l) {
    if (l < 20) return 'Muy oscuro';
    if (l < 40) return 'Oscuro';
    if (l < 60) return 'Medio';
    if (l < 80) return 'Claro';
    return 'Muy claro';
}

function parseColor(input) {
    const clean = input.trim().replace(/^#/, '');

    // Hex 3 o 6 dígitos
    if (/^[0-9a-fA-F]{3}$/.test(clean)) {
        const exp = clean.split('').map(c => c + c).join('');
        return '#' + exp;
    }
    if (/^[0-9a-fA-F]{6}$/.test(clean)) {
        return '#' + clean;
    }

    // RGB(r, g, b)
    const rgbMatch = input.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        if ([r, g, b].every(n => n >= 0 && n <= 255)) {
            return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
        }
    }

    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('color')
        .setDescription('🎨 Ver un preview visual de cualquier color')
        .addStringOption(o =>
            o.setName('color')
                .setDescription('Código hex (#FF5733, BB86FC) o RGB (rgb(255, 87, 51))')
                .setRequired(true)),

    async execute(interaction) {
        const input = interaction.options.getString('color');
        const hex = parseColor(input);

        if (!hex) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '🎨  Color · Formato inválido' })
                    .setDescription(
                        `> ❌ No pude interpretar \`${input}\`\n\n` +
                        `**Formatos aceptados:**\n` +
                        `> \`#FF5733\` — Hex 6 dígitos\n` +
                        `> \`#F53\` — Hex 3 dígitos\n` +
                        `> \`BB86FC\` — Hex sin #\n` +
                        `> \`rgb(187, 134, 252)\` — RGB`
                    )
                ],
                ephemeral: true
            });
        }

        const intColor = parseInt(hex.replace('#', ''), 16);
        const { r, g, b } = hexToRgb(hex);
        const { h, s, l } = rgbToHsl(r, g, b);
        const nombre = getColorName(r, g, b);
        const tono = getTonalidad(l);

        // URL de imagen de color sólido via placeholder API
        const previewURL = `https://singlecolorimage.com/get/${hex.replace('#', '')}/200x200`;

        const embed = new EmbedBuilder()
            .setColor(intColor)
            .setAuthor({ name: '🎨  Vista previa de Color · Prophet Bot' })
            .setDescription(
                `## ${nombre} — *${tono}*\n\n` +
                `> Este embed usa el color como fondo lateral.`
            )
            .addFields(
                { name: '🔢 HEX', value: `\`${hex.toUpperCase()}\``, inline: true },
                { name: '🌈 RGB', value: `\`rgb(${r}, ${g}, ${b})\``, inline: true },
                { name: '💡 HSL', value: `\`hsl(${h}°, ${s}%, ${l}%)\``, inline: true },
                { name: '🔵 R', value: `\`${r}\``, inline: true },
                { name: '🟢 G', value: `\`${g}\``, inline: true },
                { name: '🔴 B', value: `\`${b}\``, inline: true },
            )
            .setThumbnail(previewURL)
            .setFooter({ text: `Buscado por ${interaction.user.username}  ·  Prophet Bot` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

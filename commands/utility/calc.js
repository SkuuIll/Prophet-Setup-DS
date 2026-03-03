// ═══ COMANDO: /calc ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

// Evaluador matemático seguro (sin eval)
function safeEval(expr) {
    // Limpiar
    const clean = expr
        .replace(/[^0-9+\-*/%.^()√ ,]/g, '')  // solo chars seguros
        .replace(/\^/g, '**')                   // potencia
        .replace(/√(\d+(\.\d+)?)/g, 'Math.sqrt($1)') // raíz cuadrada
        .trim();

    if (!clean) throw new Error('Expresión vacía');
    if (clean.length > 200) throw new Error('Expresión demasiado larga');

    // Usar Function (más seguro que eval, en sandbox limitado)
    // Solo permitimos operaciones y Math
    const result = new Function(
        'Math',
        `"use strict"; return (${clean});`
    )(Math);

    if (typeof result !== 'number') throw new Error('Resultado no es un número');
    if (!isFinite(result)) throw new Error(result === Infinity ? 'División entre cero / Infinito' : 'Resultado inválido (NaN)');

    return result;
}

function formatResult(num) {
    if (Number.isInteger(num)) return num.toLocaleString('es-AR');
    return parseFloat(num.toFixed(10)).toLocaleString('es-AR', { maximumFractionDigits: 10 });
}

const EJEMPLOS = [
    '`2500 * 1.21` → IVA del 21%',
    '`(1500 + 800) / 3` → División',
    '`2**10` → Potencias (2¹⁰)',
    '`√144` → Raíz cuadrada',
    '`(100 - 25) * 0.15` → Porcentajes',
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calc')
        .setDescription('🧮 Calcular una expresión matemática')
        .addStringOption(o =>
            o.setName('expresion')
                .setDescription('Ej: 1500 * 1.21, (100 - 25) / 4, 2**10, √144')
                .setRequired(true)),

    async execute(interaction) {
        const expr = interaction.options.getString('expresion').trim();

        let result;
        let error = null;

        try {
            result = safeEval(expr);
        } catch (e) {
            error = e.message;
        }

        if (error || result === undefined) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '🧮  Calculadora · Error' })
                    .setDescription(
                        `> ❌ **No pude resolver:** \`${expr}\`\n` +
                        `> *${error || 'Expresión inválida'}*\n\n` +
                        `**Ejemplos válidos:**\n` +
                        EJEMPLOS.map(e => `> ${e}`).join('\n')
                    )
                    .setFooter({ text: 'Operadores: + - * / ** % √ ( )  ·  Prophet Bot' })
                ],
                ephemeral: true
            });
        }

        // Determinar color según resultado
        const color = result > 0
            ? (config.COLORES.SUCCESS || 0x69F0AE)
            : result < 0
                ? (config.COLORES.WARN || 0xFFB74D)
                : (config.COLORES.INFO || 0x42A5F5);

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: '🧮  Calculadora · Prophet Bot' })
                .setDescription(
                    `**Expresión:**\n> \`\`\`\n> ${expr}\n> \`\`\`\n\n` +
                    `**Resultado:**\n> ## \`${formatResult(result)}\``
                )
                .setFooter({ text: `Calculado por ${interaction.user.username}  ·  Prophet Bot` })
                .setTimestamp()
            ]
        });
    }
};

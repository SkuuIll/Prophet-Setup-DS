// ════════════════════════════════════════════════════════════════
// 🧮 CALCULADORA - Comando Utility
// Calculadora avanzada con historial
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { evaluateMathExpression } = require('../../utils/mathExpression');

const historiales = new Map();
const HISTORIAL_MAX = 20;
const MAX_EXPR_LENGTH = 120;
const SUPPORTED_FUNCTIONS = new Set(['sqrt', 'cbrt', 'abs', 'sin', 'cos', 'tan', 'log', 'ln', 'exp', 'floor', 'ceil', 'round']);
const CONVERSIONS = {
    km: { mi: value => value * 0.621371 },
    mi: { km: value => value * 1.60934 },
    c: { f: value => value * 9 / 5 + 32 },
    f: { c: value => (value - 32) * 5 / 9 },
    kg: { lb: value => value * 2.20462 },
    lb: { kg: value => value * 0.453592 },
    gb: { mb: value => value * 1024 },
    mb: { gb: value => value / 1024 },
    m: { ft: value => value * 3.28084 },
    ft: { m: value => value * 0.3048 }
};

setInterval(() => {
    if (historiales.size > 100) {
        const keys = Array.from(historiales.keys()).slice(0, historiales.size - 100);
        keys.forEach(k => historiales.delete(k));
    }
}, 30 * 60 * 1000);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculadora')
        .setDescription('🧮 Calculadora avanzada con historial')
        .addStringOption(opt =>
            opt.setName('operacion')
                .setDescription('Operación matemática (ej: 2+2, sqrt(16), 15%200)')
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('modo')
                .setDescription('Modo de calculadora')
                .setRequired(false)
                .addChoices(
                    { name: '🧮 Básica', value: 'basica' },
                    { name: '📊 Científica', value: 'cientifica' },
                    { name: '📈 Conversor', value: 'conversor' }
                )),

    async execute(interaction) {
        const operacion = interaction.options.getString('operacion');
        const modo = interaction.options.getString('modo') || 'basica';

        if (operacion) {
            return this.calcular(interaction, operacion, modo);
        }

        const embed = new EmbedBuilder()
            .setTitle('🧮 Calculadora Prophet')
            .setDescription('```\n┌─────────────────┐\n│                 │\n└─────────────────┘\n```')
            .addFields(
                {
                    name: '📝 Operaciones soportadas', value:
                        '`+` `-` `*` `/` `%` `^`\n' +
                        '`sqrt()` `cbrt()` `abs()`\n' +
                        '`sin()` `cos()` `tan()`\n' +
                        '`log()` `ln()` `exp()`\n' +
                        '`floor()` `ceil()` `round()`\n' +
                        '`pi` `e`', inline: true
                },
                {
                    name: '📊 Conversores', value:
                        '`10km->mi` `5mi->km`\n' +
                        '`30c->f` `86f->c`\n' +
                        '`4kg->lb` `8lb->kg`\n' +
                        '`2gb->mb` `2048mb->gb`', inline: true
                }
            )
            .setColor(0x4CAF50)
            .setFooter({ text: 'Usa /calculadora operacion:"tu operacion"' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('calc_basica')
                    .setLabel('Básica')
                    .setEmoji('🧮')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('calc_cientifica')
                    .setLabel('Científica')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('calc_historial')
                    .setLabel('Historial')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Success)
            );

        return interaction.reply({ embeds: [embed], components: [row] });
    },

    async calcular(interaction, expr, modo) {
        try {
            const normalized = normalizeExpression(expr);
            let resultado = null;
            let resultMode = modo;

            if (normalized.includes('->')) {
                resultado = handleConversion(normalized);
                resultMode = 'conversor';
            } else {
                validateMathExpression(normalized);
                resultado = evaluateMathExpression(normalized);
            }

            if (typeof resultado !== 'number' || !Number.isFinite(resultado)) {
                throw new Error('Resultado inválido');
            }

            this.addToHistory(interaction.user.id, expr, resultado);

            const embed = createResultEmbed(expr, resultado, resultMode);
            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                content: `❌ Error en la expresión: \`${expr}\`\n\`${error.message}\`\n\n**Ejemplos válidos:**\n\`2+2\`, \`sqrt(16)\`, \`15%200\`, \`sin(pi/2)\`, \`10km->mi\``,
                ephemeral: true
            });
        }
    },

    addToHistory(userId, expr, result) {
        if (!historiales.has(userId)) {
            historiales.set(userId, []);
        }

        const history = historiales.get(userId);
        history.unshift({ expr, result, date: Date.now() });
        if (history.length > HISTORIAL_MAX) history.pop();
    },

    getHistory(userId) {
        return historiales.get(userId) || [];
    }
};

function createResultEmbed(expr, resultado, modo) {
    const emoji = modo === 'conversor' ? '🔄' : '🧮';

    return new EmbedBuilder()
        .setTitle(`${emoji} Resultado`)
        .setDescription(`**\`${expr}\`** = **\`${formatNumber(resultado)}\`**`)
        .setColor(0x4CAF50)
        .setFooter({ text: `Modo: ${modo}` })
        .setTimestamp();
}

function formatNumber(num) {
    if (Number.isInteger(num)) return num.toLocaleString();
    if (Math.abs(num) < 0.001 || Math.abs(num) > 999999) {
        return num.toExponential(4);
    }
    return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function normalizeExpression(expr) {
    return String(expr || '')
        .trim()
        .toLowerCase()
        .replace(/,/g, '.');
}

function validateMathExpression(expr) {
    if (!expr) {
        throw new Error('Tenés que ingresar una operación');
    }

    if (expr.length > MAX_EXPR_LENGTH) {
        throw new Error('La operación es demasiado larga');
    }

    if (!/^[0-9+\-*/%^().\sa-z]+$/.test(expr)) {
        throw new Error('Hay caracteres no permitidos');
    }

    const identifiers = expr.match(/[a-z]+/g) || [];
    const invalidIdentifier = identifiers.find(identifier => !SUPPORTED_FUNCTIONS.has(identifier) && identifier !== 'pi' && identifier !== 'e');
    if (invalidIdentifier) {
        throw new Error(`Función no soportada: ${invalidIdentifier}`);
    }
}

function handleConversion(expr) {
    const match = expr.match(/^(-?\d+(?:\.\d+)?)\s*([a-z]+)\s*->\s*([a-z]+)$/);
    if (!match) {
        throw new Error('Formato de conversión inválido');
    }

    const [, rawValue, fromUnit, toUnit] = match;
    const value = Number(rawValue);
    const converter = CONVERSIONS[fromUnit]?.[toUnit];

    if (!converter) {
        throw new Error(`Conversión no soportada: ${fromUnit}->${toUnit}`);
    }

    return converter(value);
}

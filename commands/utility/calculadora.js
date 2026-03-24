// ════════════════════════════════════════════════════════════════
// 🧮 CALCULADORA - Comando Utility
// Calculadora avanzada con historial
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Historial por usuario
const historiales = new Map();
const HISTORIAL_MAX = 20; // Máximo de entradas por usuario

// Limpieza periódica de historiales antiguos (cada 30 min)
setInterval(() => {
    if (historiales.size > 100) {
        // Si hay más de 100 usuarios, limpiar los más antiguos
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

        // Mostrar interfaz de calculadora
        const embed = new EmbedBuilder()
            .setTitle('🧮 Calculadora Prophet')
            .setDescription('```\n┌─────────────────┐\n│                 │\n└─────────────────┘\n```')
            .addFields(
                { name: '📝 Operaciones soportadas', value: 
                    '`+` `-` `*` `/` `%` `^`\n' +
                    '`sqrt()` `cbrt()` `abs()`\n' +
                    '`sin()` `cos()` `tan()`\n' +
                    '`log()` `ln()` `exp()`\n' +
                    '`pi` `e`', inline: true },
                { name: '📊 Conversores', value:
                    '`km->mi` `mi->km`\n' +
                    '`c->f` `f->c`\n' +
                    '`kg->lb` `lb->kg`\n' +
                    '`gb->mb` `mb->gb`', inline: true }
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
            // Sanitizar expresión
            let sanitized = expr.toLowerCase()
                .replace(/[^0-9+\-*/%^.()a-z\s]/g, '')
                .replace(/pi/g, Math.PI.toString())
                .replace(/e(?![a-z])/g, Math.E.toString());

            // Funciones matemáticas
            const mathFuncs = {
                'sqrt': 'Math.sqrt',
                'cbrt': 'Math.cbrt',
                'abs': 'Math.abs',
                'sin': 'Math.sin',
                'cos': 'Math.cos',
                'tan': 'Math.tan',
                'log': 'Math.log10',
                'ln': 'Math.log',
                'exp': 'Math.exp',
                'floor': 'Math.floor',
                'ceil': 'Math.ceil',
                'round': 'Math.round'
            };

            for (const [name, func] of Object.entries(mathFuncs)) {
                sanitized = sanitized.replace(new RegExp(name + '\\(', 'g'), func + '(');
            }

            // Conversores
            if (sanitized.includes('->')) {
                const result = handleConversion(expr);
                if (result) {
                    return interaction.reply({ 
                        embeds: [createResultEmbed(expr, result, 'conversor')] 
                    });
                }
            }

            // Evaluar expresión
            // eslint-disable-next-line no-eval
            const resultado = eval(sanitized);

            if (typeof resultado !== 'number' || !isFinite(resultado)) {
                throw new Error('Resultado inválido');
            }

            // Guardar en historial
            this.addToHistory(interaction.user.id, expr, resultado);

            const embed = createResultEmbed(expr, resultado, modo);
            return interaction.reply({ embeds: [embed] });

        } catch (error) {
            return interaction.reply({ 
                content: `❌ Error en la expresión: \`${expr}\`\n\`${error.message}\`\n\n**Ejemplos válidos:**\n\`2+2\`, \`sqrt(16)\`, \`15%200\`, \`sin(pi/2)\``, 
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
        if (history.length > 10) history.pop();
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

function handleConversion(expr) {
    const conversions = {
        'km->mi': (v) => v * 0.621371,
        'mi->km': (v) => v * 1.60934,
        'c->f': (v) => v * 9/5 + 32,
        'f->c': (v) => (v - 32) * 5/9,
        'kg->lb': (v) => v * 2.20462,
        'lb->kg': (v) => v * 0.453592,
        'gb->mb': (v) => v * 1024,
        'mb->gb': (v) => v / 1024,
        'm->ft': (v) => v * 3.28084,
        'ft->m': (v) => v * 0.3048
    };

    for (const [conv, func] of Object.entries(conversions)) {
        if (expr.toLowerCase().includes(conv)) {
            const value = parseFloat(expr);
            if (!isNaN(value)) return func(value);
        }
    }
    return null;
}

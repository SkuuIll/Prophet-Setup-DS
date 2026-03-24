// ════════════════════════════════════════════════════════════════
// 🔐 CONTRASEÑA - Comando Utility
// Generador de contraseñas seguras
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const crypto = require('crypto');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('contraseña')
        .setDescription('🔐 Generador de contraseñas seguras')
        .addIntegerOption(opt =>
            opt.setName('longitud')
                .setDescription('Longitud de la contraseña (8-64)')
                .setRequired(false)
                .setMinValue(8)
                .setMaxValue(64))
        .addBooleanOption(opt =>
            opt.setName('mayusculas')
                .setDescription('Incluir letras mayúsculas')
                .setRequired(false))
        .addBooleanOption(opt =>
            opt.setName('minusculas')
                .setDescription('Incluir letras minúsculas')
                .setRequired(false))
        .addBooleanOption(opt =>
            opt.setName('numeros')
                .setDescription('Incluir números')
                .setRequired(false))
        .addBooleanOption(opt =>
            opt.setName('simbolos')
                .setDescription('Incluir símbolos especiales')
                .setRequired(false))
        .addBooleanOption(opt =>
            opt.setName('memorable')
                .setDescription('Generar contraseña memorable (frase)')
                .setRequired(false)),

    async execute(interaction) {
        const longitud = interaction.options.getInteger('longitud') || 16;
        const mayusculas = interaction.options.getBoolean('mayusculas') ?? true;
        const minusculas = interaction.options.getBoolean('minusculas') ?? true;
        const numeros = interaction.options.getBoolean('numerosos') ?? true;
        const simbolos = interaction.options.getBoolean('simbolos') ?? true;
        const memorable = interaction.options.getBoolean('memorable') ?? false;

        let password;
        let strength;
        let entropy;

        if (memorable) {
            password = this.generateMemorable(longitud);
            strength = 'Memorable';
            entropy = '~40 bits';
        } else {
            const charset = this.buildCharset(mayusculas, minusculas, numeros, simbolos);
            
            if (charset.length === 0) {
                return interaction.reply({ 
                    content: '❌ Debés seleccionar al menos un tipo de carácter.', 
                    ephemeral: true 
                });
            }

            password = this.generateSecurePassword(longitud, charset);
            entropy = this.calculateEntropy(longitud, charset.length);
            strength = this.getStrength(entropy);
        }

        const embed = new EmbedBuilder()
            .setTitle('🔐 Contraseña Generada')
            .setDescription(`\`\`\`\n${password}\n\`\`\``)
            .addFields(
                { name: '📏 Longitud', value: `${password.length} caracteres`, inline: true },
                { name: '💪 Fortaleza', value: `${this.getStrengthEmoji(strength)} ${strength}`, inline: true },
                { name: '🎲 Entropía', value: entropy, inline: true }
            )
            .setColor(this.getStrengthColor(strength))
            .setFooter({ text: '⚠️ Esta contraseña solo se mostrará una vez. Copiala ahora.' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pw_regenerate')
                    .setLabel('Regenerar')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('pw_copy')
                    .setLabel('Copiado (simulado)')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },

    buildCharset(upper, lower, nums, syms) {
        let charset = '';
        if (upper) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lower) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (nums) charset += '0123456789';
        if (syms) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        return charset;
    },

    generateSecurePassword(length, charset) {
        const bytes = crypto.randomBytes(length * 2);
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = bytes[i] % charset.length;
            password += charset[randomIndex];
        }
        
        return password;
    },

    generateMemorable(targetLength) {
        const words = [
            'casa', 'sol', 'luna', 'mar', 'rio', 'flor', 'paz', 'amor',
            'azul', 'rojo', 'verde', 'oro', 'plata', 'fuego', 'agua', 'aire',
            'toro', 'aguila', 'serpiente', 'jaguar', 'colibri', 'delfin',
            'montana', 'bosque', 'desierto', 'isla', 'valle', 'cima'
        ];
        
        const separators = ['-', '_', '.', ''];
        const numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        
        let password = '';
        const sep = separators[Math.floor(Math.random() * separators.length)];
        
        while (password.length < targetLength - 4) {
            const word = words[Math.floor(Math.random() * words.length)];
            const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
            
            if (password.length > 0 && sep) {
                password += sep;
            }
            password += capitalized;
        }
        
        // Agregar números al final
        for (let i = 0; i < 3; i++) {
            password += numbers[Math.floor(Math.random() * numbers.length)];
        }
        
        // Agregar símbolo
        const symbols = ['!', '@', '#', '$', '%', '*'];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        
        return password;
    },

    calculateEntropy(length, charsetSize) {
        const entropy = length * Math.log2(charsetSize);
        return `${Math.round(entropy)} bits`;
    },

    getStrength(entropyStr) {
        const entropy = parseInt(entropyStr);
        if (entropy < 40) return 'Débil';
        if (entropy < 60) return 'Moderada';
        if (entropy < 80) return 'Fuerte';
        return 'Muy Fuerte';
    },

    getStrengthEmoji(strength) {
        const emojis = {
            'Débil': '🔴',
            'Moderada': '🟡',
            'Fuerte': '🟢',
            'Muy Fuerte': '💎',
            'Memorable': '🧠'
        };
        return emojis[strength] || '⚪';
    },

    getStrengthColor(strength) {
        const colors = {
            'Débil': 0xF44336,
            'Moderada': 0xFF9800,
            'Fuerte': 0x4CAF50,
            'Muy Fuerte': 0x9C27B0,
            'Memorable': 0x2196F3
        };
        return colors[strength] || 0x607D8B;
    }
};

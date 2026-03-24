// ════════════════════════════════════════════════════════════════
// 😂 MEME - Comando Fun
// Generador de memes con plantillas
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

const TEMPLATES = {
    'drake': {
        name: 'Drake Hotline',
        slots: ['texto arriba (rechaza)', 'texto abajo (acepta)'],
        positions: [{ x: 350, y: 80, w: 350, h: 150 }, { x: 350, y: 280, w: 350, h: 150 }]
    },
    'distracted': {
        name: 'Novio Distractivo',
        slots: ['texto novio', 'texto novia', 'texto chica nueva'],
        positions: [{ x: 50, y: 350, w: 200, h: 80 }, { x: 250, y: 350, w: 200, h: 80 }, { x: 450, y: 350, w: 200, h: 80 }]
    },
    'brain-expand': {
        name: 'Brain Expand',
        slots: ['small brain', 'medium brain', 'big brain', 'galaxy brain'],
        positions: [{ x: 10, y: 10, w: 180, h: 100 }, { x: 210, y: 10, w: 180, h: 100 }, { x: 10, y: 130, w: 180, h: 100 }, { x: 210, y: 130, w: 180, h: 100 }]
    },
    'buttons': {
        name: 'Two Buttons',
        slots: ['texto botón 1', 'texto botón 2', 'texto personaje'],
        positions: [{ x: 50, y: 100, w: 150, h: 60 }, { x: 300, y: 100, w: 150, h: 60 }, { x: 175, y: 350, w: 150, h: 60 }]
    },
    'change-my-mind': {
        name: 'Change My Mind',
        slots: ['texto en cartel'],
        positions: [{ x: 100, y: 200, w: 300, h: 100 }]
    },
    'custom': {
        name: 'Plantilla Personalizada',
        slots: ['texto superior', 'texto inferior'],
        positions: [{ x: 50, y: 30, w: 450, h: 80 }, { x: 50, y: 390, w: 450, h: 80 }],
        custom: true
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('😂 Generador de memes')
        .addStringOption(opt =>
            opt.setName('plantilla')
                .setDescription('Plantilla del meme')
                .setRequired(false)
                .addChoices(
                    { name: '🎯 Drake Hotline', value: 'drake' },
                    { name: '👀 Novio Distractivo', value: 'distracted' },
                    { name: '🧠 Brain Expand', value: 'brain-expand' },
                    { name: '🔘 Two Buttons', value: 'buttons' },
                    { name: '💭 Change My Mind', value: 'change-my-mind' },
                    { name: '✏️ Personalizado', value: 'custom' }
                ))
        .addStringOption(opt =>
            opt.setName('texto1')
                .setDescription('Primer texto')
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('texto2')
                .setDescription('Segundo texto')
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('texto3')
                .setDescription('Tercer texto')
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('texto4')
                .setDescription('Cuarto texto')
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('imagen')
                .setDescription('URL de imagen para plantilla personalizada')
                .setRequired(false)),

    async execute(interaction) {
        const plantilla = interaction.options.getString('plantilla');
        
        if (!plantilla) {
            return this.mostrarPlantillas(interaction);
        }

        await interaction.deferReply();

        const textos = [
            interaction.options.getString('texto1') || '',
            interaction.options.getString('texto2') || '',
            interaction.options.getString('texto3') || '',
            interaction.options.getString('texto4') || ''
        ].filter(t => t);

        const imagenUrl = interaction.options.getString('imagen');

        try {
            const memeBuffer = await this.generateMeme(plantilla, textos, imagenUrl);
            const attachment = new AttachmentBuilder(memeBuffer, { name: 'meme.png' });

            const embed = new EmbedBuilder()
                .setTitle('😂 Meme Generado')
                .setImage('attachment://meme.png')
                .setColor(0xFF6B6B)
                .setFooter({ text: `Plantilla: ${TEMPLATES[plantilla]?.name || plantilla}` });

            return interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('Error generando meme:', error);
            return interaction.editReply({ 
                content: `❌ Error al generar el meme: ${error.message}`, 
                ephemeral: true 
            });
        }
    },

    async mostrarPlantillas(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('😂 Generador de Memes')
            .setDescription('Selecciona una plantilla para crear tu meme')
            .addFields(
                { name: '🎯 Drake Hotline', value: '`/meme plantilla:drake texto1:rechaza texto2:acepta`', inline: false },
                { name: '👀 Novio Distractivo', value: '`/meme plantilla:distracted texto1:novio texto2:novia texto3:nueva`', inline: false },
                { name: '🧠 Brain Expand', value: '`/meme plantilla:brain-expand texto1:small texto2:medium texto3:big texto4:galaxy`', inline: false },
                { name: '💭 Change My Mind', value: '`/meme plantilla:change-my-mind texto1:tu opinion`', inline: false },
                { name: '✏️ Personalizado', value: '`/meme plantilla:custom imagen:URL texto1:arriba texto2:abajo`', inline: false }
            )
            .setColor(0xFF6B6B)
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async generateMeme(template, textos, imagenUrl) {
        const width = 500;
        const height = 400;
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Fondo
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        const templateData = TEMPLATES[template];
        
        if (template === 'custom' && imagenUrl) {
            try {
                const img = await Canvas.loadImage(imagenUrl);
                ctx.drawImage(img, 0, 0, width, height);
            } catch {
                // Si falla la imagen, usar fondo simple
            }
        }

        // Dibujar textos
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;

        templateData.positions.forEach((pos, i) => {
            if (textos[i]) {
                const fontSize = Math.min(32, pos.w / textos[i].length * 2);
                ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
                
                this.wrapText(ctx, textos[i], pos.x + pos.w / 2, pos.y + fontSize, pos.w, fontSize + 5);
            }
        });

        // Agregar marca de agua pequeña
        ctx.font = '10px Arial';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('Prophet Bot', width - 40, height - 10);

        return canvas.toBuffer('image/png');
    },

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lines = [];

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        lines.forEach((l, i) => {
            ctx.strokeText(l.trim(), x, y + i * lineHeight);
            ctx.fillText(l.trim(), x, y + i * lineHeight);
        });
    }
};

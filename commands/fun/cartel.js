// ════════════════════════════════════════════════════════════════
// 🖼️ CARTEL - Comando Fun
// Generar carteles/pósters personalizados
// ════════════════════════════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('@napi-rs/canvas');
const axios = require('axios');

const TEMPLATES = {
    'wanted': {
        name: 'Se Busca',
        description: 'Cartel de "Se Busca" estilo western'
    },
    'movie': {
        name: 'Película',
        description: 'Póster de película'
    },
    'newspaper': {
        name: 'Periódico',
        description: 'Portada de diario'
    },
    'ticket': {
        name: 'Ticket',
        description: 'Entrada de evento'
    },
    'banner': {
        name: 'Banner',
        description: 'Banner anunciativo'
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cartel')
        .setDescription('🖼️ Generar carteles y pósters personalizados')
        .addStringOption(opt =>
            opt.setName('tipo')
                .setDescription('Tipo de cartel')
                .setRequired(true)
                .addChoices(
                    { name: '🤠 Se Busca', value: 'wanted' },
                    { name: '🎬 Película', value: 'movie' },
                    { name: '📰 Periódico', value: 'newspaper' },
                    { name: '🎫 Ticket', value: 'ticket' },
                    { name: '🎯 Banner', value: 'banner' }
                ))
        .addStringOption(opt =>
            opt.setName('titulo')
                .setDescription('Título principal')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('subtitulo')
                .setDescription('Subtítulo o descripción')
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('imagen')
                .setDescription('URL de imagen (opcional)')
                .setRequired(false))
        .addStringOption(opt =>
            opt.setName('pie')
                .setDescription('Texto al pie')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const tipo = interaction.options.getString('tipo');
        const titulo = interaction.options.getString('titulo');
        const subtitulo = interaction.options.getString('subtitulo') || '';
        const imagenUrl = interaction.options.getString('imagen');
        const pie = interaction.options.getString('pie') || '';

        try {
            const buffer = await this.generatePoster(tipo, titulo, subtitulo, imagenUrl, pie, interaction.user);
            const attachment = new AttachmentBuilder(buffer, { name: 'cartel.png' });

            const embed = new EmbedBuilder()
                .setTitle('🖼️ Cartel Generado')
                .setImage('attachment://cartel.png')
                .setColor(0x673AB7)
                .setFooter({ text: `Tipo: ${TEMPLATES[tipo].name}` });

            return interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('Error generando cartel:', error);
            return interaction.editReply({ 
                content: `❌ Error al generar el cartel: ${error.message}`, 
                ephemeral: true 
            });
        }
    },

    async generatePoster(tipo, titulo, subtitulo, imagenUrl, pie, user) {
        const width = 500;
        const height = 700;
        const canvas = Canvas.createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        switch (tipo) {
            case 'wanted':
                await this.drawWanted(ctx, canvas, titulo, subtitulo, imagenUrl, pie);
                break;
            case 'movie':
                await this.drawMovie(ctx, canvas, titulo, subtitulo, imagenUrl, pie);
                break;
            case 'newspaper':
                await this.drawNewspaper(ctx, canvas, titulo, subtitulo, imagenUrl, pie);
                break;
            case 'ticket':
                await this.drawTicket(ctx, canvas, titulo, subtitulo, imagenUrl, pie);
                break;
            case 'banner':
                await this.drawBanner(ctx, canvas, titulo, subtitulo, imagenUrl, pie);
                break;
        }

        // Marca de agua
        ctx.globalAlpha = 0.3;
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Prophet Bot', width - 70, height - 15);
        ctx.globalAlpha = 1;

        return canvas.toBuffer('image/png');
    },

    async drawWanted(ctx, canvas, titulo, subtitulo, imagenUrl, pie) {
        // Fondo papiro
        ctx.fillStyle = '#d4a574';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Borde
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 15;
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

        // Título "SE BUSCA"
        ctx.font = 'bold 60px Georgia, serif';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText('SE BUSCA', canvas.width / 2, 80);

        // Línea decorativa
        ctx.beginPath();
        ctx.moveTo(50, 100);
        ctx.lineTo(canvas.width - 50, 100);
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Imagen del "bandido"
        if (imagenUrl) {
            try {
                const img = await Canvas.loadImage(imagenUrl);
                ctx.save();
                ctx.strokeStyle = '#8B4513';
                ctx.lineWidth = 5;
                ctx.strokeRect(100, 130, 300, 300);
                ctx.drawImage(img, 100, 130, 300, 300);
                ctx.restore();
            } catch {}
        }

        // Nombre
        ctx.font = 'bold 45px Georgia, serif';
        ctx.fillText(titulo.toUpperCase(), canvas.width / 2, 480);

        // Recompensa
        ctx.font = '30px Georgia, serif';
        ctx.fillText('RECOMPENSA', canvas.width / 2, 530);

        ctx.font = 'bold 40px Georgia, serif';
        ctx.fillText(subtitulo || '$1,000', canvas.width / 2, 575);

        // Pie
        if (pie) {
            ctx.font = '20px Georgia, serif';
            ctx.fillText(pie, canvas.width / 2, 650);
        }
    },

    async drawMovie(ctx, canvas, titulo, subtitulo, imagenUrl, pie) {
        // Fondo negro
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Imagen principal
        if (imagenUrl) {
            try {
                const img = await Canvas.loadImage(imagenUrl);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height * 0.7);
            } catch {}
        } else {
            // Gradiente si no hay imagen
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
            gradient.addColorStop(0, '#4a0080');
            gradient.addColorStop(1, '#000000');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height * 0.7);
        }

        // Área de texto
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);

        // Título
        ctx.font = 'bold 50px Arial Black, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(titulo, canvas.width / 2, canvas.height * 0.7);

        // Subtítulo
        if (subtitulo) {
            ctx.font = '25px Arial, sans-serif';
            ctx.fillStyle = '#cccccc';
            ctx.fillText(subtitulo, canvas.width / 2, canvas.height * 0.78);
        }

        // Estrellas de rating
        ctx.font = '30px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('★ ★ ★ ★ ★', canvas.width / 2, canvas.height * 0.85);

        // Pie (fecha/estreno)
        if (pie) {
            ctx.font = '18px Arial, sans-serif';
            ctx.fillStyle = '#888888';
            ctx.fillText(pie, canvas.width / 2, canvas.height * 0.92);
        }
    },

    async drawNewspaper(ctx, canvas, titulo, subtitulo, imagenUrl, pie) {
        // Fondo papel
        ctx.fillStyle = '#f5f5dc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cabecera
        ctx.fillStyle = '#000000';
        ctx.fillRect(20, 20, canvas.width - 40, 80);

        // Nombre del periódico
        ctx.font = 'bold 50px Times New Roman, serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText('THE PROPHET TIMES', canvas.width / 2, 75);

        // Fecha
        ctx.font = '14px Times New Roman, serif';
        ctx.fillStyle = '#000000';
        const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        ctx.fillText(fecha.toUpperCase(), canvas.width / 2, 125);

        // Línea
        ctx.beginPath();
        ctx.moveTo(20, 135);
        ctx.lineTo(canvas.width - 20, 135);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Titular
        ctx.font = 'bold 40px Times New Roman, serif';
        ctx.fillStyle = '#000000';
        this.wrapTitle(ctx, titulo.toUpperCase(), canvas.width / 2, 180, canvas.width - 60);

        // Imagen
        if (imagenUrl) {
            try {
                const img = await Canvas.loadImage(imagenUrl);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(50, 220, 400, 200);
                ctx.drawImage(img, 50, 220, 400, 200);
            } catch {}
        }

        // Texto cuerpo (subtitulo)
        if (subtitulo) {
            ctx.font = '16px Times New Roman, serif';
            ctx.textAlign = 'left';
            this.wrapBodyText(ctx, subtitulo, 30, 450, canvas.width - 60, 22);
        }

        // Pie
        if (pie) {
            ctx.font = 'italic 14px Times New Roman, serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#444444';
            ctx.fillText(pie, canvas.width / 2, canvas.height - 30);
        }
    },

    async drawTicket(ctx, canvas, titulo, subtitulo, imagenUrl, pie) {
        // Fondo
        ctx.fillStyle = '#2d2d44';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Forma de ticket con bordes irregulares
        ctx.fillStyle = '#f8f8f8';
        ctx.beginPath();
        ctx.roundRect(30, 30, canvas.width - 60, canvas.height - 60, [20, 20, 20, 20]);
        ctx.fill();

        // Perforaciones
        ctx.fillStyle = '#2d2d44';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(30 + i * 110, canvas.height / 2, 15, 0, Math.PI * 2);
            ctx.fill();
        }

        // Título evento
        ctx.font = 'bold 45px Arial Black, sans-serif';
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'center';
        ctx.fillText(titulo, canvas.width / 2, 150);

        // Subtítulo (fecha/lugar)
        if (subtitulo) {
            ctx.font = '25px Arial, sans-serif';
            ctx.fillStyle = '#444444';
            ctx.fillText(subtitulo, canvas.width / 2, 200);
        }

        // Imagen
        if (imagenUrl) {
            try {
                const img = await Canvas.loadImage(imagenUrl);
                ctx.drawImage(img, 100, 240, 300, 150);
            } catch {}
        }

        // Número de ticket
        ctx.font = 'bold 30px Courier New, monospace';
        ctx.fillStyle = '#1a1a2e';
        const ticketNum = Math.random().toString(36).substring(2, 10).toUpperCase();
        ctx.fillText(`#${ticketNum}`, canvas.width / 2, canvas.height - 100);

        // Pie (asiento/precio)
        if (pie) {
            ctx.font = '20px Arial, sans-serif';
            ctx.fillStyle = '#666666';
            ctx.fillText(pie, canvas.width / 2, canvas.height - 60);
        }
    },

    async drawBanner(ctx, canvas, titulo, subtitulo, imagenUrl, pie) {
        // Fondo con gradiente
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Imagen de fondo con opacidad
        if (imagenUrl) {
            try {
                const img = await Canvas.loadImage(imagenUrl);
                ctx.globalAlpha = 0.3;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1;
            } catch {}
        }

        // Título grande
        ctx.font = 'bold 70px Arial Black, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText(titulo, canvas.width / 2, canvas.height / 2 - 50);

        // Subtítulo
        if (subtitulo) {
            ctx.font = '35px Arial, sans-serif';
            ctx.fillText(subtitulo, canvas.width / 2, canvas.height / 2 + 30);
        }

        // Pie
        if (pie) {
            ctx.font = '25px Arial, sans-serif';
            ctx.shadowBlur = 0;
            ctx.fillText(pie, canvas.width / 2, canvas.height / 2 + 150);
        }

        ctx.shadowBlur = 0;
    },

    wrapTitle(ctx, text, x, y, maxWidth) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                ctx.fillText(line, x, currentY);
                line = word + ' ';
                currentY += 50;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    },

    wrapBodyText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (const word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
                ctx.fillText(line, x, currentY);
                line = word + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
    }
};

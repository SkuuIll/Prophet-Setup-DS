// ═══ COMANDO: /traductor ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

const IDIOMAS = [
    { name: '🇦🇷 Español', value: 'es' },
    { name: '🇺🇸 Inglés', value: 'en' },
    { name: '🇧🇷 Portugués', value: 'pt' },
    { name: '🇫🇷 Francés', value: 'fr' },
    { name: '🇩🇪 Alemán', value: 'de' },
    { name: '🇮🇹 Italiano', value: 'it' },
    { name: '🇯🇵 Japonés', value: 'ja' },
    { name: '🇰🇷 Coreano', value: 'ko' },
    { name: '🇷🇺 Ruso', value: 'ru' },
    { name: '🇨🇳 Chino (simp.)', value: 'zh' },
];

const LANG_FLAGS = {
    es: '🇦🇷', en: '🇺🇸', pt: '🇧🇷', fr: '🇫🇷',
    de: '🇩🇪', it: '🇮🇹', ja: '🇯🇵', ko: '🇰🇷',
    ru: '🇷🇺', zh: '🇨🇳', af: '🇿🇦', ar: '🇸🇦',
};
const LANG_NAMES = {
    es: 'Español', en: 'Inglés', pt: 'Portugués', fr: 'Francés',
    de: 'Alemán', it: 'Italiano', ja: 'Japonés', ko: 'Coreano',
    ru: 'Ruso', zh: 'Chino',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('traductor')
        .setDescription('🌐 Traducir texto a cualquier idioma')
        .addStringOption(o =>
            o.setName('texto')
                .setDescription('Texto a traducir')
                .setRequired(true)
                .setMaxLength(500))
        .addStringOption(o =>
            o.setName('destino')
                .setDescription('Idioma de destino (por defecto: Inglés)')
                .addChoices(...IDIOMAS)
                .setRequired(false))
        .addStringOption(o =>
            o.setName('origen')
                .setDescription('Idioma de origen (por defecto: auto-detectar)')
                .addChoices(...IDIOMAS)
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const texto = interaction.options.getString('texto').trim();
        const destino = interaction.options.getString('destino') || 'en';
        const origen = interaction.options.getString('origen') || 'auto';

        // API de MyMemory (gratuita, 5000 chars/día anónimo, 10000 con email)
        const params = new URLSearchParams({
            q: texto,
            langpair: `${origen === 'auto' ? 'es' : origen}|${destino}`,
        });

        const url = `https://api.mymemory.translated.net/get?${params}`;

        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) throw new Error('API error');

            const data = await res.json();

            if (data.responseStatus !== 200) {
                throw new Error(data.responseMessage || 'translation_failed');
            }

            const traduccion = data.responseData.translatedText;
            const matchOrigen = data.responseData.detectedLanguage || origen;

            // Calidad de traducción
            const quality = parseFloat(data.responseData.match || 0);
            const qualityBar = quality >= 0.8
                ? '🟢 Alta'
                : quality >= 0.5
                    ? '🟡 Media'
                    : '🔴 Baja';

            const origenFlag = LANG_FLAGS[matchOrigen] || '🌐';
            const destinoFlag = LANG_FLAGS[destino] || '🌐';
            const origenName = LANG_NAMES[matchOrigen] || matchOrigen.toUpperCase();
            const destinoName = LANG_NAMES[destino] || destino.toUpperCase();

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.INFO || 0x42A5F5)
                    .setAuthor({ name: '🌐  Traductor · Prophet Bot', iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        {
                            name: `${origenFlag}  Texto original (${origenName})`,
                            value: `\`\`\`\n${texto.slice(0, 400)}\n\`\`\``,
                            inline: false
                        },
                        {
                            name: `${destinoFlag}  Traducción (${destinoName})`,
                            value: `\`\`\`\n${traduccion.slice(0, 400)}\n\`\`\``,
                            inline: false
                        },
                        {
                            name: '📊 Calidad',
                            value: qualityBar,
                            inline: true
                        },
                        {
                            name: '🔁 Desde → Hasta',
                            value: `${origenName} → ${destinoName}`,
                            inline: true
                        }
                    )
                    .setFooter({ text: `Fuente: MyMemory API  ·  ${interaction.user.username}  ·  Prophet Bot` })
                    .setTimestamp()
                ]
            });

        } catch (err) {
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.ERROR || 0xEF5350)
                    .setAuthor({ name: '🌐  Traductor · Error' })
                    .setDescription(
                        `> ❌ **No pude traducir el texto.**\n` +
                        `> *${err.message}*\n\n` +
                        `> 💡 Verificá que el texto no sea vacío y volvé a intentarlo.`
                    )
                    .setFooter({ text: 'Prophet Bot  ·  Fuente: MyMemory API (gratis)' })
                ]
            });
        }
    }
};

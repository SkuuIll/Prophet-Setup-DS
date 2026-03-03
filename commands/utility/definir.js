// ═══ COMANDO: /definir ═══
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('definir')
        .setDescription('📖 Buscar la definición de una palabra en inglés o español')
        .addStringOption(o =>
            o.setName('palabra')
                .setDescription('Palabra a buscar')
                .setRequired(true))
        .addStringOption(o =>
            o.setName('idioma')
                .setDescription('Idioma (por defecto: español)')
                .addChoices(
                    { name: '🇦🇷 Español', value: 'es' },
                    { name: '🇺🇸 Inglés', value: 'en' },
                )
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        const palabra = interaction.options.getString('palabra').trim().toLowerCase();
        const idioma = interaction.options.getString('idioma') || 'es';

        const langMap = {
            'es': { name: 'Español', flag: '🇦🇷', api: 'es' },
            'en': { name: 'Inglés', flag: '🇺🇸', api: 'en' },
        };
        const lang = langMap[idioma];

        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${lang.api}/${encodeURIComponent(palabra)}`);

            // Para español primero intentamos dictionaryapi, si falla usamos wiktionary
            let data;
            if (!res.ok && idioma === 'es') {
                // Fallback: Wiktionary (español)
                const wikRes = await fetch(`https://es.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(palabra)}`);
                if (!wikRes.ok) throw new Error('no_found');

                const wikData = await wikRes.json();
                const esDef = wikData.es?.[0];
                if (!esDef) throw new Error('no_found');

                const defs = esDef.definitions?.slice(0, 3) || [];
                const desc = defs
                    .map((d, i) => `> **${i + 1}.** ${d.definition.replace(/<[^>]+>/g, '').trim()}`)
                    .join('\n');

                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setColor(config.COLORES.INFO || 0x42A5F5)
                        .setAuthor({ name: `📖  Definición · ${lang.flag} ${lang.name}` })
                        .setTitle(`"${palabra}"`)
                        .setDescription(desc || '> Sin definición encontrada.')
                        .setFooter({ text: 'Fuente: Wikcionario  ·  Prophet Bot' })
                        .setTimestamp()
                    ]
                });
            }

            if (!res.ok) throw new Error('no_found');
            data = await res.json();

            if (!Array.isArray(data) || data.length === 0) throw new Error('no_found');

            const entry = data[0];
            const phonetic = entry.phonetics?.find(p => p.text)?.text || '';
            const meanings = entry.meanings?.slice(0, 2) || [];

            let desc = '';
            for (const meaning of meanings) {
                const partOfSpeech = meaning.partOfSpeech || 'desconocido';
                const defs = meaning.definitions?.slice(0, 2) || [];

                desc += `**_${partOfSpeech}_**\n`;
                for (const [i, def] of defs.entries()) {
                    desc += `> **${i + 1}.** ${def.definition}\n`;
                    if (def.example) {
                        desc += `> *Ej: "${def.example}"*\n`;
                    }
                }
                desc += '\n';
            }

            const synonyms = meanings[0]?.definitions?.[0]?.synonyms?.slice(0, 5) || [];
            if (synonyms.length > 0) {
                desc += `**Sinónimos:** ${synonyms.map(s => `\`${s}\``).join(', ')}`;
            }

            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.INFO || 0x42A5F5)
                    .setAuthor({ name: `📖  Definición · ${lang.flag} ${lang.name}` })
                    .setTitle(`"${entry.word}"${phonetic ? ` — *${phonetic}*` : ''}`)
                    .setDescription(desc.trim() || '> Sin definición encontrada.')
                    .setFooter({ text: 'Fuente: Free Dictionary API  ·  Prophet Bot' })
                    .setTimestamp()
                ]
            });

        } catch (err) {
            await interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(config.COLORES.WARN || 0xFFB74D)
                    .setAuthor({ name: '📖  Definición · Sin resultados' })
                    .setDescription(
                        `> ❌ No encontré definición para **"${palabra}"** en ${lang.flag} ${lang.name}.\n\n` +
                        `> 💡 Verificá la ortografía o probá en otro idioma.`
                    )
                    .setFooter({ text: 'Prophet Bot  ·  /definir <palabra> [idioma]' })
                ]
            });
        }
    }
};

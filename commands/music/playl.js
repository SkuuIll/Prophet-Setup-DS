const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playl')
        .setDescription('Reproduce música usando el backend de estabilidad mejorado de Lavalink (Shoukaku)')
        .addStringOption(option =>
            option.setName('cancion')
                .setDescription('Nombre de la canción o URL')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        const client = interaction.client;

        if (!client.shoukaku) {
            return interaction.editReply('❌ **Shoukaku / Lavalink** no está configurado o el nodo no está conectado. Usa el `/play` tradicional por ahora.');
        }

        const query = interaction.options.getString('cancion');
        const node = client.shoukaku.getNode();

        if (!node) {
            return interaction.editReply('❌ No hay nodos de Lavalink disponibles en este momento. Revisa la consola.');
        }

        try {
            const result = await node.rest.resolve(`ytsearch:${query}`);
            if (!result || !result.data || result.data.length === 0) {
                return interaction.editReply('❌ No se encontraron resultados para tu búsqueda.');
            }

            const track = result.data[0];

            // Creamos un dispatcher si no hay uno
            let player = client.shoukaku.getPlayer(interaction.guild.id);
            if (!player) {
                if (!interaction.member.voice.channel) {
                    return interaction.editReply('❌ Tienes que estar en un canal de voz.');
                }

                player = await node.joinChannel({
                    guildId: interaction.guild.id,
                    channelId: interaction.member.voice.channel.id,
                    shardId: interaction.guild.shardId
                });
            }

            await player.playTrack({ track: track.encoded });

            const embed = new EmbedBuilder()
                .setColor(0xBB86FC)
                .setTitle('🎶 Agregado mediante Lavalink (Estabilidad Pro)')
                .setDescription(`Se ha agregado **[${track.info.title}](${track.info.uri || '#'})** a la cola mediante Shoukaku.`)
                .setFooter({ text: 'Libre de tirones y estático via Lavalink Node' })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('Lavalink Play Error:', err);
            await interaction.editReply(`❌ Hubo un error procesando el audio: ${err.message}`);
        }
    }
};

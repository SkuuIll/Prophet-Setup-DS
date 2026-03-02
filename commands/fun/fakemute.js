const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fakemute')
        .setDescription('Revela el secreto de Fake-Mute-Deafen para ensordecerte engañando la interfaz.'),

    async execute(interaction) {
        const secretCode = `
var text = new TextDecoder("utf-8");

WebSocket.prototype.original = WebSocket.prototype.send;
WebSocket.prototype.send = function(data) {
    if (Object.prototype.toString.call(data) === "[object ArrayBuffer]") {
        if (text.decode(data).includes("self_deaf")) {
            data = data.replace('"self_mute":false', '"self_mute":true');
            console.log("Fake Mute/Deafen hack applied!");
        }
    }
    WebSocket.prototype.original.apply(this, [data]);
}`;

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('🤫 Secreto: Fake-Mute & Deafen Hack')
            .setDescription(`Este comando revela un viejo truco para aparecer muteado y ensordecido a la vez en la interfaz pero poder seguir escuchando.\n\n**Instrucciones:**\n1. Habilita el Developer Tools en Discord.\n2. Presiona \`Ctrl + Shift + I\` en Windows.\n3. Pega este código en la Consola:\n\`\`\`js${secretCode}\`\`\``)
            .setFooter({ text: 'Inspirado en el repositorio Fake-Mute-Deafen-' })
            .setTimestamp();

        // Además, el bot hará una pequeña broma entrando en fakeMute si está en VC
        if (interaction.member.voice.channel) {
            try {
                const { joinVoiceChannel } = require('@discordjs/voice');
                const connection = joinVoiceChannel({
                    channelId: interaction.member.voice.channel.id,
                    guildId: interaction.guild.id,
                    adapterCreator: interaction.guild.voiceAdapterCreator,
                    selfMute: true,
                    selfDeaf: true
                });

                setTimeout(() => {
                    if (connection.state.status !== 'destroyed') connection.destroy();
                }, 5000);
            } catch (err) { }
        }

        await interaction.reply({ embeds: [embed] });
    }
};

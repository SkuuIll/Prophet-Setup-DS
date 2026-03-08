require('dotenv').config();

async function testDiscordProxy() {
    // The exact heavy image from earlier:
    let imgUrl = 'https://cdn.discordapp.com/attachments/1473002304520060999/1479996764865040495/image.png?ex=69ae11e5&is=69acc065&hm=70a927faeb1c3e3871ee2eac3bfe5a557b7fef7b738e4a9ba7cb35c91b5cdec6&';

    // Transform to media proxy URL to compress via discord's on-the-fly resizing
    let proxyUrl = imgUrl.replace('cdn.discordapp.com', 'media.discordapp.net');
    proxyUrl += proxyUrl.includes('?') ? '&width=800' : '?width=800';

    console.log('Fetching:', proxyUrl);
    const resImg = await fetch(proxyUrl);

    if (!resImg.ok) return console.log('Failed to fetch image proxy', resImg.status, await resImg.text());

    const arrayBuffer = await resImg.arrayBuffer();
    console.log('Imagen redimensionada. Tamaño en bytes:', arrayBuffer.byteLength); // Should be way less than 641KB!
}

testDiscordProxy();

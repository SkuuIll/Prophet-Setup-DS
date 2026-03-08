require('dotenv').config();

async function testHeavyImage() {
    const mistralKeys = Object.keys(process.env)
        .filter(k => k.startsWith('MISTRAL_API_KEY'))
        .map(k => process.env[k])
        .filter(key => key);

    // Fetch the EXACT image URL from the logs
    const imgUrl = 'https://cdn.discordapp.com/attachments/1473002304520060999/1479996764865040495/image.png?ex=69ae11e5&is=69acc065&hm=70a927faeb1c3e3871ee2eac3bfe5a557b7fef7b738e4a9ba7cb35c91b5cdec6&';
    const resImg = await fetch(imgUrl);

    if (!resImg.ok) return console.log('Failed to fetch image');

    const arrayBuffer = await resImg.arrayBuffer();
    const base64Img = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = 'image/png';
    console.log('Imagen descargada. Tamaño en bytes:', arrayBuffer.byteLength);

    for (let i = 0; i < mistralKeys.length; i++) {
        const apiKey = mistralKeys[i];
        console.log(`\nProbando Key #${i + 1}...`);

        try {
            const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'pixtral-12b-2409',
                    messages: [{
                        role: 'user',
                        content: [
                            { type: 'text', text: 'describe' },
                            {
                                type: 'image_url',
                                image_url: { url: `data:${mimeType};base64,${base64Img}` }
                            }
                        ]
                    }],
                    max_tokens: 100,
                    temperature: 0.15
                })
            });

            const data = await res.json();
            console.log('Status:', res.status);
            if (res.ok) {
                console.log('✅ ÉXITO!');
            } else {
                console.log('❌ ERROR:', JSON.stringify(data));
            }

        } catch (e) {
            console.error('Catch Error:', e.message);
        }
    }
}

testHeavyImage();

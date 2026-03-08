require('dotenv').config();

async function testBothKeys() {
    const mistralKeys = Object.keys(process.env)
        .filter(k => k.startsWith('MISTRAL_API_KEY'))
        .map(k => process.env[k])
        .filter(key => key);

    console.log('Keys disponibles:', mistralKeys.length);

    // Fetch a sample image of ~200kb
    const resImg = await fetch('https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/200px-React-icon.svg.png');
    const arrayBuffer = await resImg.arrayBuffer();
    const base64Img = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = 'image/png';
    console.log('Imagen descargada. Base64 len:', base64Img.length);

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
                            { type: 'text', text: 'Describe esta imagen en 10 palabras' },
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
                console.log('✅ ÉXITO! Respuesta:', data.choices[0].message.content);
            } else {
                console.log('❌ ERROR:', JSON.stringify(data));
            }

        } catch (e) {
            console.error('Catch Error:', e.message);
        }
    }
}

testBothKeys();

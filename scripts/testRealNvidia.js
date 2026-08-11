require('dotenv').config();

async function testNvidiaVision() {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        console.error('No se encontró NVIDIA_API_KEY');
        return;
    }

    try {
        console.log('Descargando imagen real...');
        const imgUrl = 'https://media.discordapp.net/attachments/1473002304520060999/1501269113782407299/image.png';
        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) {
            console.error('Error descargando imagen:', imgRes.status);
            return;
        }
        const arrayBuffer = await imgRes.arrayBuffer();
        const base64Img = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = imgRes.headers.get('content-type') || 'image/png';
        const url = `data:${mimeType};base64,${base64Img}`;
        
        console.log(`Imagen descargada, tamaño: ${arrayBuffer.byteLength} bytes. Haciendo petición...`);
        const start = Date.now();
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta/llama-3.2-11b-vision-instruct',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Describe esta imagen detalladamente.' },
                        { type: 'image_url', image_url: { url: url } }
                    ]
                }],
                max_tokens: 512,
                temperature: 0.2,
                top_p: 0.7
            })
        });

        console.log(`Tiempo de respuesta: ${(Date.now() - start) / 1000}s`);
        const textResponse = await res.text();
        if (!res.ok) {
            console.error('Error en la respuesta (HTTP ' + res.status + '):', textResponse);
        } else {
            console.log('✅ Éxito! Respuesta de la IA:');
            const data = JSON.parse(textResponse);
            console.log(data.choices[0].message.content);
        }
    } catch (err) {
        console.error('Error general:', err);
    }
}

testNvidiaVision();

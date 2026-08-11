require('dotenv').config();

async function testNvidiaVision() {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
        console.error('No se encontró NVIDIA_API_KEY');
        return;
    }

    // Un pixel blanco en base64
    const mimeType = 'image/png';
    const base64Img = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
    const prompt = '¿De qué color es esta imagen?';

    try {
        const url = `data:${mimeType};base64,${base64Img}`;
        console.log('Haciendo petición a NVIDIA con Llama 3.2 90B Vision...');
        
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta/llama-3.2-90b-vision-instruct',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: url } }
                    ]
                }],
                max_tokens: 512,
                temperature: 0.2,
                top_p: 0.7
            })
        });

        const data = await res.json();
        if (!res.ok) {
            console.error('Error en la respuesta:', JSON.stringify(data, null, 2));
        } else {
            console.log('✅ Éxito! Respuesta de la IA:');
            console.log(data.choices[0].message.content);
        }
    } catch (err) {
        console.error('Error general:', err);
    }
}

testNvidiaVision();

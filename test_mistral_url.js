require('dotenv').config();

async function testUrl() {
    const mistralKeys = Object.keys(process.env)
        .filter(k => k.startsWith('MISTRAL_API_KEY'))
        .map(k => process.env[k])
        .filter(key => key);

    const apiKey = mistralKeys[0];
    const imgUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1024px-React-icon.svg.png';

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
                        { type: 'text', text: 'what is this' },
                        {
                            type: 'image_url',
                            image_url: { url: imgUrl }
                        }
                    ]
                }],
                max_tokens: 100,
                temperature: 0.15
            })
        });

        const data = await res.json();
        console.log('Status:', res.status, data);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

testUrl();

require('dotenv').config();

async function testOpenRouterValid(model) {
    const apiKey = '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';
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/200px-React-icon.svg.png';

    const resImg = await fetch(imageUrl);
    const arrayBuffer = await resImg.arrayBuffer();
    const base64Img = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = 'image/png';

    try {
        console.log('Llamando con', model);
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/SkuuIll/Prophet-Setup-DS',
                'X-Title': 'ProphetBot'
            },
            body: JSON.stringify({
                model: model,
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Describe in 2 words' },
                        {
                            type: 'image_url',
                            image_url: { url: `data:${mimeType};base64,${base64Img}` }
                        }
                    ]
                }],
                max_tokens: 100
            })
        });

        const data = await res.json();
        console.log('Status para', model, ':', res.status, data.choices ? data.choices[0].message.content : JSON.stringify(data.error));

    } catch (e) {
        console.error('Error:', e);
    }
}

async function test() {
    await testOpenRouterValid('qwen/qwen3-vl-30b-a3b-thinking');
    await testOpenRouterValid('openrouter/free');
    await testOpenRouterValid('qwen/qwen-vl-plus:free');
    await testOpenRouterValid('microsoft/phi-3.5-vision-instruct:free');
}
test();

const { getSeasons } = require('./modules/pubgApi');
const config = require('./config');

async function testRanked() {
    const fetch = global.fetch || require('node-fetch'); // ensuring fetch in node
    const url = `${config.APIS.PUBG.BASE_URL}/shards/steam/players/account.c0a1a08babbf4b0abcb9ce9be090ba2b/seasons/division.bro.official.pc-2018-40/ranked`;
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${config.APIS.PUBG.KEY}`,
            'Accept': 'application/vnd.api+json'
        }
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
}
testRanked().catch(console.error);

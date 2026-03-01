const { searchPlayer } = require('./modules/pubgApi');
const config = require('./config');
async function run() {
    const fetch = global.fetch || require('node-fetch');
    const player = await searchPlayer('SkuuuuuuuLL');
    const url = `${config.APIS.PUBG.BASE_URL}/shards/steam/players/${player.id}/seasons/division.bro.official.pc-2018-28/ranked`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${config.APIS.PUBG.KEY}`, 'Accept': 'application/vnd.api+json' } });
    const text = await res.text();
    console.log(text);
}
run();

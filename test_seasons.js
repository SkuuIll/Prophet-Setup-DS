const { getSeasons } = require('./modules/pubgApi');
getSeasons('steam').then(s => console.log(s.map(x => x.id).slice(-20))).catch(console.error);

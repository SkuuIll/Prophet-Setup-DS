const AuthManager = require('./games/common/authManager');
const token = AuthManager.createSession('123456789', 120);
console.log(`http://127.0.0.1:3850/games/hub/index.html?token=${token}`);

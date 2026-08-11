document.addEventListener('DOMContentLoaded', async () => {
    const userBalanceEl = document.getElementById('user-balance');
    const userNameEl = document.getElementById('user-name');
    const userLevelEl = document.getElementById('user-level');

    // Conectar WebSocket
    try {
        const authData = await window.prophetClient.connect();
        if (authData) {
            userBalanceEl.innerText = formatNumber(authData.balance || 0);
            userNameEl.innerText = authData.user?.id ? `ID: ${authData.user.id}` : 'Miembro';
            userLevelEl.innerText = `Nvl ${authData.level || 1}`;
        } else {
            userBalanceEl.innerText = '0';
        }
    } catch (e) {
        console.warn('Ejecutando en modo demo');
        userBalanceEl.innerText = '1,500';
    }
});

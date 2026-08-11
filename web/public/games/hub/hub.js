document.addEventListener('DOMContentLoaded', async () => {
    const userBalanceEl = document.getElementById('user-balance');
    const heroBalanceEl = document.getElementById('hero-balance');
    const userNameEl = document.getElementById('user-name');
    const userLevelEl = document.getElementById('user-level');
    const connStatus = document.getElementById('conn-status');
    const heroGreeting = document.getElementById('hero-greeting');

    if (typeof window.__hideActivityBoot === 'function') {
        window.__hideActivityBoot('Autenticando…');
    }

    // Prefill nombre desde storage (Activity) mientras conecta
    const cachedName = sessionStorage.getItem('prophet_display_name');
    if (cachedName && userNameEl) userNameEl.textContent = cachedName;

    document.querySelectorAll('.game-card[data-href]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            if (window.SoundFX) SoundFX.playClick();
            const href = card.getAttribute('data-href');
            if (typeof window.prophetNavigate === 'function') {
                window.prophetNavigate(href);
            } else {
                location.href = href;
            }
        });
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'link');
    });

    try {
        const authData = await window.prophetClient.connect();
        if (authData) {
            const name = (window.ProphetProfile && ProphetProfile.applyUserToNav(authData))
                || authData.username
                || cachedName
                || 'Miembro';

            if (userNameEl) userNameEl.textContent = name;
            if (userLevelEl) userLevelEl.textContent = `Nvl ${authData.level || 1}`;

            const bal = formatNumber(authData.balance || 0);
            if (userBalanceEl) userBalanceEl.textContent = bal;
            if (heroBalanceEl) heroBalanceEl.textContent = bal;
            if (heroGreeting) heroGreeting.textContent = `Hola, ${name}`;

            if (connStatus) {
                connStatus.textContent = '● Conectado';
                connStatus.classList.add('online');
            }
        } else {
            if (userBalanceEl) userBalanceEl.textContent = '0';
            if (heroBalanceEl) heroBalanceEl.textContent = 'Demo';
            if (connStatus) {
                connStatus.textContent = '● Modo demo';
                connStatus.classList.add('offline');
            }
        }
    } catch (e) {
        console.warn('Hub en modo demo', e);
        if (userBalanceEl) userBalanceEl.textContent = '—';
        if (connStatus) {
            connStatus.textContent = '● Offline';
            connStatus.classList.add('offline');
        }
    } finally {
        if (typeof window.__hideActivityBoot === 'function') {
            window.__hideActivityBoot();
        }
    }
});

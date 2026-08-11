/**
 * Helpers de perfil Discord para el hub y juegos.
 */
(function () {
    function displayNameFromAuth(auth) {
        if (!auth) return sessionStorage.getItem('prophet_display_name') || 'Miembro';
        return auth.username
            || auth.discordUser?.username
            || auth.discordUser?.global_name
            || auth.user?.username
            || auth.user?.global_name
            || sessionStorage.getItem('prophet_display_name')
            || 'Miembro';
    }

    function avatarUrlFromAuth(auth) {
        const id = auth?.userId || auth?.user?.id || auth?.discordUser?.id || sessionStorage.getItem('prophet_user_id');
        const avatar = auth?.avatar || auth?.user?.avatar || auth?.discordUser?.avatar || sessionStorage.getItem('prophet_avatar');
        if (id && avatar) {
            return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=64`;
        }
        if (id) {
            // Default Discord avatar
            try {
                const idx = Number(BigInt(id) % 6n);
                return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
            } catch {
                return 'https://cdn.discordapp.com/embed/avatars/0.png';
            }
        }
        return null;
    }

    function applyUserToNav(auth) {
        const name = displayNameFromAuth(auth);
        const nameEl = document.getElementById('user-name');
        if (nameEl) nameEl.textContent = name;

        const levelEl = document.getElementById('user-level');
        if (levelEl && auth?.level != null) levelEl.textContent = `Nvl ${auth.level || 1}`;

        const bal = auth?.balance;
        const balEl = document.getElementById('user-balance') || document.getElementById('tycoon-coins')
            || document.getElementById('casino-balance') || document.getElementById('cards-balance')
            || document.getElementById('trivia-balance');
        if (balEl && bal != null && typeof formatNumber === 'function') {
            balEl.textContent = formatNumber(bal);
        }

        // Avatar pill
        const badge = document.querySelector('.prophet-user-badge');
        if (badge && !badge.querySelector('.user-avatar')) {
            const url = avatarUrlFromAuth(auth);
            if (url) {
                const img = document.createElement('img');
                img.className = 'user-avatar';
                img.src = url;
                img.alt = name;
                img.width = 32;
                img.height = 32;
                badge.insertBefore(img, badge.firstChild);
            }
        } else if (badge) {
            const img = badge.querySelector('.user-avatar');
            const url = avatarUrlFromAuth(auth);
            if (img && url) img.src = url;
        }

        return name;
    }

    window.ProphetProfile = {
        displayNameFromAuth,
        avatarUrlFromAuth,
        applyUserToNav
    };
})();

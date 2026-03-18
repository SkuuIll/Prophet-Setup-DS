// ═══ PM2 Ecosystem — Prophet Bot v2.6 ═══

module.exports = {
    apps: [{
        name: 'ProphetBot',
        script: './index.js',
        cwd: '/root/ProphetBot',

        // ── Rendimiento ──
        node_args: '--max-old-space-size=512 --optimize-for-size --disable-warning=DEP0040',
        max_memory_restart: '600M',

        // ── Reinicio automático ──
        autorestart: true,
        watch: false,
        max_restarts: 10,
        min_uptime: '10s',
        restart_delay: 5000,

        // ── Graceful shutdown ──
        kill_timeout: 5000,       // Esperar 5s antes de SIGKILL

        // ── Logs ──
        time: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: '/root/ProphetBot/logs/error.log',
        out_file: '/root/ProphetBot/logs/output.log',
        merge_logs: true,
        log_type: 'json',

        // ── Entorno ──
        env: {
            NODE_ENV: 'production',
        },
    }]
};

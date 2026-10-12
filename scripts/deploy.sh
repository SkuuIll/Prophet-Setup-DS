#!/usr/bin/env bash
# Despliegue seguro de TODOS los servicios. Ejecutar desde cualquier directorio.
set -Eeuo pipefail
umask 077

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="${TMPDIR:-/tmp}/prophetbot-deploy.lock"
BRANCH="${DEPLOY_BRANCH:-main}"
PREVIOUS_REV=""
REMOTE_REV=""
UPDATED=false
PM2_APPS=(ProphetLavalink ProphetGames ProphetMusic ProphetBot)

cd "$ROOT_DIR"
mkdir -p logs
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "Ya hay otro despliegue de ProphetBot en curso."
    exit 1
fi

reload_services() {
    local service
    for service in "${PM2_APPS[@]}"; do
        echo "Recargando PM2: $service"
        pm2 startOrReload ecosystem.config.js --only "$service" --update-env
    done
}

rollback() {
    local code=$?
    trap - ERR
    if [[ "$UPDATED" == true && -n "$PREVIOUS_REV" ]]; then
        echo "Despliegue fallido (código $code). Restaurando $PREVIOUS_REV ..."
        if [[ -n "$REMOTE_REV" ]]; then
            mkdir -p data/deploy
            printf "%s\n" "$REMOTE_REV" > data/deploy/failed-revision
        fi
        git reset --hard "$PREVIOUS_REV" || true
        npm ci --no-audit || true
        reload_services || true
    fi
    exit "$code"
}
trap rollback ERR

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Repositorio con cambios locales: se cancela para conservarlos."
    exit 1
fi

PREVIOUS_REV="$(git rev-parse HEAD)"
npm run db:backup
git fetch origin "$BRANCH"
REMOTE_REV="$(git rev-parse "origin/$BRANCH")"

if [[ "$REMOTE_REV" != "$PREVIOUS_REV" ]]; then
    # Nunca sobrescribir ramas locales divergentes.
    git merge --ff-only "$REMOTE_REV"
    UPDATED=true
fi

npm ci --no-audit
npm run verify
npm run audit:prod
reload_services

# Verificar tanto procesos PM2 como endpoints; dos lecturas consecutivas
# evitan considerar sano un proceso en reinicio continuo.
HEALTH_URL="${DASHBOARD_HEALTH_URL:-http://127.0.0.1:3789/api/health}"
GAMES_HEALTH_URL="${GAMES_HEALTH_URL:-http://127.0.0.1:3850/api/games/health}"
healthy_checks=0
for attempt in {1..18}; do
    if pm2 jlist | node -e '
        let input = "";
        process.stdin.on("data", chunk => input += chunk);
        process.stdin.on("end", () => {
            try {
                const apps = JSON.parse(input);
                const names = ["ProphetBot", "ProphetLavalink", "ProphetMusic", "ProphetGames"];
                process.exit(names.every(name => apps.some(app =>
                    app.name === name && app.pm2_env?.status === "online"
                )) ? 0 : 1);
            } catch (_) { process.exit(1); }
        });
    ' && curl --silent --fail --connect-timeout 3 --max-time 5 "$HEALTH_URL" | grep -Eq '"ready"[[:space:]]*:[[:space:]]*true' \
      && curl --silent --fail --connect-timeout 3 --max-time 5 "$GAMES_HEALTH_URL" | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'; then
        healthy_checks=$((healthy_checks + 1))
        if [[ "$healthy_checks" -ge 2 ]]; then
            pm2 save
            rm -f data/deploy/failed-revision
            trap - ERR
            echo "Despliegue verificado de los cuatro procesos en $REMOTE_REV."
            exit 0
        fi
    else
        healthy_checks=0
    fi
    sleep 5
done

echo "Falló la comprobación de salud. Consultá pm2 logs y logs/auto-update.log."
false

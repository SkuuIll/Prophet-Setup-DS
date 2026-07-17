#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="${TMPDIR:-/tmp}/prophetbot-deploy.lock"
BRANCH="${DEPLOY_BRANCH:-main}"
PM2_APP="${PM2_APP_NAME:-ProphetBot}"
PREVIOUS_REV=""
UPDATED=false

cd "$ROOT_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    echo "Ya hay otro despliegue de ProphetBot en curso."
    exit 1
fi

rollback() {
    local exit_code=$?
    if [[ "$UPDATED" == true && -n "$PREVIOUS_REV" ]]; then
        echo "El despliegue falló; restaurando $PREVIOUS_REV..."
        git reset --hard "$PREVIOUS_REV"
        npm ci --no-audit
        pm2 startOrReload ecosystem.config.js --only "$PM2_APP" --update-env || true
    fi
    exit "$exit_code"
}
trap rollback ERR

if [[ -n "$(git status --porcelain)" ]]; then
    echo "El árbol Git tiene cambios. Se cancela para no sobrescribir trabajo local."
    exit 1
fi

PREVIOUS_REV="$(git rev-parse HEAD)"
npm run db:backup
git fetch origin "$BRANCH"

REMOTE_REV="$(git rev-parse "origin/$BRANCH")"
if [[ "$REMOTE_REV" != "$PREVIOUS_REV" ]]; then
    git merge --ff-only "$REMOTE_REV"
    UPDATED=true
fi

npm ci --no-audit
npm run verify
npm run audit:prod
pm2 startOrReload ecosystem.config.js --only "$PM2_APP" --update-env

HEALTH_URL="${DASHBOARD_HEALTH_URL:-http://127.0.0.1:3789/api/health}"
if [[ "$HEALTH_URL" == https://* ]]; then
    CURL_TLS=(-k)
else
    CURL_TLS=()
fi

for attempt in {1..12}; do
    if curl --silent --show-error --fail "${CURL_TLS[@]}" "$HEALTH_URL" | grep -Eq '"ok"[[:space:]]*:[[:space:]]*true'; then
        pm2 save
        trap - ERR
        echo "Despliegue validado en $REMOTE_REV."
        exit 0
    fi
    sleep 5
done

echo "El proceso no superó el health check."
false

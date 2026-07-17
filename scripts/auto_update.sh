#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"
cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Auto-update omitido: hay cambios locales."
    exit 0
fi

git fetch --quiet origin "$BRANCH"
LOCAL_REV="$(git rev-parse HEAD)"
REMOTE_REV="$(git rev-parse "origin/$BRANCH")"

if [[ "$LOCAL_REV" == "$REMOTE_REV" ]]; then
    exit 0
fi

if git merge-base --is-ancestor "$REMOTE_REV" "$LOCAL_REV"; then
    # El servidor tiene commits locales aún no publicados.
    exit 0
fi

if ! git merge-base --is-ancestor "$LOCAL_REV" "$REMOTE_REV"; then
    echo "Auto-update bloqueado: la rama local y origin/$BRANCH divergieron."
    exit 1
fi

exec "$ROOT_DIR/scripts/deploy.sh"

#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "ProphetBot usa un despliegue transaccional con backup, validación y rollback."
exec "$ROOT_DIR/scripts/deploy.sh"

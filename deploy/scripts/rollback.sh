#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$DEPLOY_DIR"

set -a
source ./.env 2>/dev/null || true
set +a

ACTIVE_FILE="$DEPLOY_DIR/.active_color"
CURRENT="blue"
if [[ -f "$ACTIVE_FILE" ]]; then
  CURRENT="$(cat "$ACTIVE_FILE")"
fi
if [[ "$CURRENT" == "blue" ]]; then
  TARGET="green"
  TARGET_FE_PORT="${FRONTEND_GREEN_PORT:-18081}"
  TARGET_BE_PORT="${BACKEND_GREEN_PORT:-13002}"
else
  TARGET="blue"
  TARGET_FE_PORT="${FRONTEND_BLUE_PORT:-18080}"
  TARGET_BE_PORT="${BACKEND_BLUE_PORT:-13001}"
fi

echo "[rollback] current=$CURRENT rollback_target=$TARGET"

docker compose up -d "backend_${TARGET}" "frontend_${TARGET}"

echo "$TARGET" > "$ACTIVE_FILE"

echo "[rollback] active color switched to $TARGET"
echo "[rollback] update global nginx upstream to frontend=$TARGET_FE_PORT backend=$TARGET_BE_PORT then reload nginx"

docker compose stop "backend_${CURRENT}" "frontend_${CURRENT}" || true

echo "[rollback] previous color stopped"

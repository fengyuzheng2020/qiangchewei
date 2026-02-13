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

echo "[deploy] current=$CURRENT target=$TARGET"

docker compose up -d --build "backend_${TARGET}" "frontend_${TARGET}"

wait_healthy() {
  local service="$1"
  local cid
  cid="$(docker compose ps -q "$service")"
  if [[ -z "$cid" ]]; then
    echo "[deploy] service $service not found"
    exit 1
  fi

  for _ in {1..50}; do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
    if [[ "$status" == "healthy" || "$status" == "running" ]]; then
      echo "[deploy] $service healthy"
      return 0
    fi
    sleep 2
  done

  echo "[deploy] $service health check timeout"
  exit 1
}

wait_healthy "backend_${TARGET}"
wait_healthy "frontend_${TARGET}"

echo "$TARGET" > "$ACTIVE_FILE"

echo "[deploy] active color switched to $TARGET"
echo "[deploy] update global nginx upstream to frontend=$TARGET_FE_PORT backend=$TARGET_BE_PORT then reload nginx"

docker compose stop "backend_${CURRENT}" "frontend_${CURRENT}" || true

echo "[deploy] old color stopped"

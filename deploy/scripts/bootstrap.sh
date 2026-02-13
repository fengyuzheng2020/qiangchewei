#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$DEPLOY_DIR"

cp -n .env.example .env
cp -n backend.env.example backend.env

echo "blue" > .active_color

docker compose up -d --build backend_blue frontend_blue

echo "[bootstrap] blue environment started"
echo "[bootstrap] frontend_blue=${FRONTEND_BLUE_PORT:-18080}, backend_blue=${BACKEND_BLUE_PORT:-13001}"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/deploy/lab/docker-compose.yml"
ENV_FILE="${1:-$ROOT/.env.lab}"

bash "$ROOT/scripts/lab-preflight.sh" "$ENV_FILE"

echo "Starting isolated LAB database only..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE" up -d postgres

echo "Running one-shot migration job..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE" --profile migration run --rm migrate

echo "Migration complete. Dispatch remains disabled."

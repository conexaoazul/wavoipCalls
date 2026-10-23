#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/deploy/lab/docker-compose.yml"
ENV_FILE="${1:-$ROOT/.env.lab}"

[ -f "$ENV_FILE" ] || { printf 'env file not found: %s\n' "$ENV_FILE" >&2; exit 2; }

set -a
. "$ENV_FILE"
set +a

: "${CONTROL_PLANE_TENANT_ID:?CONTROL_PLANE_TENANT_ID is required}"
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"

case "$CONTROL_PLANE_TENANT_ID" in
  ''|*[!0-9]*|0) printf 'invalid CONTROL_PLANE_TENANT_ID\n' >&2; exit 2 ;;
esac

TENANT_NAME="${LAB_TENANT_NAME:-Mágica Voice LAB}"
TENANT_EMAIL="${LAB_TENANT_EMAIL:-magica-voice-lab@invalid.local}"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE" exec -T postgres   psql -v ON_ERROR_STOP=1     -v tenant_id="$CONTROL_PLANE_TENANT_ID"     -v tenant_name="$TENANT_NAME"     -v tenant_email="$TENANT_EMAIL"     -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<'SQL'
INSERT INTO "Tenants" (
  id, name, email, "passwordHash", "createdAt", "updatedAt"
)
VALUES (
  :tenant_id,
  :'tenant_name',
  :'tenant_email',
  'disabled-lab-login',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    "updatedAt" = NOW();

SELECT setval(
  pg_get_serial_sequence('"Tenants"', 'id'),
  GREATEST((SELECT COALESCE(MAX(id), 1) FROM "Tenants"), 1),
  true
);
SQL

printf 'LAB tenant bootstrap complete for tenant_id=%s\n' "$CONTROL_PLANE_TENANT_ID"

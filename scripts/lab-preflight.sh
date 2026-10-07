#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/deploy/lab/docker-compose.yml"
ENV_FILE="${1:-$ROOT/.env.lab}"

fail(){ printf 'BLOCKED  %s\n' "$*" >&2; exit 2; }
pass(){ printf 'PASS  %s\n' "$*"; }

[ -f "$ENV_FILE" ] || fail "env file not found: $ENV_FILE"
command -v docker >/dev/null 2>&1 || fail "docker unavailable"
docker compose version >/dev/null 2>&1 || fail "docker compose unavailable"

# Never print rendered config because it contains secrets.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE" config --quiet
pass "compose config valid"

grep -Fq 'VOICE_DISPATCH_ENABLED: "false"' "$COMPOSE"   || fail "dispatch is not hard-disabled in LAB compose"
grep -Fq 'VOICE_PREFLIGHT_ENABLED: "true"' "$COMPOSE"   || fail "preflight is not enabled in LAB compose"
grep -Fq 'VOICE_ENABLED_PROVIDERS: "elevenlabs"' "$COMPOSE"   || fail "ElevenLabs provider is not the only LAB provider"
grep -Fq 'VOICE_ELEVENLABS_AGENT_ALLOWLIST: "${VOICE_ELEVENLABS_AGENT_ALLOWLIST:-}"' "$COMPOSE"   || fail "LAB agent allowlist must come from the env file"
grep -Fq 'VOICE_ELEVENLABS_PHONE_ALLOWLIST: ""' "$COMPOSE"   || fail "phone allowlist is not deny-all"
pass "voice policy is deny-by-default and dispatch-off"

for key in POSTGRES_PASSWORD CONTROL_PLANE_API_TOKEN; do
  if ! grep -Eq "^${key}=.{16,}$" "$ENV_FILE"; then
    fail "$key missing or too short"
  fi
done
pass "required secret placeholders replaced"

tenant_id="$(grep -E '^CONTROL_PLANE_TENANT_ID=' "$ENV_FILE" | cut -d= -f2-)"
case "$tenant_id" in
  ''|*[!0-9]*) fail "CONTROL_PLANE_TENANT_ID must be a positive integer" ;;
  0) fail "CONTROL_PLANE_TENANT_ID must be > 0" ;;
esac
pass "control-plane tenant scope configured"

agent_allowlist="$(grep -E '^VOICE_ELEVENLABS_AGENT_ALLOWLIST=' "$ENV_FILE" | cut -d= -f2-)"
case "$agent_allowlist" in
  agent_[A-Za-z0-9_-]*) ;;
  *) fail "VOICE_ELEVENLABS_AGENT_ALLOWLIST must contain a LAB agent identifier" ;;
esac
pass "LAB agent allowlist supplied by deployment env"

printf '%s\n' 'GATE=PASS'

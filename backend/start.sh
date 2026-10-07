#!/bin/sh
set -eu

DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
WAIT_SECONDS="${DB_WAIT_SECONDS:-60}"

echo "Aguardando banco de dados em ${DB_HOST}:${DB_PORT}..."
elapsed=0
until nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; do
  if [ "$elapsed" -ge "$WAIT_SECONDS" ]; then
    echo "Banco indisponível após ${WAIT_SECONDS}s; abortando startup." >&2
    exit 1
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo "Banco disponível."

if [ ! -f "dist/server.js" ]; then
  echo "Build compilado ausente; imagem inválida." >&2
  exit 1
fi

# Schema changes are an explicit deployment gate, never a side effect of
# restarting the API. In LAB, enable only in a one-shot migration job.
if [ "${RUN_DB_MIGRATIONS:-false}" = "true" ]; then
  echo "RUN_DB_MIGRATIONS=true: executando migrações explicitamente."
  npx sequelize-cli db:migrate
fi

if [ "${RUN_DB_SEEDS:-false}" = "true" ]; then
  echo "RUN_DB_SEEDS=true: executando seeds explicitamente."
  npx sequelize-cli db:seed:all
fi

echo "Iniciando API..."
exec node dist/server.js

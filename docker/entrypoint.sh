#!/bin/sh
# CTD Cloud Run entrypoint — Cloud SQL unix socket, no sidecars.
# DB: connection via /cloudsql/<conn>/.s.PGSQL.5432 injected by --add-cloudsql-instances.
# Env: DATABASE_URL + ACDA_PG_PASSWORD (Secret Manager).
set -e

echo "[entrypoint] Starting CTD backend (tsx) on PORT=${PORT:-8080}"
echo "[entrypoint] DB endpoint: ${DATABASE_URL%%@*}@<redacted>"
exec ./node_modules/.bin/tsx server/index.ts

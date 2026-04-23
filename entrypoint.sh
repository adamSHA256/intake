#!/bin/sh
set -e

echo "[entrypoint] running migrations..."
npx --no-install node-pg-migrate up --migrations-dir migrations --lock

echo "[entrypoint] starting app..."
exec "$@"

#!/bin/sh
# Weekly demo-data wipe. Runs inside the cron container (see Dockerfile.cron)
# and reaches the db container over the compose network.
#
# Env vars passed by docker-compose.yml: PGHOST, PGUSER, PGPASSWORD, PGDATABASE.

set -eu

psql "postgres://${PGUSER:-intake}:${PGPASSWORD:-intake}@${PGHOST:-db}:5432/${PGDATABASE:-intake}" \
  -v ON_ERROR_STOP=1 \
  -q \
  -c "BEGIN; DELETE FROM pre_reg; DELETE FROM intake_events; COMMIT;"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) wiped pre_reg + intake_events"

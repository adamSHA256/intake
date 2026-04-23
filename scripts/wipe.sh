#!/usr/bin/env bash
# Deletes all demo data from the intake database.
# Safe to run any time; used by cron for the weekly wipe and by operators ad-hoc.
# Assumes this script lives in <repo>/scripts/ and docker compose runs from <repo>.

set -euo pipefail

cd "$(dirname "$0")/.."

SQL="
  BEGIN;
    DELETE FROM pre_reg;
    DELETE FROM intake_events;
  COMMIT;
"

docker compose exec -T db psql -U intake -d intake -v ON_ERROR_STOP=1 -q -c "$SQL"

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) wiped pre_reg + intake_events"

#!/bin/sh
set -eu

WEBSITE_ID="507834ba-6479-41a7-bac6-177240a39c95"
CUTOFF="24 months"
MODE="${1:-apply}"

if [ "$MODE" != "apply" ] && [ "$MODE" != "--dry-run" ]; then
  echo "Usage: $0 [apply|--dry-run]" >&2
  exit 2
fi

if [ "$MODE" = "--dry-run" ]; then
  docker exec -i analytics-umami-db-1 psql -X -v ON_ERROR_STOP=1 -U umami -d umami \
    -v website_id="$WEBSITE_ID" -v cutoff="$CUTOFF" <<'SQL'
SELECT 'website_event' AS table_name, count(*) AS rows_to_delete FROM website_event WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval
UNION ALL SELECT 'event_data', count(*) FROM event_data WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval
UNION ALL SELECT 'session', count(*) FROM "session" WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval
UNION ALL SELECT 'session_data', count(*) FROM session_data WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval
UNION ALL SELECT 'revenue', count(*) FROM revenue WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval
UNION ALL SELECT 'session_replay', count(*) FROM session_replay WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval
UNION ALL SELECT 'session_replay_saved', count(*) FROM session_replay_saved WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval;
SQL
  exit 0
fi

docker exec -i analytics-umami-db-1 psql -X -v ON_ERROR_STOP=1 -U umami -d umami \
  -v website_id="$WEBSITE_ID" -v cutoff="$CUTOFF" <<'SQL'
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('devawesome-analytics-retention'));
WITH deleted AS (DELETE FROM event_data WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval RETURNING 1) SELECT 'event_data' AS table_name, count(*) AS deleted FROM deleted;
WITH deleted AS (DELETE FROM revenue WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval RETURNING 1) SELECT 'revenue' AS table_name, count(*) AS deleted FROM deleted;
WITH deleted AS (DELETE FROM session_data WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval RETURNING 1) SELECT 'session_data' AS table_name, count(*) AS deleted FROM deleted;
WITH deleted AS (DELETE FROM session_replay WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval RETURNING 1) SELECT 'session_replay' AS table_name, count(*) AS deleted FROM deleted;
WITH deleted AS (DELETE FROM session_replay_saved WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval RETURNING 1) SELECT 'session_replay_saved' AS table_name, count(*) AS deleted FROM deleted;
WITH deleted AS (DELETE FROM website_event WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval RETURNING 1) SELECT 'website_event' AS table_name, count(*) AS deleted FROM deleted;
WITH deleted AS (DELETE FROM "session" WHERE website_id = :'website_id'::uuid AND created_at < CURRENT_TIMESTAMP - :'cutoff'::interval RETURNING 1) SELECT 'session' AS table_name, count(*) AS deleted FROM deleted;
COMMIT;
SQL

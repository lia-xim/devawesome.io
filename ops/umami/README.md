# DevAwesome Umami operations

This directory contains the only server-side analytics changes maintained by this repository.

- `create-devawesome-funnels.sql` creates three idempotent saved funnel reports for the DevAwesome website only.
- `prune-devawesome-analytics.sh` deletes raw DevAwesome analytics rows older than 24 months. It does not delete saved reports, website settings, users, teams, or data for another website.
- `umami-devawesome-retention.cron` runs that scoped retention job once per day without requiring root access or changing another service.

Run a retention preview with:

    /opt/analytics/maintenance/prune-devawesome-analytics.sh --dry-run

The production cron entry uses the explicit website ID and the existing `analytics-umami-db-1` container. If the Umami container name or schema changes, the job must fail closed until this script is reviewed.

\set ON_ERROR_STOP on
BEGIN;

WITH owner AS (
  SELECT COALESCE(user_id, created_by) AS user_id
  FROM website
  WHERE website_id = '507834ba-6479-41a7-bac6-177240a39c95'::uuid
), definitions(name, description, parameters) AS (
  VALUES
    ('DevAwesome · All tool completions', 'View → input → run → result → copy/download within 60 minutes.', '{"steps":[{"type":"event","value":"tool-view"},{"type":"event","value":"tool-input"},{"type":"event","value":"tool-run"},{"type":"event","value":"tool-result"},{"type":"event","value":"tool-export"}],"window":60}'::jsonb),
    ('DevAwesome · Keyword import workflow', 'Flagship keyword workbench from view to reviewed export.', '{"steps":[{"type":"event","value":"prepare-keyword-import-view"},{"type":"event","value":"prepare-keyword-import-input"},{"type":"event","value":"prepare-keyword-import-run"},{"type":"event","value":"prepare-keyword-import-result"},{"type":"event","value":"prepare-keyword-import-export"}],"window":60}'::jsonb),
    ('DevAwesome · Crawl-list workflow', 'Flagship crawl-list workbench from view to reviewed export.', '{"steps":[{"type":"event","value":"build-clean-crawl-list-view"},{"type":"event","value":"build-clean-crawl-list-input"},{"type":"event","value":"build-clean-crawl-list-run"},{"type":"event","value":"build-clean-crawl-list-result"},{"type":"event","value":"build-clean-crawl-list-export"}],"window":60}'::jsonb)
)
INSERT INTO report (report_id, user_id, website_id, type, name, description, parameters, created_at, updated_at)
SELECT gen_random_uuid(), owner.user_id, '507834ba-6479-41a7-bac6-177240a39c95'::uuid, 'funnel', definitions.name, definitions.description, definitions.parameters, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM owner CROSS JOIN definitions
WHERE owner.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM report
    WHERE website_id = '507834ba-6479-41a7-bac6-177240a39c95'::uuid
      AND type = 'funnel'
      AND name = definitions.name
  );

COMMIT;

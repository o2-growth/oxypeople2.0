-- =============================================================================
-- 0009 — pg_cron jobs to schedule edge functions
-- =============================================================================
-- ⚠️ Requires Supabase Pro plan (pg_cron + pg_net are extensions)
-- Sources: architecture-review.md §7.3
-- Risk: 🟡 Medium — only works on paid plan; placeholder URLs/keys must be edited
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BEFORE APPLYING:
--   1. Confirm Supabase plan supports pg_cron (Pro+)
--   2. Replace <SUPABASE_URL> with project URL (e.g., https://xyz.supabase.co)
--   3. Store SERVICE_ROLE_KEY as a Supabase secret rather than inline
--      (use vault.create_secret + vault.decrypted_secrets)
-- -----------------------------------------------------------------------------

-- Ensure extensions exist (no-op if already present)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. Helper: store service role key in vault (one-time, manual)
-- -----------------------------------------------------------------------------
-- Run this MANUALLY once (psql or SQL editor), not as part of migration:
--   SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key', 'For pg_cron edge calls');
-- Then in jobs below, retrieve via:
--   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')

-- -----------------------------------------------------------------------------
-- 2. Helper function to call edge functions (centralized)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.call_edge_function(
  function_name text,
  payload jsonb DEFAULT '{}'::jsonb
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url text;
  v_key text;
  v_request_id bigint;
BEGIN
  v_url := current_setting('app.supabase_url', true) || '/functions/v1/' || function_name;
  v_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1);

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'service_role_key not found in vault — run vault.create_secret first';
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := payload
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Set the supabase URL (run manually once with project URL)
--    ALTER DATABASE postgres SET app.supabase_url = 'https://xyz.supabase.co';
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 4. CRON JOBS — schedule edge function calls
-- -----------------------------------------------------------------------------

-- 4.1 OKR escalation — daily at 09:00 UTC (06:00 BRT)
SELECT cron.unschedule('okr-escalation-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'okr-escalation-daily'
);
SELECT cron.schedule(
  'okr-escalation-daily',
  '0 9 * * *',
  $$ SELECT public.call_edge_function('okr-escalation'); $$
);

-- 4.2 Run automations (birthdays, anniversaries) — daily 08:00 UTC
SELECT cron.unschedule('run-automations-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-automations-daily'
);
SELECT cron.schedule(
  'run-automations-daily',
  '0 8 * * *',
  $$ SELECT public.call_edge_function('run-automations'); $$
);

-- 4.3 Pulse survey dispatcher — hourly (the function checks if any survey is due)
SELECT cron.unschedule('pulse-dispatch-hourly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'pulse-dispatch-hourly'
);
SELECT cron.schedule(
  'pulse-dispatch-hourly',
  '0 * * * *',
  $$ SELECT public.call_edge_function('pulse-dispatch'); $$
);

-- 4.4 Recurring 1:1 generator — every 6 hours
SELECT cron.unschedule('one-on-one-recurrence') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'one-on-one-recurrence'
);
SELECT cron.schedule(
  'one-on-one-recurrence',
  '0 */6 * * *',
  $$ SELECT public.call_edge_function('one-on-one-recurrence'); $$
);

-- 4.5 Feedback request expiration — daily at 23:00 UTC
SELECT cron.unschedule('feedback-expire-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'feedback-expire-daily'
);
SELECT cron.schedule(
  'feedback-expire-daily',
  '0 23 * * *',
  $$
    UPDATE public.feedback_requests
    SET status = 'expired', updated_at = now()
    WHERE status = 'requested'
      AND due_date IS NOT NULL
      AND due_date < CURRENT_DATE;
  $$
);

-- -----------------------------------------------------------------------------
-- 5. View to inspect scheduled jobs (admin convenience)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.cron_jobs_status AS
  SELECT
    j.jobname,
    j.schedule,
    j.active,
    jr.start_time AS last_run,
    jr.status AS last_status,
    jr.return_message AS last_message
  FROM cron.job j
  LEFT JOIN LATERAL (
    SELECT * FROM cron.job_run_details
    WHERE jobid = j.jobid
    ORDER BY start_time DESC
    LIMIT 1
  ) jr ON true;

GRANT SELECT ON public.cron_jobs_status TO authenticated;

-- =============================================================================
-- END 0009
-- =============================================================================

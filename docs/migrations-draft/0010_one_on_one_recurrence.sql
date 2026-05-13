-- =============================================================================
-- 0010 — 1:1s: automatic recurrence — generate next occurrence on completion
-- =============================================================================
-- Story 6.6 — "Geração da próxima ocorrência (cron)"
-- ACs: 1, 2, 3, 5
-- =============================================================================

-- Drop existing trigger and function if present (idempotent)
DROP TRIGGER IF EXISTS trg_one_on_one_generate_next ON public.one_on_ones;
DROP FUNCTION IF EXISTS public.one_on_one_generate_next();

-- -----------------------------------------------------------------------------
-- Function: one_on_one_generate_next
-- Fires AFTER UPDATE OF status on one_on_ones when the new status is a
-- terminal state (completed, canceled, no_show) and recurrence is set.
-- Inserts the next occurrence, skipping if one already exists (AC5).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.one_on_one_generate_next()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_interval    interval;
  v_next_at     timestamptz;
  v_root_id     uuid;
BEGIN
  -- Determine the interval based on the recurrence type
  IF NEW.recurrence = 'weekly' THEN
    v_interval := INTERVAL '7 days';
  ELSIF NEW.recurrence = 'biweekly' THEN
    v_interval := INTERVAL '14 days';
  ELSIF NEW.recurrence = 'monthly' THEN
    v_interval := INTERVAL '1 month';
  ELSE
    -- Should not reach here due to WHEN clause, but guard anyway
    RETURN NEW;
  END IF;

  v_next_at  := NEW.scheduled_at + v_interval;
  v_root_id  := COALESCE(NEW.recurrence_parent_id, NEW.id);

  -- AC5: anti-duplication — only insert if no scheduled occurrence
  -- with the same root and the same computed next date already exists
  INSERT INTO public.one_on_ones (
    leader_id,
    member_id,
    company_id,
    duration_minutes,
    location,
    recurrence,
    recurrence_parent_id,
    scheduled_at,
    status
  )
  SELECT
    NEW.leader_id,
    NEW.member_id,
    NEW.company_id,
    NEW.duration_minutes,
    NEW.location,
    NEW.recurrence,
    v_root_id,
    v_next_at,
    'scheduled'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.one_on_ones
    WHERE recurrence_parent_id = v_root_id
      AND status = 'scheduled'
      AND scheduled_at = v_next_at
  );

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: trg_one_on_one_generate_next
-- Fires AFTER UPDATE OF status, only when transitioning to a terminal state
-- and recurrence is active (not 'none').
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_one_on_one_generate_next
  AFTER UPDATE OF status
  ON public.one_on_ones
  FOR EACH ROW
  WHEN (
    NEW.status IN ('completed', 'canceled', 'no_show')
    AND NEW.recurrence <> 'none'
    AND OLD.status NOT IN ('completed', 'canceled', 'no_show')
  )
  EXECUTE FUNCTION public.one_on_one_generate_next();

-- =============================================================================
-- END 0010
-- =============================================================================

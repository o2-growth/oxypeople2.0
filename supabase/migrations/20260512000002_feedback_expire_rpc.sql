-- =============================================================================
-- 0009b — Feedback Expire RPC (Plano B: chamada via GitHub Actions / botão admin)
-- =============================================================================
-- Additive: CREATE FUNCTION only — no table changes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.expire_feedback_requests()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- TODO P1: registrar audit log quando chamado manualmente (AC7)

  UPDATE public.feedback_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'requested'
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

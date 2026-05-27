-- =============================================================================
-- 0011 — PDI approval fields + approved_at guard trigger
-- =============================================================================
-- Sources: story-7.5-aprovacao-gestor.md
-- Risk: 🟢 Low — additive columns + BEFORE UPDATE trigger
-- =============================================================================

-- 1. Add approval tracking fields (additive — no data loss)
ALTER TABLE public.pdi_plans
  ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_comment text;

-- 2. Trigger function: only the designated manager can set/clear approved_at
CREATE OR REPLACE FUNCTION public.guard_pdi_approved_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only fires when approved_at actually changes
  IF NEW.approved_at IS DISTINCT FROM OLD.approved_at THEN
    -- Allow service role (auth.uid() IS NULL) for migrations / admin tooling
    IF auth.uid() IS NOT NULL AND auth.uid() <> COALESCE(NEW.manager_id, OLD.manager_id) THEN
      RAISE EXCEPTION 'Apenas o gestor designado pode aprovar ou revogar a aprovação do PDI';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_pdi_approved_at ON public.pdi_plans;
CREATE TRIGGER trg_guard_pdi_approved_at
  BEFORE UPDATE OF approved_at ON public.pdi_plans
  FOR EACH ROW EXECUTE FUNCTION public.guard_pdi_approved_at();

-- =============================================================================
-- END 0011
-- =============================================================================

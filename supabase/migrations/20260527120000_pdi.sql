-- =============================================================================
-- 0008 — PDI: Plano de Desenvolvimento Individual
-- =============================================================================
-- Sources: brownfield-assessment.md (P0 #5), architecture-review.md §5.5
-- Risk: 🟢 Low — new tables; storage bucket additive
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. pdi_plans — main plan entity
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pdi_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),       -- owner of the plan
  manager_id uuid REFERENCES public.users(id),              -- approver (optional)
  cycle_id uuid REFERENCES public.performance_cycles(id) ON DELETE SET NULL,
  evaluation_id uuid REFERENCES public.performance_evaluations(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'canceled')),
  target_date date,
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),

  approved_at timestamptz,
  completed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdi_plans_user ON public.pdi_plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pdi_plans_manager ON public.pdi_plans(manager_id) WHERE manager_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdi_plans_company ON public.pdi_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_pdi_plans_cycle ON public.pdi_plans(cycle_id) WHERE cycle_id IS NOT NULL;

ALTER TABLE public.pdi_plans ENABLE ROW LEVEL SECURITY;

-- SELECT: owner, assigned manager, current direct manager (via is_user_manager), admin
DROP POLICY IF EXISTS "Owner manager admin view PDI" ON public.pdi_plans;
CREATE POLICY "Owner manager admin view PDI"
ON public.pdi_plans FOR SELECT
USING (
  user_id = auth.uid()
  OR manager_id = auth.uid()
  OR public.is_user_manager(auth.uid(), user_id, company_id)
  OR public.is_company_admin(auth.uid(), company_id)
);

-- INSERT: owner creates own plan; manager can create for direct report
DROP POLICY IF EXISTS "Owner or manager creates PDI" ON public.pdi_plans;
CREATE POLICY "Owner or manager creates PDI"
ON public.pdi_plans FOR INSERT
WITH CHECK (
  public.is_company_member(auth.uid(), company_id)
  AND (
    user_id = auth.uid()
    OR public.is_user_manager(auth.uid(), user_id, company_id)
  )
);

-- UPDATE: owner or assigned manager (status can be changed by manager only when active+)
DROP POLICY IF EXISTS "Owner or manager updates PDI" ON public.pdi_plans;
CREATE POLICY "Owner or manager updates PDI"
ON public.pdi_plans FOR UPDATE
USING (
  user_id = auth.uid()
  OR manager_id = auth.uid()
  OR public.is_user_manager(auth.uid(), user_id, company_id)
);

-- DELETE: owner if draft, or admin
DROP POLICY IF EXISTS "Owner draft or admin deletes PDI" ON public.pdi_plans;
CREATE POLICY "Owner draft or admin deletes PDI"
ON public.pdi_plans FOR DELETE
USING (
  (user_id = auth.uid() AND status = 'draft')
  OR public.is_company_admin(auth.uid(), company_id)
);

DROP TRIGGER IF EXISTS update_pdi_plans_updated_at ON public.pdi_plans;
CREATE TRIGGER update_pdi_plans_updated_at
  BEFORE UPDATE ON public.pdi_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 2. pdi_competencies — what to develop
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pdi_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_plan_id uuid NOT NULL REFERENCES public.pdi_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  current_level smallint NOT NULL CHECK (current_level BETWEEN 1 AND 5),
  target_level smallint NOT NULL CHECK (target_level BETWEEN 1 AND 5),
  category text,  -- e.g., "technical", "leadership", "behavioral"
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pdi_competency_target_gte_current CHECK (target_level >= current_level)
);

CREATE INDEX IF NOT EXISTS idx_pdi_comp_plan ON public.pdi_competencies(pdi_plan_id);

ALTER TABLE public.pdi_competencies ENABLE ROW LEVEL SECURITY;

-- SELECT/INSERT/UPDATE/DELETE: same audience as parent plan
DROP POLICY IF EXISTS "PDI access via plan" ON public.pdi_competencies;
CREATE POLICY "PDI access via plan"
ON public.pdi_competencies FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pdi_plans p
  WHERE p.id = pdi_competencies.pdi_plan_id
    AND (
      p.user_id = auth.uid()
      OR p.manager_id = auth.uid()
      OR public.is_user_manager(auth.uid(), p.user_id, p.company_id)
      OR public.is_company_admin(auth.uid(), p.company_id)
    )
));

DROP POLICY IF EXISTS "PDI write competency via plan owner/mgr" ON public.pdi_competencies;
CREATE POLICY "PDI write competency via plan owner/mgr"
ON public.pdi_competencies FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pdi_plans p
  WHERE p.id = pdi_competencies.pdi_plan_id
    AND (p.user_id = auth.uid() OR p.manager_id = auth.uid())
));

DROP POLICY IF EXISTS "PDI update competency" ON public.pdi_competencies;
CREATE POLICY "PDI update competency"
ON public.pdi_competencies FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.pdi_plans p
  WHERE p.id = pdi_competencies.pdi_plan_id
    AND (p.user_id = auth.uid() OR p.manager_id = auth.uid())
));

DROP POLICY IF EXISTS "PDI delete competency" ON public.pdi_competencies;
CREATE POLICY "PDI delete competency"
ON public.pdi_competencies FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.pdi_plans p
  WHERE p.id = pdi_competencies.pdi_plan_id
    AND (p.user_id = auth.uid() OR p.manager_id = auth.uid())
));

DROP TRIGGER IF EXISTS update_pdi_competencies_updated_at ON public.pdi_competencies;
CREATE TRIGGER update_pdi_competencies_updated_at
  BEFORE UPDATE ON public.pdi_competencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 3. pdi_actions — concrete actions (kanban-style, like existing actions table)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pdi_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdi_plan_id uuid NOT NULL REFERENCES public.pdi_plans(id) ON DELETE CASCADE,
  competency_id uuid REFERENCES public.pdi_competencies(id) ON DELETE SET NULL,
  feedback_request_id uuid REFERENCES public.feedback_requests(id) ON DELETE SET NULL,

  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done', 'blocked')),
  due_date date,
  completed_at timestamptz,
  evidence_url text,  -- file path in pdi-attachments bucket
  order_index integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdi_actions_plan ON public.pdi_actions(pdi_plan_id, status);
CREATE INDEX IF NOT EXISTS idx_pdi_actions_comp ON public.pdi_actions(competency_id) WHERE competency_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdi_actions_due ON public.pdi_actions(due_date) WHERE due_date IS NOT NULL AND status <> 'done';

ALTER TABLE public.pdi_actions ENABLE ROW LEVEL SECURITY;

-- Same audience as parent plan
DROP POLICY IF EXISTS "PDI action select via plan" ON public.pdi_actions;
CREATE POLICY "PDI action select via plan"
ON public.pdi_actions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pdi_plans p
  WHERE p.id = pdi_actions.pdi_plan_id
    AND (
      p.user_id = auth.uid()
      OR p.manager_id = auth.uid()
      OR public.is_user_manager(auth.uid(), p.user_id, p.company_id)
      OR public.is_company_admin(auth.uid(), p.company_id)
    )
));

DROP POLICY IF EXISTS "PDI action insert via plan" ON public.pdi_actions;
CREATE POLICY "PDI action insert via plan"
ON public.pdi_actions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pdi_plans p
  WHERE p.id = pdi_actions.pdi_plan_id
    AND (p.user_id = auth.uid() OR p.manager_id = auth.uid())
));

DROP POLICY IF EXISTS "PDI action update via plan" ON public.pdi_actions;
CREATE POLICY "PDI action update via plan"
ON public.pdi_actions FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.pdi_plans p
  WHERE p.id = pdi_actions.pdi_plan_id
    AND (p.user_id = auth.uid() OR p.manager_id = auth.uid())
));

DROP POLICY IF EXISTS "PDI action delete via plan" ON public.pdi_actions;
CREATE POLICY "PDI action delete via plan"
ON public.pdi_actions FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.pdi_plans p
  WHERE p.id = pdi_actions.pdi_plan_id
    AND (p.user_id = auth.uid() OR p.manager_id = auth.uid())
));

DROP TRIGGER IF EXISTS update_pdi_actions_updated_at ON public.pdi_actions;
CREATE TRIGGER update_pdi_actions_updated_at
  BEFORE UPDATE ON public.pdi_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Auto-update progress on action status change
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recalc_pdi_progress()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan_id uuid;
  v_total int;
  v_done int;
BEGIN
  v_plan_id := COALESCE(NEW.pdi_plan_id, OLD.pdi_plan_id);

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'done')
  INTO v_total, v_done
  FROM public.pdi_actions
  WHERE pdi_plan_id = v_plan_id;

  UPDATE public.pdi_plans
  SET progress = CASE WHEN v_total = 0 THEN 0 ELSE ROUND(100.0 * v_done / v_total) END,
      updated_at = now()
  WHERE id = v_plan_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_pdi_progress ON public.pdi_actions;
CREATE TRIGGER trg_recalc_pdi_progress
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.pdi_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_pdi_progress();

-- -----------------------------------------------------------------------------
-- 5. Storage bucket for evidence files (private)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdi-attachments', 'pdi-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users upload own pdi attachments" ON storage.objects;
CREATE POLICY "Users upload own pdi attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pdi-attachments'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users read own pdi attachments" ON storage.objects;
CREATE POLICY "Users read own pdi attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'pdi-attachments'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users delete own pdi attachments" ON storage.objects;
CREATE POLICY "Users delete own pdi attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pdi-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =============================================================================
-- END 0008
-- =============================================================================

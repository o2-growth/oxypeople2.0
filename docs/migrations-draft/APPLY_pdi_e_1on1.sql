-- ============================================================
-- CONSOLIDADO: migrations faltantes no banco de produção
-- Projeto: oxypeople (ixtsnaxhgyoeaotrched) — CONFIRA na URL do dashboard!
-- Gerado em 2026-06-10 a partir de 4 migrations do repo.
-- Idempotente (IF NOT EXISTS / DROP IF EXISTS). Não apaga dados.
-- Ordem: 1on1 -> pdi -> 1on1 recurrence -> pdi approval guard
-- ============================================================

BEGIN;

-- ============ 20260513000001_one_on_ones.sql ============
-- =============================================================================
-- 0007 — 1:1s: structured leader-member meetings with private/shared notes
-- =============================================================================
-- Sources: brownfield-assessment.md (P0 #2), architecture-review.md §5.4
-- Risk: 🟡 Medium — RLS for private notes is critical (must not leak)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. one_on_ones — meeting instance
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.one_on_ones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  leader_id uuid NOT NULL REFERENCES public.users(id),
  member_id uuid NOT NULL REFERENCES public.users(id),
  scheduled_at timestamptz NOT NULL,
  duration_minutes smallint NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 5 AND 480),
  location text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'canceled', 'no_show')),
  recurrence text NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none', 'weekly', 'biweekly', 'monthly')),
  recurrence_parent_id uuid REFERENCES public.one_on_ones(id) ON DELETE SET NULL,
  completed_at timestamptz,
  canceled_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT one_on_one_distinct_users CHECK (leader_id <> member_id)
);

CREATE INDEX IF NOT EXISTS idx_one_on_ones_leader ON public.one_on_ones(leader_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_member ON public.one_on_ones(member_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_company ON public.one_on_ones(company_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_status ON public.one_on_ones(status, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_one_on_ones_recurrence ON public.one_on_ones(recurrence_parent_id) WHERE recurrence_parent_id IS NOT NULL;

ALTER TABLE public.one_on_ones ENABLE ROW LEVEL SECURITY;

-- SELECT: only the two parties + admin
DROP POLICY IF EXISTS "Parties view 1on1" ON public.one_on_ones;
CREATE POLICY "Parties view 1on1"
ON public.one_on_ones FOR SELECT
USING (
  auth.uid() IN (leader_id, member_id)
  OR public.is_company_admin(auth.uid(), company_id)
);

-- INSERT: leader OR member can schedule (and must be company member)
DROP POLICY IF EXISTS "Members create 1on1" ON public.one_on_ones;
CREATE POLICY "Members create 1on1"
ON public.one_on_ones FOR INSERT
WITH CHECK (
  auth.uid() IN (leader_id, member_id)
  AND public.is_company_member(auth.uid(), company_id)
  AND public.is_company_member(leader_id, company_id)
  AND public.is_company_member(member_id, company_id)
);

-- UPDATE: parties only
DROP POLICY IF EXISTS "Parties update 1on1" ON public.one_on_ones;
CREATE POLICY "Parties update 1on1"
ON public.one_on_ones FOR UPDATE
USING (auth.uid() IN (leader_id, member_id));

-- DELETE: parties (only if scheduled and not in past) or admin
DROP POLICY IF EXISTS "Parties or admin delete 1on1" ON public.one_on_ones;
CREATE POLICY "Parties or admin delete 1on1"
ON public.one_on_ones FOR DELETE
USING (
  (auth.uid() IN (leader_id, member_id) AND status = 'scheduled')
  OR public.is_company_admin(auth.uid(), company_id)
);

DROP TRIGGER IF EXISTS update_one_on_ones_updated_at ON public.one_on_ones;
CREATE TRIGGER update_one_on_ones_updated_at
  BEFORE UPDATE ON public.one_on_ones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 2. one_on_one_topics — collaborative agenda items
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.one_on_one_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  one_on_one_id uuid NOT NULL REFERENCES public.one_on_ones(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  done boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topics_one_on_one ON public.one_on_one_topics(one_on_one_id, order_index);

ALTER TABLE public.one_on_one_topics ENABLE ROW LEVEL SECURITY;

-- SELECT: parties of parent 1:1
DROP POLICY IF EXISTS "Parties view topics" ON public.one_on_one_topics;
CREATE POLICY "Parties view topics"
ON public.one_on_one_topics FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.one_on_ones o
  WHERE o.id = one_on_one_topics.one_on_one_id
    AND auth.uid() IN (o.leader_id, o.member_id)
));

-- INSERT: parties only
DROP POLICY IF EXISTS "Parties create topics" ON public.one_on_one_topics;
CREATE POLICY "Parties create topics"
ON public.one_on_one_topics FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.one_on_ones o
    WHERE o.id = one_on_one_topics.one_on_one_id
      AND auth.uid() IN (o.leader_id, o.member_id)
  )
);

-- UPDATE: parties (any can mark done, original author can edit content)
DROP POLICY IF EXISTS "Parties update topics" ON public.one_on_one_topics;
CREATE POLICY "Parties update topics"
ON public.one_on_one_topics FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.one_on_ones o
  WHERE o.id = one_on_one_topics.one_on_one_id
    AND auth.uid() IN (o.leader_id, o.member_id)
));

-- DELETE: original author only
DROP POLICY IF EXISTS "Author delete topic" ON public.one_on_one_topics;
CREATE POLICY "Author delete topic"
ON public.one_on_one_topics FOR DELETE
USING (created_by = auth.uid());

DROP TRIGGER IF EXISTS update_topics_updated_at ON public.one_on_one_topics;
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.one_on_one_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 3. one_on_one_notes — with strict visibility (CRITICAL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.one_on_one_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  one_on_one_id uuid NOT NULL REFERENCES public.one_on_ones(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.users(id),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  visibility text NOT NULL
    CHECK (visibility IN ('shared', 'private_leader', 'private_member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_one_on_one ON public.one_on_one_notes(one_on_one_id);
CREATE INDEX IF NOT EXISTS idx_notes_author ON public.one_on_one_notes(author_id);

ALTER TABLE public.one_on_one_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: shared visible to both parties; private only to its respective owner
-- ⚠️ This policy is the most security-sensitive in the entire app — TEST THOROUGHLY
DROP POLICY IF EXISTS "Notes visibility by role" ON public.one_on_one_notes;
CREATE POLICY "Notes visibility by role"
ON public.one_on_one_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.one_on_ones o
  WHERE o.id = one_on_one_notes.one_on_one_id
    AND (
      (one_on_one_notes.visibility = 'shared'
        AND auth.uid() IN (o.leader_id, o.member_id))
      OR
      (one_on_one_notes.visibility = 'private_leader'
        AND auth.uid() = o.leader_id
        AND one_on_one_notes.author_id = o.leader_id)
      OR
      (one_on_one_notes.visibility = 'private_member'
        AND auth.uid() = o.member_id
        AND one_on_one_notes.author_id = o.member_id)
    )
));

-- INSERT: author must be a party AND author must match the visibility role
DROP POLICY IF EXISTS "Parties create notes with role-matched visibility" ON public.one_on_one_notes;
CREATE POLICY "Parties create notes with role-matched visibility"
ON public.one_on_one_notes FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.one_on_ones o
    WHERE o.id = one_on_one_notes.one_on_one_id
      AND auth.uid() IN (o.leader_id, o.member_id)
      AND (
        (visibility = 'shared')
        OR (visibility = 'private_leader' AND auth.uid() = o.leader_id)
        OR (visibility = 'private_member' AND auth.uid() = o.member_id)
      )
  )
);

-- UPDATE: author only
DROP POLICY IF EXISTS "Author updates own note" ON public.one_on_one_notes;
CREATE POLICY "Author updates own note"
ON public.one_on_one_notes FOR UPDATE
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- DELETE: author only
DROP POLICY IF EXISTS "Author deletes own note" ON public.one_on_one_notes;
CREATE POLICY "Author deletes own note"
ON public.one_on_one_notes FOR DELETE
USING (author_id = auth.uid());

DROP TRIGGER IF EXISTS update_notes_updated_at ON public.one_on_one_notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.one_on_one_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- END 0007
-- =============================================================================

-- ============ 20260527120000_pdi.sql ============
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

-- ============ 20260527120002_one_on_one_recurrence.sql ============
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

-- ============ 20260527120003_pdi_approval_guard.sql ============
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

COMMIT;

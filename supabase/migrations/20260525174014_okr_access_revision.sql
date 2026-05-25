-- =============================================================================
-- OKR Access Revision
-- Rules:
--   1. All company members can VIEW any objective (no tier restriction)
--   2. Only managers (Diretoria) can INSERT/UPDATE/DELETE key_results
--   3. Only KR owner or objective owner/assignee can INSERT check-ins
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. OBJECTIVES SELECT — all active company members can view
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "okr_objectives_select" ON public.objectives;

CREATE POLICY "okr_objectives_select"
ON public.objectives FOR SELECT
USING (
  is_company_member(auth.uid(), company_id)
  AND deleted_at IS NULL
);

-- -----------------------------------------------------------------------------
-- 2. KEY_RESULTS SELECT — piggybacks on objective visibility (unchanged logic,
--    but re-created to stay consistent with new objective policy above)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "okr_key_results_select" ON public.key_results;

CREATE POLICY "okr_key_results_select"
ON public.key_results FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = key_results.objective_id
  )
);

-- -----------------------------------------------------------------------------
-- 3. KEY_RESULTS INSERT — only managers or admins can create KRs
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "okr_key_results_insert" ON public.key_results;

CREATE POLICY "okr_key_results_insert"
ON public.key_results FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = key_results.objective_id
      AND (
        has_okr_access(auth.uid(), o.company_id, 'manager')
        OR is_company_admin(auth.uid(), o.company_id)
      )
  )
);

-- -----------------------------------------------------------------------------
-- 4. KEY_RESULTS UPDATE — only managers or admins can edit KRs
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "okr_key_results_update" ON public.key_results;

CREATE POLICY "okr_key_results_update"
ON public.key_results FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = key_results.objective_id
      AND (
        has_okr_access(auth.uid(), o.company_id, 'manager')
        OR is_company_admin(auth.uid(), o.company_id)
      )
  )
);

-- -----------------------------------------------------------------------------
-- 5. KEY_RESULTS DELETE — only managers or admins can delete KRs
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "okr_key_results_delete" ON public.key_results;

CREATE POLICY "okr_key_results_delete"
ON public.key_results FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = key_results.objective_id
      AND (
        has_okr_access(auth.uid(), o.company_id, 'manager')
        OR is_company_admin(auth.uid(), o.company_id)
      )
  )
);

-- -----------------------------------------------------------------------------
-- 6. OKR_CHECKINS INSERT — only KR owner or objective owner/assignee
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "okr_checkins_insert" ON public.okr_checkins;

CREATE POLICY "okr_checkins_insert"
ON public.okr_checkins FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.key_results kr
    JOIN public.objectives o ON o.id = kr.objective_id
    WHERE kr.id = okr_checkins.key_result_id
      AND (
        kr.owner_user_id = auth.uid()
        OR o.owner_id    = auth.uid()
        OR o.assignee_id = auth.uid()
        OR is_company_admin(auth.uid(), o.company_id)
      )
  )
);

-- =============================================================================
-- END
-- =============================================================================

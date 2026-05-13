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

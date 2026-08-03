-- =============================================================================
-- Correção: índices de dedup do import precisam ser totais, não parciais
-- =============================================================================
-- A migration 20260803130000 criou os índices de feedz_ref com
-- `WHERE feedz_ref IS NOT NULL`. Índice parcial só é elegível para ON CONFLICT
-- se o comando repetir a mesma cláusula WHERE — e o PostgREST (usado pelo
-- supabase-js) não emite essa cláusula. Resultado: todo upsert do importador
-- falhava com "no unique or exclusion constraint matching the ON CONFLICT
-- specification".
--
-- Índice total resolve sem efeito colateral: no Postgres, NULL nunca é igual a
-- NULL num índice único, então as linhas nascidas no app (feedz_ref NULL)
-- continuam podendo existir em qualquer quantidade.
--
-- Risco: 🟢 Baixo — troca de índice, sem alteração de dados.
-- =============================================================================

DROP INDEX IF EXISTS public.idx_perf_eval_feedz_ref;
CREATE UNIQUE INDEX IF NOT EXISTS idx_perf_eval_feedz_ref
  ON public.performance_evaluations(company_id, feedz_ref);

DROP INDEX IF EXISTS public.idx_one_on_ones_feedz_ref;
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_on_ones_feedz_ref
  ON public.one_on_ones(company_id, feedz_ref);

DROP INDEX IF EXISTS public.idx_recognitions_feedz_ref;
CREATE UNIQUE INDEX IF NOT EXISTS idx_recognitions_feedz_ref
  ON public.recognitions(company_id, feedz_ref);

DROP INDEX IF EXISTS public.idx_feedback_requests_feedz_ref;
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_requests_feedz_ref
  ON public.feedback_requests(company_id, feedz_ref);

DROP INDEX IF EXISTS public.idx_company_events_feedz_ref;
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_events_feedz_ref
  ON public.company_events(company_id, feedz_ref);

DROP INDEX IF EXISTS public.idx_memberships_feedz_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_feedz_id
  ON public.company_memberships(company_id, feedz_id);

-- employee_demographics já usava UNIQUE(company_id, user_id) — constraint de
-- tabela, não índice parcial — e por isso funcionou desde a primeira execução.

-- Rastreio do import no e-NPS histórico. Ele vai para pulse_surveys (e não
-- nps_surveys): pulse_responses aceita user_id nulo, que é o que o e-NPS exige
-- por ser anônimo, e é a mesma tabela onde o e-NPS ativo já roda — então o
-- histórico e o corrente aparecem no mesmo gráfico.
ALTER TABLE public.pulse_surveys
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'feedz')),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedz_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_surveys_feedz_ref
  ON public.pulse_surveys(company_id, feedz_ref);

-- =============================================================================
-- Importação do histórico do Feedz — estruturas que faltavam
-- =============================================================================
-- Contexto: o Feedz foi desativado e o backup exportado em 30/07/2026 traz
-- 162 colaboradores, 52 avaliações de desempenho, 15 reuniões 1:1, 130
-- celebrações, 167 feedbacks, 196 registros de humor, 111 turnovers e ~13.8k
-- lançamentos de moedas. Quase tudo já tem destino no schema atual; esta
-- migration cria o que faltava e os campos de rastreio da importação.
--
-- Risco: 🟢 Baixo — só tabelas novas e colunas aditivas. Idempotente.
-- RLS: dados demográficos e humor são restritos a admin; o resto segue o
--      padrão da tabela que já os hospeda.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. company_memberships — campos de RH que o Feedz tinha e nós não
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS employee_code       text,   -- matrícula
  ADD COLUMN IF NOT EXISTS unit                text,   -- unidade/filial
  ADD COLUMN IF NOT EXISTS termination_type    text,   -- voluntário / involuntário
  ADD COLUMN IF NOT EXISTS termination_reason  text,
  ADD COLUMN IF NOT EXISTS last_working_day    date,
  ADD COLUMN IF NOT EXISTS feedz_id            text;   -- id de origem, dedup idempotente

CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_feedz_id
  ON public.company_memberships(company_id, feedz_id)
  WHERE feedz_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_employee_code
  ON public.company_memberships(company_id, employee_code)
  WHERE employee_code IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. users — biografia livre (o Feedz tinha; não é dado sensível)
-- -----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio text;

-- -----------------------------------------------------------------------------
-- 3. employee_demographics — dados sensíveis, isolados de propósito
-- -----------------------------------------------------------------------------
-- CPF, etnia e gênero saem do Feedz junto com o resto, mas não pertencem a
-- company_memberships: aquela tabela é lida por qualquer membro em várias telas.
-- Em tabela própria, a RLS restringe a admin sem precisar de coluna-a-coluna.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_demographics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  cpf         text,
  ethnicity   text,   -- "Branca", "Parda", "Preta", … (texto livre na origem)
  sex         text,   -- sexo registrado no Feedz
  gender      text,   -- identidade de gênero declarada

  source      text NOT NULL DEFAULT 'feedz' CHECK (source IN ('feedz', 'manual', 'pipefy')),
  imported_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (company_id, user_id)
);

ALTER TABLE public.employee_demographics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view employee_demographics" ON public.employee_demographics;
CREATE POLICY "Admin view employee_demographics"
ON public.employee_demographics FOR SELECT
USING (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin insert employee_demographics" ON public.employee_demographics;
CREATE POLICY "Admin insert employee_demographics"
ON public.employee_demographics FOR INSERT
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin update employee_demographics" ON public.employee_demographics;
CREATE POLICY "Admin update employee_demographics"
ON public.employee_demographics FOR UPDATE
USING (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin delete employee_demographics" ON public.employee_demographics;
CREATE POLICY "Admin delete employee_demographics"
ON public.employee_demographics FOR DELETE
USING (public.is_company_admin(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_employee_demographics_updated_at ON public.employee_demographics;
CREATE TRIGGER update_employee_demographics_updated_at
  BEFORE UPDATE ON public.employee_demographics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 4. mood_entries — histórico de humor
-- -----------------------------------------------------------------------------
-- Era o "termômetro de humor" do Feedz: a pessoa registra como está, com nota e
-- comentário opcional. Não havia equivalente aqui — pulse_surveys mede clima por
-- pesquisa disparada, não por registro espontâneo do dia.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  person_name text NOT NULL,          -- nome cru: preserva o histórico de quem já saiu

  score numeric(4,2),                 -- nota do humor na escala da origem
  mood_label text,                    -- rótulo textual ("Feliz", "Cansado", …)
  description text,                   -- comentário livre

  department text,
  unit text,

  recorded_at timestamptz NOT NULL,
  source      text NOT NULL DEFAULT 'feedz' CHECK (source IN ('feedz', 'app')),
  imported_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mood_company_date
  ON public.mood_entries(company_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_user
  ON public.mood_entries(user_id, recorded_at DESC) WHERE user_id IS NOT NULL;

-- Dedup da reimportação: a origem não tem id, então a chave natural é
-- pessoa + instante do registro.
CREATE UNIQUE INDEX IF NOT EXISTS idx_mood_dedup
  ON public.mood_entries(company_id, person_name, recorded_at);

ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- A pessoa vê o próprio histórico; admin vê o da empresa toda.
DROP POLICY IF EXISTS "View own mood_entries" ON public.mood_entries;
CREATE POLICY "View own mood_entries"
ON public.mood_entries FOR SELECT
USING (user_id = auth.uid() OR public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin insert mood_entries" ON public.mood_entries;
CREATE POLICY "Admin insert mood_entries"
ON public.mood_entries FOR INSERT
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin update mood_entries" ON public.mood_entries;
CREATE POLICY "Admin update mood_entries"
ON public.mood_entries FOR UPDATE
USING (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin delete mood_entries" ON public.mood_entries;
CREATE POLICY "Admin delete mood_entries"
ON public.mood_entries FOR DELETE
USING (public.is_company_admin(auth.uid(), company_id));

-- -----------------------------------------------------------------------------
-- 5. Rastreio de importação nas tabelas que já existiam
-- -----------------------------------------------------------------------------
-- Sem isso não dá para distinguir o que veio do Feedz do que nasceu aqui — e
-- reimportar viraria duplicata. `feedz_ref` guarda a chave natural da origem.
-- -----------------------------------------------------------------------------
ALTER TABLE public.performance_cycles
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'feedz')),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

ALTER TABLE public.performance_evaluations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'feedz')),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedz_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_perf_eval_feedz_ref
  ON public.performance_evaluations(company_id, feedz_ref)
  WHERE feedz_ref IS NOT NULL;

ALTER TABLE public.one_on_ones
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'feedz')),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedz_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_on_ones_feedz_ref
  ON public.one_on_ones(company_id, feedz_ref)
  WHERE feedz_ref IS NOT NULL;

ALTER TABLE public.recognitions
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'feedz')),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedz_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recognitions_feedz_ref
  ON public.recognitions(company_id, feedz_ref)
  WHERE feedz_ref IS NOT NULL;

ALTER TABLE public.feedback_requests
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'feedz')),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedz_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_feedback_requests_feedz_ref
  ON public.feedback_requests(company_id, feedz_ref)
  WHERE feedz_ref IS NOT NULL;

ALTER TABLE public.company_events
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'feedz')),
  ADD COLUMN IF NOT EXISTS imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedz_ref text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_events_feedz_ref
  ON public.company_events(company_id, feedz_ref)
  WHERE feedz_ref IS NOT NULL;

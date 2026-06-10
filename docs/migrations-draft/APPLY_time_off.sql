-- =============================================================================
-- time_off — Gestão de Férias/Ausências (PJ: suspensão de contrato)
-- =============================================================================
-- Fonte dos dados: Pipe Pipefy "7.4 Comunicado de Suspensão de Contrato" (306506057)
--   + lançamento manual de histórico pelo admin.
-- Risco: 🟢 Baixo — tabelas novas + coluna aditiva. Idempotente.
-- RLS: visão/edição restrita a admins (is_company_admin).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Vínculo com o registro de origem no Pipefy (Database de prestadores)
--    O connector "dados_pessoais" do Pipe referencia o ID do registro da pessoa.
-- -----------------------------------------------------------------------------
ALTER TABLE public.company_memberships
  ADD COLUMN IF NOT EXISTS pipefy_card_id text;

CREATE INDEX IF NOT EXISTS idx_memberships_pipefy_card
  ON public.company_memberships(pipefy_card_id)
  WHERE pipefy_card_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. time_off — um registro por período de ausência/férias
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  membership_id uuid REFERENCES public.company_memberships(id) ON DELETE SET NULL,
  person_name text NOT NULL,                  -- nome cru (origem Pipefy / fallback sem vínculo)

  start_date date NOT NULL,
  end_date date NOT NULL,
  days integer NOT NULL DEFAULT 1 CHECK (days >= 0),

  type text NOT NULL DEFAULT 'suspensao_pj'
    CHECK (type IN ('suspensao_pj', 'ferias', 'ausencia', 'outro')),
  status text NOT NULL DEFAULT 'realizada'
    CHECK (status IN ('agendada', 'em_andamento', 'realizada', 'arquivada', 'cancelada')),
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('pipefy', 'manual')),

  pipefy_card_id text UNIQUE,                 -- dedup idempotente na sync
  manager_name text,
  substitute_name text,
  notes text,

  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_time_off_company ON public.time_off(company_id);
CREATE INDEX IF NOT EXISTS idx_time_off_membership ON public.time_off(membership_id) WHERE membership_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_off_period ON public.time_off(company_id, start_date DESC);

ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view time_off" ON public.time_off;
CREATE POLICY "Admin view time_off"
ON public.time_off FOR SELECT
USING (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin insert time_off" ON public.time_off;
CREATE POLICY "Admin insert time_off"
ON public.time_off FOR INSERT
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin update time_off" ON public.time_off;
CREATE POLICY "Admin update time_off"
ON public.time_off FOR UPDATE
USING (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin delete time_off" ON public.time_off;
CREATE POLICY "Admin delete time_off"
ON public.time_off FOR DELETE
USING (public.is_company_admin(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_time_off_updated_at ON public.time_off;
CREATE TRIGGER update_time_off_updated_at
  BEFORE UPDATE ON public.time_off
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 3. time_off_settings — configuração de alerta por empresa (escolha do admin)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_off_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  -- modo do alerta: tempo desde admissão | tempo desde a última ausência | por agendadas
  alert_mode text NOT NULL DEFAULT 'since_hire'
    CHECK (alert_mode IN ('since_hire', 'since_last', 'scheduled')),
  overdue_months integer NOT NULL DEFAULT 12 CHECK (overdue_months > 0),
  soon_months integer NOT NULL DEFAULT 10 CHECK (soon_months > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.time_off_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view time_off_settings" ON public.time_off_settings;
CREATE POLICY "Admin view time_off_settings"
ON public.time_off_settings FOR SELECT
USING (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin upsert time_off_settings" ON public.time_off_settings;
CREATE POLICY "Admin upsert time_off_settings"
ON public.time_off_settings FOR INSERT
WITH CHECK (public.is_company_admin(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin update time_off_settings" ON public.time_off_settings;
CREATE POLICY "Admin update time_off_settings"
ON public.time_off_settings FOR UPDATE
USING (public.is_company_admin(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_time_off_settings_updated_at ON public.time_off_settings;
CREATE TRIGGER update_time_off_settings_updated_at
  BEFORE UPDATE ON public.time_off_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

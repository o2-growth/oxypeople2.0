-- =============================================================================
-- Copiloto de OKR — fundação: catálogo de métricas, contexto e governança de uso
-- =============================================================================
-- Fase 1 do plano de 08/09/2026. Três peças independentes do modelo de IA:
--
-- 1. metric_catalog — as métricas da casa (CPMQL, CAC, churn, no-show) com tipo,
--    direção e faixa. Vale para o copiloto e para o formulário manual: é o que
--    faz um KR de CPMQL nascer com currency/R$/teto seja quem for que digitou.
--    Sem isso, o erro de direção que derrubou 13 objetivos em 08/09 volta.
--
-- 2. okr_ai_context — uma chamada devolve tudo que o modelo precisa saber para
--    não propor "aumentar receita em 20%": período, time, colegas, objetivos da
--    empresa, histórico da área e o catálogo. Só o service_role executa; a edge
--    function passa o usuário já autenticado pelo JWT.
--
-- 3. ai_usage — quanto cada chamada custou e de quem. O limite é verificado
--    ANTES de chamar o modelo, não depois de gastar.
--
-- Nenhuma delas altera tabela existente. Risco: 🟢 Baixo — só criação.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Catálogo de métricas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.metric_catalog (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key          text NOT NULL,
  label        text NOT NULL,
  -- Como a métrica aparece escrita nos títulos de KR. O copiloto e a validação
  -- do formulário reconhecem a métrica por aqui.
  aliases      text[] NOT NULL DEFAULT '{}',
  kr_type      text NOT NULL CHECK (kr_type IN ('numeric','percent','currency','binary','sla_time')),
  -- 'down' cobre teto e redução; o sinal do span separa os dois (kr-progress.ts).
  direction    text NOT NULL CHECK (direction IN ('up','down')),
  unit         text,
  typical_min  numeric,
  typical_max  numeric,
  definition   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Uma métrica por empresa: sem isto viram cinco "CPMQL" com direções diferentes,
-- que é a origem do problema que o catálogo existe para resolver.
CREATE UNIQUE INDEX IF NOT EXISTS metric_catalog_company_key_idx
  ON public.metric_catalog (company_id, key);

CREATE INDEX IF NOT EXISTS metric_catalog_company_idx
  ON public.metric_catalog (company_id);

ALTER TABLE public.metric_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros veem o catálogo da empresa" ON public.metric_catalog;
CREATE POLICY "Membros veem o catálogo da empresa"
  ON public.metric_catalog FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Admin mantém o catálogo" ON public.metric_catalog;
CREATE POLICY "Admin mantém o catálogo"
  ON public.metric_catalog FOR ALL
  USING (public.is_company_admin(auth.uid(), company_id))
  WITH CHECK (public.is_company_admin(auth.uid(), company_id));

DROP TRIGGER IF EXISTS update_metric_catalog_updated_at ON public.metric_catalog;
CREATE TRIGGER update_metric_catalog_updated_at
  BEFORE UPDATE ON public.metric_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed: as métricas que JÁ aparecem nos KRs de hoje, com a configuração que a
-- correção de 08/09 provou ser a certa. Toda empresa do banco recebe as mesmas
-- linhas; quem quiser ajustar faixa ou apelido edita depois.
INSERT INTO public.metric_catalog
  (company_id, key, label, aliases, kr_type, direction, unit, typical_min, typical_max, definition)
SELECT c.id, v.key, v.label, v.aliases, v.kr_type, v.direction, v.unit, v.tmin, v.tmax, v.def
FROM public.companies c
CROSS JOIN (VALUES
  ('cpmql', 'Custo por MQL', ARRAY['CPMQL','Cost per MQL','custo por MQL'],
   'currency', 'down', 'R$', 300, 600,
   'Investimento em mídia dividido pelo número de MQLs no período. Meta é teto.'),
  ('cac', 'Custo de aquisição de cliente', ARRAY['CAC','custo de aquisição'],
   'currency', 'down', 'R$', 8000, 12000,
   'Custo total de marketing e vendas dividido pelos clientes ganhos. Meta é teto.'),
  ('cpv', 'Custo por venda', ARRAY['CPV','custo por venda'],
   'currency', 'down', 'R$', 3000, 7000,
   'Investimento dividido pelas vendas fechadas no período. Meta é teto.'),
  ('logo_churn', 'Churn de logo', ARRAY['Logo Churn','churn de logo','churn de clientes'],
   'percent', 'down', '%', 0, 5,
   'Percentual de clientes perdidos no período. Meta é teto.'),
  ('revenue_churn', 'Churn de receita', ARRAY['Revenue Churn','churn de receita','default churn'],
   'percent', 'down', '%', 0, 5,
   'Percentual de receita recorrente perdida no período. Meta é teto.'),
  ('lt_churn', 'Lifetime até o churn', ARRAY['LT Churn','lifetime'],
   'numeric', 'up', 'meses', 8, 24,
   'Quantos meses o cliente permanece antes de cancelar. Quanto maior, melhor.'),
  ('speed_to_lead', 'Speed-to-lead', ARRAY['Speed-to-lead','SLA MQL','tempo de resposta ao lead'],
   'numeric', 'down', 'min', 0, 5,
   'Minutos entre o lead virar MQL e o primeiro contato de vendas. Meta é teto.'),
  ('no_show_rate', 'Taxa de no-show', ARRAY['No Show Rate','no-show','taxa de não comparecimento'],
   'percent', 'down', '%', 0, 25,
   'Percentual de reuniões agendadas em que o lead não apareceu. Meta é teto.')
) AS v(key, label, aliases, kr_type, direction, unit, tmin, tmax, def)
ON CONFLICT (company_id, key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Governança de uso de IA
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  feature           text NOT NULL,
  model             text NOT NULL,
  input_tokens      integer NOT NULL DEFAULT 0,
  output_tokens     integer NOT NULL DEFAULT 0,
  cache_read_tokens integer NOT NULL DEFAULT 0,
  cost_usd          numeric(12,6) NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_company_created_idx ON public.ai_usage (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx    ON public.ai_usage (user_id, created_at DESC);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Pessoa vê o próprio uso" ON public.ai_usage;
CREATE POLICY "Pessoa vê o próprio uso"
  ON public.ai_usage FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin vê o uso da empresa" ON public.ai_usage;
CREATE POLICY "Admin vê o uso da empresa"
  ON public.ai_usage FOR SELECT
  USING (public.is_company_admin(auth.uid(), company_id));
-- Escrita é só do service_role (a edge function). Sem policy de INSERT, o
-- cliente não consegue forjar consumo.

/**
 * Ainda cabe mais uma chamada?
 *
 * Teto duplo porque os dois modos de estouro são diferentes: pessoa em loop de
 * tentativa (dia) e área inteira exagerando no fim do trimestre (mês). Os
 * números saem da estimativa do plano — um trimestre inteiro projetado é ~US$ 30,
 * então US$ 50/mês por empresa é folga, não limite apertado.
 */
CREATE OR REPLACE FUNCTION public.ai_usage_within_limit(
  p_user_id    uuid,
  p_company_id uuid,
  p_max_day_user      integer DEFAULT 60,
  p_max_month_company numeric DEFAULT 50.0
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT count(*) FROM public.ai_usage
      WHERE user_id = p_user_id AND created_at >= now() - interval '1 day') < p_max_day_user
    AND
    (SELECT COALESCE(sum(cost_usd), 0) FROM public.ai_usage
      WHERE company_id = p_company_id
        AND created_at >= date_trunc('month', now())) < p_max_month_company;
$$;

-- -----------------------------------------------------------------------------
-- 3. Contexto para o modelo
-- -----------------------------------------------------------------------------
/**
 * Tudo que o copiloto precisa saber sobre quem está escrevendo, numa chamada.
 *
 * Devolve apenas o que a pessoa já poderia ver na tela: times que ela integra,
 * objetivos da empresa no período e o histórico da própria área. Nenhum id de
 * usuário sai daqui — o modelo recebe nomes e o front resolve de volta, para
 * que uma proposta não consiga apontar para gente que a pessoa não conhece.
 *
 * Só service_role executa: a edge function valida o JWT e passa o dono da sessão.
 */
CREATE OR REPLACE FUNCTION public.okr_ai_context(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_period     jsonb;
  v_teams      jsonb;
  v_colegas    jsonb;
  v_pais       jsonb;
  v_historico  jsonb;
  v_metricas   jsonb;
BEGIN
  SELECT primary_company_id INTO v_company_id FROM public.users WHERE id = p_user_id;
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object('erro', 'usuário sem empresa');
  END IF;

  -- Período corrente: o que engloba hoje; se nenhum, o mais próximo à frente.
  SELECT to_jsonb(p) INTO v_period FROM (
    SELECT id, name, start_date, end_date
    FROM public.periods
    WHERE company_id = v_company_id
    ORDER BY (CURRENT_DATE BETWEEN start_date AND end_date) DESC, start_date DESC
    LIMIT 1
  ) p;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_teams FROM (
    SELECT t.id, t.name, t.department, tm.role
    FROM public.team_members tm
    JOIN public.teams t ON t.id = tm.team_id
    WHERE tm.user_id = p_user_id AND t.company_id = v_company_id
    ORDER BY t.name
  ) t;

  -- Só nome: o modelo cita gente por nome e o front resolve para id.
  SELECT COALESCE(jsonb_agg(DISTINCT u.full_name), '[]'::jsonb) INTO v_colegas
  FROM public.team_members tm
  JOIN public.users u ON u.id = tm.user_id
  WHERE tm.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = p_user_id)
    AND u.full_name IS NOT NULL;

  -- Objetivos aos quais este OKR pode se pendurar.
  SELECT COALESCE(jsonb_agg(to_jsonb(o)), '[]'::jsonb) INTO v_pais FROM (
    SELECT o.title, o.type, o.description
    FROM public.objectives o
    WHERE o.company_id = v_company_id
      AND o.deleted_at IS NULL
      AND o.is_active
      AND o.type IN ('strategic','tactical')
      AND (o.period_id = (v_period->>'id')::uuid OR o.period_id IS NULL)
    ORDER BY o.type, o.title
    LIMIT 40
  ) o;

  -- Como a área escreve KR: unidade, ordem de grandeza, o que já foi tentado.
  SELECT COALESCE(jsonb_agg(to_jsonb(k)), '[]'::jsonb) INTO v_historico FROM (
    SELECT kr.title, kr.kr_type, kr.direction, kr.unit,
           kr.initial_value, kr.target_value, o.title AS objetivo
    FROM public.key_results kr
    JOIN public.objectives o ON o.id = kr.objective_id
    WHERE o.company_id = v_company_id
      AND kr.deleted_at IS NULL
      AND o.deleted_at IS NULL
      AND (o.team_id IN (SELECT team_id FROM public.team_members WHERE user_id = p_user_id)
           OR o.owner_id = p_user_id)
    ORDER BY kr.created_at DESC
    LIMIT 30
  ) k;

  SELECT COALESCE(jsonb_agg(to_jsonb(m)), '[]'::jsonb) INTO v_metricas FROM (
    SELECT key, label, aliases, kr_type, direction, unit, typical_min, typical_max, definition
    FROM public.metric_catalog
    WHERE company_id = v_company_id
    ORDER BY key
  ) m;

  RETURN jsonb_build_object(
    'company_id', v_company_id,
    'periodo',    v_period,
    'times',      v_teams,
    'colegas',    v_colegas,
    'objetivos_pai', v_pais,
    'historico_kr',  v_historico,
    'metricas',      v_metricas
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.okr_ai_context(uuid) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.okr_ai_context(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.ai_usage_within_limit(uuid, uuid, integer, numeric) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.ai_usage_within_limit(uuid, uuid, integer, numeric) TO service_role, authenticated;

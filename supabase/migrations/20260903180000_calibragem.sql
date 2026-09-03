-- =============================================================================
-- Calibragem da avaliação de desempenho
-- =============================================================================
-- O gestor precisa comparar, atitude por atitude, a nota que o liderado se deu
-- com a nota que ele deu, e fechar uma nota calibrada. Duas coisas faltavam:
-- o lugar para guardar a nota calibrada, e a permissão de ler a autoavaliação
-- do liderado — hoje `can_view_evaluation_result` libera só para quem escreveu,
-- para o admin e para o próprio avaliado.
--
-- A regra de 03/08/2026 (migration 20260803180000) trava o resultado até o
-- avaliador fechar o ciclo, para ninguém calibrar a nota seguinte pela reação
-- da anterior. Ela continua valendo aqui: o gestor só enxerga a autoavaliação
-- de quem ele JÁ terminou de avaliar. Primeiro se compromete com a nota, depois
-- compara — que é a ordem que evita ancoragem.
--
-- Escala 1 / 1,5 / 2 / 2,5 / 3 (decisão do Andrey em 03/09/2026): a média entre
-- duas notas inteiras de 1 a 3 cai em meio ponto, e a calibragem precisa poder
-- confirmar a média como ela é, além de puxar para um degrau inteiro.
--
-- Risco: 🟡 Médio — amplia leitura da autoavaliação para quem lidera, sob
-- condição. Nenhum dado existente é alterado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. A nota calibrada, uma por atitude
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.performance_calibrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
  evaluated_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.performance_questions(id) ON DELETE CASCADE,

  score numeric(3, 2) NOT NULL CHECK (score IN (1, 1.5, 2, 2.5, 3)),

  -- Quem fechou a nota. Numa calibragem em comitê, importa saber de quem foi a
  -- caneta — e a linha pode ser reescrita por outro gestor ou pelo admin.
  calibrated_by uuid NOT NULL REFERENCES public.users(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (cycle_id, evaluated_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_calibrations_ciclo_pessoa
  ON public.performance_calibrations(cycle_id, evaluated_id);

DROP TRIGGER IF EXISTS trg_performance_calibrations_updated_at
  ON public.performance_calibrations;
CREATE TRIGGER trg_performance_calibrations_updated_at
  BEFORE UPDATE ON public.performance_calibrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Quem pode calibrar
-- -----------------------------------------------------------------------------
-- Quem lidera a pessoa (regra única de 03/09) ou o admin. O avaliado NÃO vê a
-- própria calibragem: é a conversa entre gestores antes da nota virar oficial,
-- e publicá-la é outra decisão, não um efeito colateral desta tela.
ALTER TABLE public.performance_calibrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lider ve calibragem de quem lidera" ON public.performance_calibrations;
CREATE POLICY "Lider ve calibragem de quem lidera"
ON public.performance_calibrations FOR SELECT
USING (
  is_company_admin(auth.uid(), company_id)
  OR leads_person(auth.uid(), evaluated_id, company_id)
);

DROP POLICY IF EXISTS "Lider grava calibragem de quem lidera" ON public.performance_calibrations;
CREATE POLICY "Lider grava calibragem de quem lidera"
ON public.performance_calibrations FOR INSERT
WITH CHECK (
  calibrated_by = auth.uid()
  AND (
    is_company_admin(auth.uid(), company_id)
    OR leads_person(auth.uid(), evaluated_id, company_id)
  )
);

DROP POLICY IF EXISTS "Lider corrige calibragem de quem lidera" ON public.performance_calibrations;
CREATE POLICY "Lider corrige calibragem de quem lidera"
ON public.performance_calibrations FOR UPDATE
USING (
  is_company_admin(auth.uid(), company_id)
  OR leads_person(auth.uid(), evaluated_id, company_id)
);

DROP POLICY IF EXISTS "Lider apaga calibragem de quem lidera" ON public.performance_calibrations;
CREATE POLICY "Lider apaga calibragem de quem lidera"
ON public.performance_calibrations FOR DELETE
USING (
  is_company_admin(auth.uid(), company_id)
  OR leads_person(auth.uid(), evaluated_id, company_id)
);

COMMENT ON TABLE public.performance_calibrations IS
  'Nota calibrada por atitude, fechada pelo gestor a partir da autoavaliação e '
  'da avaliação do líder. Não é visível ao avaliado.';

-- -----------------------------------------------------------------------------
-- 3. O gestor passa a enxergar a autoavaliação de quem ele já avaliou
-- -----------------------------------------------------------------------------
-- Sem isto a coluna da autoavaliação vem vazia: a autoavaliação é uma avaliação
-- em que o liderado é avaliador e avaliado, e o gestor não é nenhum dos dois.
--
-- A condição preserva a regra de 03/08: só libera para quem já concluiu a
-- própria avaliação sobre aquela pessoa naquele ciclo. Quem ainda não avaliou
-- continua sem ver — é o que impede a autoavaliação de ancorar a nota do líder.
CREATE OR REPLACE FUNCTION public.can_calibrate_evaluated(
  _cycle_id uuid,
  _evaluated_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.performance_evaluations e
    WHERE e.cycle_id = _cycle_id
      AND e.evaluator_id = _user_id
      AND e.evaluated_id = _evaluated_id
      AND e.evaluator_id <> e.evaluated_id
      AND e.status = 'completed'
  );
$$;

COMMENT ON FUNCTION public.can_calibrate_evaluated(uuid, uuid, uuid) IS
  'O avaliador já fechou a avaliação que devia fazer sobre esta pessoa neste '
  'ciclo? É a condição para ele ver a autoavaliação dela na calibragem.';

CREATE OR REPLACE FUNCTION public.can_view_evaluation_result(
  _evaluation_id uuid,
  _user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eval record;
BEGIN
  SELECT cycle_id, evaluator_id, evaluated_id, company_id, status
    INTO v_eval
  FROM public.performance_evaluations
  WHERE id = _evaluation_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Quem escreveu sempre vê o que escreveu.
  IF v_eval.evaluator_id = _user_id THEN
    RETURN true;
  END IF;

  -- Admin acompanha o ciclo inteiro (é quem conduz o processo).
  IF public.is_company_admin(_user_id, v_eval.company_id) THEN
    RETURN true;
  END IF;

  -- Quem foi avaliado só vê depois que o avaliador fechou tudo o que devia.
  IF v_eval.evaluated_id = _user_id THEN
    RETURN v_eval.status = 'completed'
       AND public.evaluator_finished_cycle(v_eval.cycle_id, v_eval.evaluator_id);
  END IF;

  -- Calibragem (03/09/2026): a autoavaliação de quem eu lidero e já avaliei.
  -- Só a autoavaliação — a avaliação que um terceiro fez sobre a pessoa
  -- continua fora do alcance de quem não participou dela.
  IF v_eval.evaluator_id = v_eval.evaluated_id
     AND public.leads_person(_user_id, v_eval.evaluated_id, v_eval.company_id)
     AND public.can_calibrate_evaluated(v_eval.cycle_id, v_eval.evaluated_id, _user_id)
  THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. A linha da autoavaliação também precisa aparecer
-- -----------------------------------------------------------------------------
-- performance_answers já é filtrada por can_view_evaluation_result, mas a tela
-- precisa antes achar a avaliação para saber quais respostas pedir — e o SELECT
-- de performance_evaluations só devolve o que é do próprio usuário.
DROP POLICY IF EXISTS "Lider ve autoavaliacao para calibrar" ON public.performance_evaluations;
CREATE POLICY "Lider ve autoavaliacao para calibrar"
ON public.performance_evaluations FOR SELECT
USING (
  evaluator_id = evaluated_id
  AND leads_person(auth.uid(), evaluated_id, company_id)
  AND can_calibrate_evaluated(cycle_id, evaluated_id, auth.uid())
);

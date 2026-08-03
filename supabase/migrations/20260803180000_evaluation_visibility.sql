-- =============================================================================
-- Visibilidade dos resultados da avaliação de desempenho
-- =============================================================================
-- Regra definida pelo Andrey em 03/08/2026:
--
--   • quem avalia sempre vê o que escreveu;
--   • o liderado só vê a avaliação que o gestor fez dele DEPOIS que o gestor
--     terminou as avaliações de TODOS os seus liderados naquele ciclo;
--   • o gestor vê as avaliações que recebeu dos liderados pela mesma regra:
--     só depois de ter concluído as dele.
--
-- O porquê da trava: se o resultado aparecesse assim que uma avaliação fosse
-- enviada, o gestor poderia calibrar as notas seguintes pela reação da
-- primeira, e o liderado poderia responder o gestor já sabendo a própria nota.
-- Liberar tudo de uma vez, ao fim do trabalho do gestor, remove esse incentivo.
--
-- Risco: 🟢 Baixo — funções novas e políticas de SELECT. Não altera dados.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. O avaliador terminou tudo o que devia neste ciclo?
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluator_finished_cycle(
  _cycle_id uuid,
  _evaluator_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Verdadeiro quando não resta nenhuma avaliação em aberto para esta pessoa
  -- no ciclo. Só conta o que ela precisa fazer sobre OUTRAS pessoas: a
  -- autoavaliação é dela e não deve travar a liberação para o time.
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.performance_evaluations e
    WHERE e.cycle_id = _cycle_id
      AND e.evaluator_id = _evaluator_id
      AND e.evaluated_id <> _evaluator_id
      AND e.status <> 'completed'
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. Esta pessoa pode ver o resultado desta avaliação?
-- -----------------------------------------------------------------------------
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

  RETURN false;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. RLS de performance_answers — é onde moram as notas e os comentários
-- -----------------------------------------------------------------------------
ALTER TABLE public.performance_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver respostas conforme visibilidade" ON public.performance_answers;
CREATE POLICY "Ver respostas conforme visibilidade"
ON public.performance_answers FOR SELECT
USING (public.can_view_evaluation_result(evaluation_id, auth.uid()));

DROP POLICY IF EXISTS "Avaliador escreve as próprias respostas" ON public.performance_answers;
CREATE POLICY "Avaliador escreve as próprias respostas"
ON public.performance_answers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.performance_evaluations e
    WHERE e.id = evaluation_id AND e.evaluator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Avaliador edita as próprias respostas" ON public.performance_answers;
CREATE POLICY "Avaliador edita as próprias respostas"
ON public.performance_answers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.performance_evaluations e
    WHERE e.id = evaluation_id AND e.evaluator_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Avaliador apaga as próprias respostas" ON public.performance_answers;
CREATE POLICY "Avaliador apaga as próprias respostas"
ON public.performance_answers FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.performance_evaluations e
    WHERE e.id = evaluation_id AND e.evaluator_id = auth.uid()
  )
);

-- -----------------------------------------------------------------------------
-- 4. Visão de "o que eu recebi" — já com a trava aplicada
-- -----------------------------------------------------------------------------
-- A tela precisa saber que existe uma avaliação sobre a pessoa mesmo quando o
-- resultado ainda está bloqueado, para conseguir dizer "sai quando seu gestor
-- concluir" em vez de simplesmente não mostrar nada.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.my_evaluation_results AS
SELECT
  e.id,
  e.cycle_id,
  e.company_id,
  e.evaluator_id,
  e.evaluated_id,
  e.relationship,
  e.status,
  e.completed_at,
  public.can_view_evaluation_result(e.id, auth.uid()) AS can_view,
  CASE
    WHEN public.can_view_evaluation_result(e.id, auth.uid()) THEN e.overall_score
    ELSE NULL
  END AS overall_score
FROM public.performance_evaluations e
WHERE e.evaluated_id = auth.uid()
   OR e.evaluator_id = auth.uid();

COMMENT ON VIEW public.my_evaluation_results IS
  'Avaliações em que a pessoa é avaliada ou avaliadora. overall_score só vem preenchido quando a liberação já ocorreu.';

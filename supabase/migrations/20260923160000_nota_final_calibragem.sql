-- =============================================================================
-- Nota final da calibragem: publicar, reabrir e guardar o histórico
-- =============================================================================
-- A calibragem já existia atitude por atitude (performance_calibrations), mas
-- não virava número nenhum: ninguém via a nota final, e quem foi avaliado não
-- tinha onde olhar o resultado do ciclo.
--
-- O histórico ganha casa numa tabela que já existe e já tem dado dentro:
-- performance_reviews guarda as 11 avaliações importadas do Feedz (2025). Os
-- ciclos novos entram ao lado, com source 'oxypeople', e a pessoa passa a ver
-- a linha do tempo inteira num lugar só.
--
-- O cálculo mora AQUI e não no cliente. A nota é o resultado de um processo
-- entre pessoas; aceitar o número que o navegador mandar seria confiar no
-- cliente para decidir o desempenho de alguém. Espelha
-- `src/lib/performance/nota-final.ts` — as duas mudam juntas.
--
-- Publicação é POR PESSOA: cada líder publica quem ele calibrou, sem esperar o
-- ciclo inteiro. Reabrir é permitido e fica registrado — erro acontece, e foi
-- exatamente o caso da avaliação corrigida em 08/09.
--
-- Risco: 🟡 Médio — cria colunas e tabela, não altera dado existente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. O que falta em performance_reviews
-- -----------------------------------------------------------------------------
ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS cycle_id     uuid REFERENCES public.performance_cycles(id) ON DELETE SET NULL,
  -- Nula enquanto a nota é rascunho do comitê; preenchida quando vira oficial.
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- A conta atitude por atitude, congelada no momento da publicação: sem isto,
  -- recalibrar depois mudaria silenciosamente a explicação de uma nota que a
  -- pessoa já leu.
  ADD COLUMN IF NOT EXISTS breakdown    jsonb;

-- Uma nota por pessoa por ciclo. O histórico importado fica de fora porque não
-- tem cycle_id.
CREATE UNIQUE INDEX IF NOT EXISTS performance_reviews_ciclo_pessoa_idx
  ON public.performance_reviews (cycle_id, user_id)
  WHERE cycle_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Trilha de publicação
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.performance_review_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id  uuid NOT NULL REFERENCES public.performance_reviews(id) ON DELETE CASCADE,
  action     text NOT NULL CHECK (action IN ('published', 'reopened')),
  actor_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  score      numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS performance_review_events_review_idx
  ON public.performance_review_events (review_id, created_at DESC);

ALTER TABLE public.performance_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trilha visível para quem vê a avaliação" ON public.performance_review_events;
CREATE POLICY "Trilha visível para quem vê a avaliação"
  ON public.performance_review_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.performance_reviews r
     WHERE r.id = review_id
       AND (r.user_id = auth.uid() OR public.is_company_admin(auth.uid(), r.company_id))
  ));

-- -----------------------------------------------------------------------------
-- 3. Quem vê a nota
-- -----------------------------------------------------------------------------
-- A policy antiga deixava a pessoa ler a própria linha em qualquer estado, o
-- que agora significaria ver a nota antes de ela ser publicada — o rascunho da
-- conversa do comitê.
DROP POLICY IF EXISTS "Self and admins read performance reviews" ON public.performance_reviews;
CREATE POLICY "Ver nota conforme publicação"
  ON public.performance_reviews FOR SELECT
  USING (
    public.is_company_admin(auth.uid(), company_id)
    -- A pessoa vê a própria nota depois de publicada. Histórico importado não
    -- tem ciclo e continua visível, como sempre esteve.
    OR (user_id = auth.uid() AND (published_at IS NOT NULL OR cycle_id IS NULL))
    -- Quem lidera acompanha o time, publicado ou não: é quem conduz a conversa.
    OR public.leads_person(auth.uid(), user_id, company_id)
  );

-- -----------------------------------------------------------------------------
-- 4. Publicar
-- -----------------------------------------------------------------------------
/**
 * Fecha a nota de UMA pessoa no ciclo.
 *
 * Média das atitudes: vale a nota calibrada; onde o comitê não tocou, vale a
 * média entre autoavaliação e líder — o consenso que as duas partes já tinham.
 * Atitude sem nenhuma das três impede a publicação: entregar um número que não
 * mede o que diz medir é pior do que não entregar.
 */
CREATE OR REPLACE FUNCTION public.performance_publicar_nota(
  p_cycle_id uuid,
  p_evaluated_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_company_id uuid;
  v_ciclo      record;
  v_pode       boolean;
  v_total      integer;
  v_sem_base   integer;
  v_score      numeric;
  v_breakdown  jsonb;
  v_review_id  uuid;
BEGIN
  SELECT * INTO v_ciclo FROM public.performance_cycles WHERE id = p_cycle_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo não encontrado.'; END IF;
  v_company_id := v_ciclo.company_id;

  -- Admin conduz o processo; o líder publica quem ele mesmo avaliou.
  v_pode := public.is_company_admin(auth.uid(), v_company_id)
         OR EXISTS (
              SELECT 1 FROM public.performance_evaluations e
               WHERE e.cycle_id = p_cycle_id
                 AND e.evaluated_id = p_evaluated_id
                 AND e.relationship = 'manager'
                 AND e.evaluator_id = auth.uid()
            );
  IF NOT v_pode THEN RAISE EXCEPTION 'Sem permissão para publicar esta nota.'; END IF;

  WITH base AS (
    SELECT
      q.id AS question_id,
      (SELECT a.score FROM public.performance_answers a
         JOIN public.performance_evaluations e ON e.id = a.evaluation_id
        WHERE a.question_id = q.id AND e.cycle_id = p_cycle_id
          AND e.evaluated_id = p_evaluated_id AND e.relationship = 'self'
        LIMIT 1) AS self_score,
      (SELECT a.score FROM public.performance_answers a
         JOIN public.performance_evaluations e ON e.id = a.evaluation_id
        WHERE a.question_id = q.id AND e.cycle_id = p_cycle_id
          AND e.evaluated_id = p_evaluated_id AND e.relationship = 'manager'
        LIMIT 1) AS leader_score,
      (SELECT c.score FROM public.performance_calibrations c
        WHERE c.question_id = q.id AND c.cycle_id = p_cycle_id
          AND c.evaluated_id = p_evaluated_id
        LIMIT 1) AS calibrado
    FROM public.performance_questions q
    WHERE q.cycle_id = p_cycle_id
  ), calculado AS (
    SELECT question_id,
      CASE
        WHEN calibrado IS NOT NULL THEN calibrado
        WHEN self_score IS NOT NULL AND leader_score IS NOT NULL THEN (self_score + leader_score) / 2.0
        ELSE NULL
      END AS valor,
      CASE
        WHEN calibrado IS NOT NULL THEN 'calibrado'
        WHEN self_score IS NOT NULL AND leader_score IS NOT NULL THEN 'consenso'
        ELSE 'sem base'
      END AS origem
    FROM base
  )
  SELECT count(*), count(*) FILTER (WHERE valor IS NULL),
         round(avg(valor) FILTER (WHERE valor IS NOT NULL), 2),
         jsonb_agg(jsonb_build_object('question_id', question_id, 'valor', valor, 'origem', origem))
    INTO v_total, v_sem_base, v_score, v_breakdown
  FROM calculado;

  IF v_total = 0 THEN RAISE EXCEPTION 'O ciclo não tem perguntas cadastradas.'; END IF;
  IF v_sem_base > 0 THEN
    RAISE EXCEPTION 'Faltam notas em % atitude(s): sem autoavaliação nem nota do líder.', v_sem_base;
  END IF;

  INSERT INTO public.performance_reviews
    (company_id, user_id, cycle_id, review_name, period_start, period_end,
     final_score, source, breakdown, published_at, published_by)
  VALUES
    (v_company_id, p_evaluated_id, p_cycle_id, v_ciclo.name, v_ciclo.start_date, v_ciclo.end_date,
     v_score, 'oxypeople', v_breakdown, now(), auth.uid())
  ON CONFLICT (cycle_id, user_id) WHERE cycle_id IS NOT NULL
  DO UPDATE SET
     final_score  = EXCLUDED.final_score,
     breakdown    = EXCLUDED.breakdown,
     published_at = now(),
     published_by = auth.uid(),
     updated_at   = now()
  RETURNING id INTO v_review_id;

  INSERT INTO public.performance_review_events (review_id, action, actor_id, score)
  VALUES (v_review_id, 'published', auth.uid(), v_score);

  RETURN jsonb_build_object('review_id', v_review_id, 'score', v_score, 'atitudes', v_total);
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Reabrir
-- -----------------------------------------------------------------------------
/** Tira a nota do ar para corrigir. O registro fica; some da vista de quem foi avaliado. */
CREATE OR REPLACE FUNCTION public.performance_reabrir_nota(
  p_cycle_id uuid,
  p_evaluated_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_review record;
  v_pode   boolean;
BEGIN
  SELECT r.* INTO v_review FROM public.performance_reviews r
   WHERE r.cycle_id = p_cycle_id AND r.user_id = p_evaluated_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Esta nota ainda não foi publicada.'; END IF;

  v_pode := public.is_company_admin(auth.uid(), v_review.company_id)
         OR EXISTS (
              SELECT 1 FROM public.performance_evaluations e
               WHERE e.cycle_id = p_cycle_id AND e.evaluated_id = p_evaluated_id
                 AND e.relationship = 'manager' AND e.evaluator_id = auth.uid()
            );
  IF NOT v_pode THEN RAISE EXCEPTION 'Sem permissão para reabrir esta nota.'; END IF;

  UPDATE public.performance_reviews
     SET published_at = NULL, updated_at = now()
   WHERE id = v_review.id;

  INSERT INTO public.performance_review_events (review_id, action, actor_id, score)
  VALUES (v_review.id, 'reopened', auth.uid(), v_review.final_score);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.performance_publicar_nota(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.performance_reabrir_nota(uuid, uuid)  FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.performance_publicar_nota(uuid, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.performance_reabrir_nota(uuid, uuid)  TO authenticated;

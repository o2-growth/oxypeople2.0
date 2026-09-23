-- =============================================================================
-- Prévia das notas finais do ciclo, em uma chamada
-- =============================================================================
-- A lista de calibragem precisa mostrar a nota de cada pessoa antes de alguém
-- publicar. Calcular no cliente exigiria baixar as respostas de todo mundo do
-- ciclo — 20 pessoas × 12 atitudes × 3 avaliações — só para exibir uma coluna.
--
-- Mesma conta de performance_publicar_nota: calibrado, senão o consenso entre
-- autoavaliação e líder. Quem não tem nota de líder (o topo da hierarquia, que
-- só recebe autoavaliação e avaliação dos liderados) aparece com sem_base > 0,
-- e a tela mostra por que não dá para publicar em vez de esconder a pessoa.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.performance_notas_do_ciclo(p_cycle_id uuid)
RETURNS TABLE (
  evaluated_id uuid,
  score        numeric,
  calibradas   integer,
  herdadas     integer,
  sem_base     integer,
  publicada    boolean,
  published_at timestamptz,
  score_publicado numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH pessoas AS (
    SELECT DISTINCT e.evaluated_id
      FROM public.performance_evaluations e
     WHERE e.cycle_id = p_cycle_id
       AND e.relationship = 'manager'
       -- Admin conduz o ciclo; o líder vê quem ele avaliou.
       AND (public.is_company_admin(auth.uid(), e.company_id) OR e.evaluator_id = auth.uid())
  ), linhas AS (
    SELECT p.evaluated_id, q.id AS question_id,
      (SELECT a.score FROM public.performance_answers a
         JOIN public.performance_evaluations e ON e.id = a.evaluation_id
        WHERE a.question_id = q.id AND e.cycle_id = p_cycle_id
          AND e.evaluated_id = p.evaluated_id AND e.relationship = 'self' LIMIT 1) AS self_score,
      (SELECT a.score FROM public.performance_answers a
         JOIN public.performance_evaluations e ON e.id = a.evaluation_id
        WHERE a.question_id = q.id AND e.cycle_id = p_cycle_id
          AND e.evaluated_id = p.evaluated_id AND e.relationship = 'manager' LIMIT 1) AS leader_score,
      (SELECT c.score FROM public.performance_calibrations c
        WHERE c.question_id = q.id AND c.cycle_id = p_cycle_id
          AND c.evaluated_id = p.evaluated_id LIMIT 1) AS calibrado
      FROM pessoas p
      CROSS JOIN public.performance_questions q
     WHERE q.cycle_id = p_cycle_id
  ), calculado AS (
    SELECT evaluated_id,
      CASE WHEN calibrado IS NOT NULL THEN calibrado
           WHEN self_score IS NOT NULL AND leader_score IS NOT NULL THEN (self_score + leader_score) / 2.0
      END AS valor,
      calibrado IS NOT NULL AS foi_calibrado,
      (calibrado IS NULL AND self_score IS NOT NULL AND leader_score IS NOT NULL) AS foi_herdado
    FROM linhas
  )
  SELECT
    c.evaluated_id,
    round(avg(c.valor) FILTER (WHERE c.valor IS NOT NULL), 2) AS score,
    count(*) FILTER (WHERE c.foi_calibrado)::integer          AS calibradas,
    count(*) FILTER (WHERE c.foi_herdado)::integer            AS herdadas,
    count(*) FILTER (WHERE c.valor IS NULL)::integer          AS sem_base,
    r.published_at IS NOT NULL                                AS publicada,
    r.published_at,
    r.final_score                                             AS score_publicado
  FROM calculado c
  LEFT JOIN public.performance_reviews r
    ON r.cycle_id = p_cycle_id AND r.user_id = c.evaluated_id
  GROUP BY c.evaluated_id, r.published_at, r.final_score;
$$;

REVOKE EXECUTE ON FUNCTION public.performance_notas_do_ciclo(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.performance_notas_do_ciclo(uuid) TO authenticated;

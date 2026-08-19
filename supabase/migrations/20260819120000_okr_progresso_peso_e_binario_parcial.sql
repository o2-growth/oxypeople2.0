-- =============================================================================
-- Progresso de OKR: pesos ausentes não zeram nada e binário tem avanço parcial
-- =============================================================================
-- Sintoma (Q3/2026): toda a árvore de OKRs em 0% no dash, com KRs andando
-- (95%, 100%...). Duas causas em update_objective_progress:
--
-- 1. A UI cria KR com weight_percentage = 0 e a função fazia
--    `IF soma_pesos > 0 ... ELSE progress := 0` — pesos não configurados
--    (o caso de TODOS os KRs da empresa) zeravam o objetivo inteiro. O front
--    (objective-rollup.ts § weightedMean) já caía para média simples; o banco
--    agora espelha: soma 0 → média igualitária. Pesos definidos continuam
--    ponderando, e peso 0 no meio de pesos > 0 segue significando "não conta".
--
-- 2. KR binário era degrau (0% até bater a meta) — obrigava o dono a só
--    reportar "concluído ou não". Passa a dar crédito parcial proporcional
--    (current/target, teto 100), igual à lib do front (kr-progress.ts).
--    Compatível: 0 continua 0%, meta atingida continua 100%.
--
-- Aproveita para remover o trigger duplicado de check-in
-- (trg_process_okr_checkin E trigger_process_okr_checkin apontavam para a
-- mesma função — cada check-in atualizava o KR e recalculava a árvore 2×).
--
-- Backfill no final: recalcula progresso e auto_status de todos os objetivos
-- com KR. Risco: 🟡 Médio — recálculo em massa, mas determinístico e para a
-- própria correção; def anterior guardado no transcript da sessão.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_objective_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_objective_id uuid;
  v_new_progress integer;
  v_parent_id uuid;
  v_total_weight numeric;
BEGIN
  v_objective_id := COALESCE(NEW.objective_id, OLD.objective_id);
  SELECT INTO v_total_weight COALESCE(SUM(weight_percentage), 0)
  FROM public.key_results WHERE objective_id = v_objective_id AND deleted_at IS NULL;

  SELECT INTO v_new_progress COALESCE(
    CASE
      -- Pesos definidos: média ponderada (peso 0 = KR não conta, deliberado).
      WHEN v_total_weight > 0 THEN
        SUM(kr_pct * weight_percentage) / NULLIF(SUM(weight_percentage), 0)
      -- Ninguém configurou peso: todos os KRs contam igual (média simples) —
      -- mesmo fallback do front (objective-rollup.ts).
      ELSE AVG(kr_pct)
    END::integer, 0)
  FROM (
    SELECT
      weight_percentage,
      LEAST(100, GREATEST(0,
        CASE
          -- Binário com crédito parcial: proporcional à meta, 100 ao atingir.
          WHEN kr_type = 'binary' THEN
            CASE
              WHEN current_value >= target_value THEN 100
              WHEN NULLIF(target_value, 0) IS NULL THEN 0
              ELSE (current_value::numeric / target_value::numeric) * 100
            END
          WHEN direction = 'down' THEN
            CASE
              WHEN NULLIF(initial_value - target_value, 0) IS NULL THEN
                CASE WHEN current_value <= target_value THEN 100 ELSE 0 END
              ELSE ((initial_value - current_value)::numeric / (initial_value - target_value)::numeric) * 100
            END
          WHEN NULLIF(target_value - initial_value, 0) IS NULL THEN
            CASE WHEN current_value >= target_value THEN 100 ELSE 0 END
          ELSE ((current_value - initial_value)::numeric / (target_value - initial_value)::numeric) * 100
        END
      )) AS kr_pct
    FROM public.key_results
    WHERE objective_id = v_objective_id AND deleted_at IS NULL
  ) krs;

  UPDATE public.objectives SET progress = v_new_progress, updated_at = now() WHERE id = v_objective_id;

  SELECT parent_id INTO v_parent_id FROM public.objectives WHERE id = v_objective_id;
  IF v_parent_id IS NOT NULL THEN
    PERFORM public.cascade_objective_progress(v_parent_id);
  END IF;
  RETURN NEW;
END;
$function$;

-- Check-in processava 2× (dois triggers para a mesma função).
DROP TRIGGER IF EXISTS trigger_process_okr_checkin ON public.okr_checkins;

-- ---------------------------------------------------------------------------
-- Backfill: um toque por objetivo com KR dispara o recálculo (o trigger lê
-- todos os KRs do objetivo e cascateia para os pais); depois realinha o
-- auto_status, que só era recalculado em check-in.
-- ---------------------------------------------------------------------------
UPDATE public.key_results SET updated_at = now()
WHERE id IN (
  SELECT DISTINCT ON (objective_id) id
  FROM public.key_results
  WHERE deleted_at IS NULL
  ORDER BY objective_id, created_at
);

DO $$
DECLARE v_obj uuid;
BEGIN
  FOR v_obj IN
    SELECT DISTINCT objective_id FROM public.key_results WHERE deleted_at IS NULL
  LOOP
    PERFORM public.update_objective_auto_status(v_obj);
  END LOOP;
END $$;

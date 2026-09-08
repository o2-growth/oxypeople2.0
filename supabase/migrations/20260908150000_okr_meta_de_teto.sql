-- =============================================================================
-- OKR: meta de teto ("quanto menor, melhor") passa a ser calculada como teto
-- =============================================================================
-- Relatado pelo CEO em 04/09/2026, sobre três KRs: "CAC Modelo atual < R$ 12k"
-- com 10.704 aparecia em 89% — "quase lá" — quando na verdade estava DENTRO do
-- limite; e "CPMQL Franquia < R$ 100" com 115 aparecia 100% batido, estourado.
--
-- Causa: a fórmula de `direction = 'down'` é `(inicial - atual)/(inicial - meta)`
-- e pressupõe partida PIOR que a meta. Os 21 KRs "down" da empresa têm todos
-- `initial_value = 0`, e com partida 0 os dois sinais se cancelam:
--   (0 - atual) / (0 - meta) = atual / meta   ← a mesma conta de "aumentar".
-- A direção nunca teve efeito. Por isso o KR de teto se comportava como se a
-- meta fosse um alvo a alcançar, premiando chegar perto do limite e marcando
-- como batido quem passou dele.
--
-- "Diminuir" carregava dois conceitos:
--   REDUÇÃO — parte de 800 e cai para 500; mede o caminho andado.
--   TETO    — CAC < 12k; não tem partida, e ficar abaixo É a meta.
-- O sinal do span separa os dois sem coluna nova: partida acima da meta só faz
-- sentido como redução, partida igual ou abaixo só faz sentido como teto.
--
-- Espelha `src/lib/kr-progress.ts` (krMode/krProgressForValue/krIsMeasured) —
-- as duas implementações têm que mudar juntas.
--
-- Aproveita para remover dois dos TRÊS triggers idênticos que chamavam
-- update_objective_progress() na mesma tabela: cada gravação em key_results
-- recalculava a árvore 3×.
--
-- Risco: 🟡 Médio — o backfill recalcula o progresso de todos os objetivos com
-- KR e 16 dos 23 KRs de teto mudam de percentual (a maioria sobe para 100% por
-- estar dentro do limite; os estourados deixam de aparecer como batidos).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Progresso de UM KR — função pura, o espelho SQL de kr-progress.ts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kr_progress_pct(
  p_kr_type         text,
  p_direction       text,
  p_initial         numeric,
  p_target          numeric,
  p_current         numeric,
  p_last_checkin_at timestamptz
) RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    -- KR nunca medido vale 0 em qualquer modo: num teto, valor 0 quase sempre
    -- quer dizer "ninguém mediu ainda" (os 7 KRs de churn da empresa), e
    -- inflar para 100% tiraria a pressão do check-in.
    WHEN p_last_checkin_at IS NULL AND COALESCE(p_current, 0) = 0 THEN 0

    -- Binário: crédito parcial proporcional à meta, 100 ao atingir.
    WHEN p_kr_type = 'binary' THEN
      CASE
        WHEN p_current >= p_target THEN 100
        WHEN COALESCE(p_target, 0) = 0 THEN 0
        ELSE LEAST(100, GREATEST(0, ROUND(p_current / p_target * 100)))::integer
      END

    -- Redução com ponto de partida (inalterada).
    WHEN p_direction = 'down' AND p_initial > p_target THEN
      LEAST(100, GREATEST(0,
        ROUND((p_initial - p_current) / (p_initial - p_target) * 100)))::integer

    -- Teto: dentro do limite é meta batida; acima, cai proporcional ao estouro.
    -- O cap de 99 mantém "100% ⟺ meta batida" verdadeiro — sem ele um estouro
    -- de centavos arredondaria para 100 e acenderia o check de concluído.
    WHEN p_direction = 'down' THEN
      CASE
        WHEN p_current <= p_target THEN 100
        WHEN p_target <= 0 THEN 0
        ELSE LEAST(99, GREATEST(0, ROUND(p_target / p_current * 100)))::integer
      END

    -- Subida.
    WHEN p_target = p_initial THEN
      CASE WHEN p_current >= p_target THEN 100 ELSE 0 END
    ELSE
      LEAST(100, GREATEST(0,
        ROUND((p_current - p_initial) / (p_target - p_initial) * 100)))::integer
  END
$$;

COMMENT ON FUNCTION public.kr_progress_pct IS
  'Progresso 0-100 de um KR. Espelho SQL de src/lib/kr-progress.ts — mudar os dois juntos.';

-- -----------------------------------------------------------------------------
-- Rollup do objetivo: mesma regra de peso da 20260819, agora chamando a função
-- -----------------------------------------------------------------------------
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
      public.kr_progress_pct(
        kr_type, direction, initial_value, target_value, current_value, last_checkin_at
      ) AS kr_pct
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

-- -----------------------------------------------------------------------------
-- Três triggers idênticos para a mesma função: cada gravação recalculava 3×
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_objective_progress ON public.key_results;
DROP TRIGGER IF EXISTS update_objective_progress ON public.key_results;
-- Fica trg_update_objective_progress (AFTER INSERT OR UPDATE OR DELETE).

-- -----------------------------------------------------------------------------
-- Quatro KRs com a direção trocada — por id, não por padrão no título
-- -----------------------------------------------------------------------------
-- Metas de teto marcadas como "aumentar": apareciam 100% batidas estouradas.
UPDATE public.key_results SET direction = 'down'
WHERE id IN (
  '78a648ed-f592-4fd9-9a87-a87bf719dedc',  -- CAC Franquia/OxyHacker < R$
  '0d0b54a0-229c-4a29-8d05-f0e43cf49cc7'   -- CPMQL Franquia/OxyHacker < R$ 100
);

-- O inverso: o valor mede QUANTO JÁ SE REDUZIU (check-in: "redução já efetuada",
-- 15 de 30), então maior é melhor. Estavam como "diminuir" por causa do verbo no
-- título e, pela regra do span, virariam teto e mostrariam 100% sem terem
-- chegado à meta.
UPDATE public.key_results SET direction = 'up'
WHERE id IN (
  '1f891ef2-bdd6-43bb-861e-58c33be57cdc',  -- Reduzir o tempo médio de exportação em até 30%
  'b9db0a66-3c90-4161-bfba-c5b33de0f60e'   -- Reduzir o tempo médio de importação na Oxy em 50%
);

-- -----------------------------------------------------------------------------
-- Backfill: um toque por objetivo com KR dispara o recálculo (o trigger lê
-- todos os KRs do objetivo e cascateia para os pais); depois realinha o
-- auto_status, que só é recalculado em check-in.
-- -----------------------------------------------------------------------------
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

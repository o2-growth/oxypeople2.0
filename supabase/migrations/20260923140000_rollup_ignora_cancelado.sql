-- =============================================================================
-- Rollup de objetivo ignora filho CANCELADO
-- =============================================================================
-- Sintoma: um OKR arquivado (status canceled) continuava puxando a média do pai
-- para baixo. "OKR Operações — Q3/2026" mostrava 47% quando a média dos filhos
-- que ainda estão de pé é 52% — a diferença é um filho encerrado em 0%.
--
-- cascade_objective_progress filtrava `deleted_at IS NULL` mas nada sobre
-- status. Excluído e cancelado são coisas diferentes: excluir é apagar, e
-- cancelar é encerrar o trabalho. Nos dois casos o filho deixa de ser uma
-- entrega esperada, então nenhum dos dois deve entrar na média.
--
-- CONCLUÍDO continua contando, e deve mesmo: foi entregue.
--
-- Espelha `src/lib/objective-rollup.ts`, que passa a filtrar igual — as duas
-- implementações precisam mudar juntas.
--
-- Risco: 🟡 Médio — recalcula o progresso de todo objetivo que tem filho
-- cancelado. Hoje é 1; o número sobe conforme os times arquivarem OKR.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cascade_objective_progress(p_objective_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_new_progress integer;
  v_parent_id uuid;
  v_has_relations boolean;
  v_has_children boolean;
  v_total_weight numeric;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.objective_relations WHERE parent_objective_id = p_objective_id) INTO v_has_relations;

  IF v_has_relations THEN
    SELECT INTO v_total_weight COALESCE(SUM(weight_percentage), 0)
    FROM public.objective_relations r
    JOIN public.objectives o ON o.id = r.child_objective_id
    WHERE r.parent_objective_id = p_objective_id
      AND o.deleted_at IS NULL AND o.status <> 'canceled';

    IF v_total_weight > 0 THEN
      SELECT INTO v_new_progress COALESCE(
        (SUM(o.progress * r.weight_percentage) / NULLIF(SUM(r.weight_percentage), 0))::integer, 0
      ) FROM public.objective_relations r
      JOIN public.objectives o ON o.id = r.child_objective_id
      WHERE r.parent_objective_id = p_objective_id
        AND o.deleted_at IS NULL AND o.status <> 'canceled';
    ELSE
      SELECT INTO v_new_progress COALESCE(AVG(o.progress)::integer, 0)
      FROM public.objective_relations r
      JOIN public.objectives o ON o.id = r.child_objective_id
      WHERE r.parent_objective_id = p_objective_id
        AND o.deleted_at IS NULL AND o.status <> 'canceled';
    END IF;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM public.objectives
       WHERE parent_id = p_objective_id AND deleted_at IS NULL AND status <> 'canceled'
    ) INTO v_has_children;

    IF v_has_children THEN
      SELECT INTO v_new_progress COALESCE(AVG(progress)::integer, 0)
      FROM public.objectives
      WHERE parent_id = p_objective_id AND deleted_at IS NULL AND status <> 'canceled';
    ELSE
      -- Sem nenhum filho de pé, o progresso do pai fica como está: zerar aqui
      -- apagaria o histórico de um objetivo cujos filhos foram todos encerrados.
      RETURN;
    END IF;
  END IF;

  UPDATE public.objectives SET progress = v_new_progress, updated_at = now() WHERE id = p_objective_id;

  SELECT parent_id INTO v_parent_id FROM public.objectives WHERE id = p_objective_id;
  IF v_parent_id IS NOT NULL THEN
    PERFORM public.cascade_objective_progress(v_parent_id);
  END IF;
END;
$function$;

-- Recalcula quem tem filho cancelado (e, por cascata, os pais acima).
DO $$
DECLARE v_pai uuid;
BEGIN
  FOR v_pai IN
    SELECT DISTINCT f.parent_id
      FROM public.objectives f
     WHERE f.parent_id IS NOT NULL
       AND f.deleted_at IS NULL
       AND f.status = 'canceled'
  LOOP
    PERFORM public.cascade_objective_progress(v_pai);
  END LOOP;
END $$;

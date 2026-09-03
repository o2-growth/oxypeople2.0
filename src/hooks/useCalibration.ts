import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { toast } from "sonner";

/**
 * Calibragem: cruzar, atitude por atitude, a nota que a pessoa se deu com a
 * nota que o líder deu, e fechar uma nota calibrada.
 *
 * A média é derivada na leitura, nunca gravada: ela é função das duas notas e
 * gravá-la criaria uma terceira verdade para manter em sincronia. O que se
 * grava é só a decisão do gestor — a coluna Calibragem.
 */

/** Valores aceitos na calibragem (decisão de 03/09/2026). */
export const CALIBRATION_SCALE = [1, 1.5, 2, 2.5, 3] as const;

export interface CalibrationTarget {
  evaluatedId: string;
  fullName: string;
  avatarUrl: string | null;
  /** Quem fez a avaliação de líder — o admin vê gente avaliada por outros. */
  evaluatorName: string | null;
  /** Quantas atitudes já têm nota calibrada. */
  calibradas: number;
}

export interface CalibrationRow {
  questionId: string;
  label: string;
  orderIndex: number;
  selfScore: number | null;
  leaderScore: number | null;
  /** Média entre auto e líder — null quando falta uma das duas. */
  media: number | null;
  calibrado: number | null;
}

/** Pessoas que o usuário avaliou no ciclo e pode calibrar. */
export function useCalibrationTargets(cycleId: string | null) {
  const { user } = useAuth();
  const { isAdmin } = useUserPermissions();

  return useQuery({
    queryKey: ["calibration-targets", cycleId, user?.id, isAdmin],
    enabled: !!cycleId && !!user?.id,
    queryFn: async (): Promise<CalibrationTarget[]> => {
      if (!cycleId || !user?.id) return [];

      // 'manager' é a avaliação que o líder faz sobre o liderado. 'self' é a
      // autoavaliação e 'subordinate' é o liderado avaliando o líder — nenhuma
      // das duas define quem entra nesta lista.
      let q = supabase
        .from("performance_evaluations")
        .select(
          `evaluated_id, status,
           evaluated:users!performance_evaluations_evaluated_id_fkey(id, full_name, avatar_url),
           evaluator:users!performance_evaluations_evaluator_id_fkey(id, full_name)`,
        )
        .eq("cycle_id", cycleId)
        .eq("relationship", "manager")
        .eq("status", "completed");

      // Admin conduz o ciclo e vê todos; o gestor vê quem ele avaliou.
      if (!isAdmin) q = q.eq("evaluator_id", user.id);

      const { data, error } = await q;
      if (error) throw error;

      const { data: calibradas } = await supabase
        .from("performance_calibrations")
        .select("evaluated_id")
        .eq("cycle_id", cycleId);

      const porPessoa = new Map<string, number>();
      for (const c of calibradas ?? []) {
        porPessoa.set(c.evaluated_id, (porPessoa.get(c.evaluated_id) ?? 0) + 1);
      }

      const linhas = (data ?? []) as unknown as Array<{
        evaluated_id: string;
        evaluated: { id: string; full_name: string | null; avatar_url: string | null } | null;
        evaluator: { id: string; full_name: string | null } | null;
      }>;

      return linhas
        .filter((l) => l.evaluated)
        .map((l) => ({
          evaluatedId: l.evaluated_id,
          fullName: l.evaluated?.full_name ?? "Sem nome",
          avatarUrl: l.evaluated?.avatar_url ?? null,
          evaluatorName: l.evaluator?.full_name ?? null,
          calibradas: porPessoa.get(l.evaluated_id) ?? 0,
        }))
        .sort((a, b) =>
          a.fullName.localeCompare(b.fullName, "pt-BR", { sensitivity: "base" }),
        );
    },
  });
}

/** As 12 atitudes de uma pessoa, com auto, líder, média e calibragem. */
export function useCalibrationDetail(cycleId: string | null, evaluatedId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["calibration-detail", cycleId, evaluatedId],
    enabled: !!cycleId && !!evaluatedId && !!user?.id,
    queryFn: async (): Promise<CalibrationRow[]> => {
      if (!cycleId || !evaluatedId) return [];

      const { data: questions, error: erroQ } = await supabase
        .from("performance_questions")
        .select("id, question_text, order_index")
        .eq("cycle_id", cycleId)
        .order("order_index");
      if (erroQ) throw erroQ;

      // As duas avaliações da pessoa neste ciclo: a dela sobre si e a do líder
      // sobre ela. A RLS decide se a autoavaliação vem — quem ainda não fechou
      // a própria avaliação sobre essa pessoa não a recebe.
      const { data: evals, error: erroE } = await supabase
        .from("performance_evaluations")
        .select("id, relationship, evaluator_id")
        .eq("cycle_id", cycleId)
        .eq("evaluated_id", evaluatedId)
        .in("relationship", ["self", "manager"]);
      if (erroE) throw erroE;

      const selfEval = (evals ?? []).find((e) => e.relationship === "self");
      const leaderEval = (evals ?? []).find((e) => e.relationship === "manager");

      const idsAvaliacao = [selfEval?.id, leaderEval?.id].filter(Boolean) as string[];
      const { data: answers } = idsAvaliacao.length
        ? await supabase
            .from("performance_answers")
            .select("evaluation_id, question_id, score")
            .in("evaluation_id", idsAvaliacao)
        : { data: [] };

      const { data: calibs } = await supabase
        .from("performance_calibrations")
        .select("question_id, score")
        .eq("cycle_id", cycleId)
        .eq("evaluated_id", evaluatedId);

      const notaSelf = new Map<string, number>();
      const notaLider = new Map<string, number>();
      for (const a of answers ?? []) {
        if (a.score === null) continue;
        if (a.evaluation_id === selfEval?.id) notaSelf.set(a.question_id, Number(a.score));
        if (a.evaluation_id === leaderEval?.id) notaLider.set(a.question_id, Number(a.score));
      }
      const notaCalib = new Map<string, number>(
        (calibs ?? []).map((c) => [c.question_id, Number(c.score)]),
      );

      return (questions ?? []).map((q) => {
        const self = notaSelf.get(q.id) ?? null;
        const lider = notaLider.get(q.id) ?? null;
        return {
          questionId: q.id,
          label: q.question_text,
          orderIndex: q.order_index,
          selfScore: self,
          leaderScore: lider,
          // Sem as duas notas não há média: mostrar a única nota existente como
          // "média" faria a autoavaliação passar por consenso.
          media: self !== null && lider !== null ? (self + lider) / 2 : null,
          calibrado: notaCalib.get(q.id) ?? null,
        };
      });
    },
  });
}

export function useSaveCalibration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useUser();

  return useMutation({
    mutationFn: async ({
      cycleId,
      evaluatedId,
      questionId,
      score,
    }: {
      cycleId: string;
      evaluatedId: string;
      questionId: string;
      score: number;
    }) => {
      const companyId = profile?.primary_company_id;
      if (!companyId || !user?.id) throw new Error("Sessão não identificada");

      const { error } = await supabase.from("performance_calibrations").upsert(
        {
          company_id: companyId,
          cycle_id: cycleId,
          evaluated_id: evaluatedId,
          question_id: questionId,
          score,
          calibrated_by: user.id,
        },
        { onConflict: "cycle_id,evaluated_id,question_id" },
      );
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ["calibration-detail", vars.cycleId, vars.evaluatedId],
      });
      queryClient.invalidateQueries({ queryKey: ["calibration-targets"] });
    },
    onError: (e: unknown) => {
      toast.error(`Erro ao salvar calibragem: ${(e as Error).message}`);
    },
  });
}

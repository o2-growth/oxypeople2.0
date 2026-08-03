import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";

export interface PositionChange {
  id: string;
  changed_at: string;
  position: string | null;
  department_name: string | null;
  manager_name: string | null;
  reason: string | null;
  notes: string | null;
  source: string;
}

/**
 * Movimentações de cargo e saída da pessoa.
 *
 * A tabela é alimentada pela sync do Pipefy e pela importação do Feedz — nunca
 * teve leitura no app, então os 111 registros históricos estavam invisíveis.
 */
export function usePositionHistory(userId: string | null | undefined) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["position-history", companyId, userId],
    queryFn: async (): Promise<PositionChange[]> => {
      if (!companyId || !userId) return [];

      const { data, error } = await supabase
        .from("position_history")
        .select("id,changed_at,position,department_name,manager_name,reason,notes,source")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PositionChange[];
    },
    enabled: !!companyId && !!userId,
  });
}

export interface PersonEvaluation {
  id: string;
  overall_score: number | null;
  status: string;
  completed_at: string | null;
  due_date: string;
  source: string;
  cycle: { name: string; start_date: string; end_date: string } | null;
}

/** Avaliações de desempenho da pessoa, com o ciclo a que pertencem. */
export function usePersonEvaluations(userId: string | null | undefined) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["person-evaluations", companyId, userId],
    queryFn: async (): Promise<PersonEvaluation[]> => {
      if (!companyId || !userId) return [];

      const { data, error } = await supabase
        .from("performance_evaluations")
        .select(
          "id,overall_score,status,completed_at,due_date,source,cycle:performance_cycles(name,start_date,end_date)",
        )
        .eq("company_id", companyId)
        .eq("evaluated_id", userId)
        .order("due_date", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PersonEvaluation[];
    },
    enabled: !!companyId && !!userId,
  });
}

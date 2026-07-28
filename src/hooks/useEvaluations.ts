import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { toastDbError } from "@/lib/db-errors";

export type EvaluationStatus = "pending" | "in_progress" | "completed" | "expired";

export interface PerformanceEvaluation {
  id: string;
  cycle_id: string;
  company_id: string;
  evaluator_id: string;
  evaluated_id: string;
  relationship: string;
  status: EvaluationStatus;
  due_date: string;
  completed_at: string | null;
  overall_score: number | null;
  created_at: string;
  updated_at: string;
  cycle?: {
    id: string;
    name: string;
    type: string;
  };
  evaluator?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  evaluated?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CreateEvaluationInput {
  cycle_id: string;
  evaluator_id: string;
  evaluated_id: string;
  relationship: string;
  due_date: string;
}

export function useEvaluations(cycleId?: string) {
  const { user } = useAuth();
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const companyId = profile?.primary_company_id;

  // Avaliações do admin (todas do ciclo ou empresa)
  const { data: allEvaluations, isLoading: isLoadingAll, isError: isErrorAll, refetch: refetchAll } = useQuery({
    queryKey: ["evaluations", "all", companyId, cycleId],
    queryFn: async () => {
      if (!companyId) return [];
      
      let query = supabase
        .from("performance_evaluations")
        .select(`
          *,
          cycle:performance_cycles(id, name, type),
          evaluator:users!performance_evaluations_evaluator_id_fkey(id, full_name, avatar_url),
          evaluated:users!performance_evaluations_evaluated_id_fkey(id, full_name, avatar_url)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (cycleId) {
        query = query.eq("cycle_id", cycleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PerformanceEvaluation[];
    },
    enabled: !!companyId,
  });

  // Avaliações do usuário atual (pendentes e histórico)
  const { data: myEvaluations, isLoading: isLoadingMy, isError: isErrorMy, refetch: refetchMy } = useQuery({
    queryKey: ["evaluations", "my", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("performance_evaluations")
        .select(`
          *,
          cycle:performance_cycles(id, name, type),
          evaluator:users!performance_evaluations_evaluator_id_fkey(id, full_name, avatar_url),
          evaluated:users!performance_evaluations_evaluated_id_fkey(id, full_name, avatar_url)
        `)
        .or(`evaluator_id.eq.${user.id},evaluated_id.eq.${user.id}`)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as PerformanceEvaluation[];
    },
    enabled: !!user?.id,
  });

  const createEvaluation = useMutation({
    mutationFn: async (input: CreateEvaluationInput) => {
      if (!companyId) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("performance_evaluations")
        .insert({
          ...input,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast.success("Avaliação criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating evaluation:", error);
      toastDbError(error, "Erro ao criar avaliação");
    },
  });

  const updateEvaluation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerformanceEvaluation> & { id: string }) => {
      const { data, error } = await supabase
        .from("performance_evaluations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      toast.success("Avaliação atualizada!");
    },
    onError: (error) => {
      console.error("Error updating evaluation:", error);
      toastDbError(error, "Erro ao atualizar avaliação");
    },
  });

  const pendingEvaluations = myEvaluations?.filter(
    (e) => e.evaluator_id === user?.id && e.status !== "completed" && e.status !== "expired"
  ) || [];

  const completedEvaluations = myEvaluations?.filter(
    (e) => e.status === "completed"
  ) || [];

  return {
    allEvaluations: allEvaluations || [],
    myEvaluations: myEvaluations || [],
    pendingEvaluations,
    completedEvaluations,
    isLoading: isLoadingAll || isLoadingMy,
    isError: isErrorAll || isErrorMy,
    refetch: () => {
      refetchAll();
      refetchMy();
    },
    createEvaluation,
    updateEvaluation,
  };
}

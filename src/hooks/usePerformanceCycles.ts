import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

export type PerformanceCycleType = "full" | "pocket" | "self" | "180" | "360" | "leader" | "custom";
export type PerformanceCycleStatus = "draft" | "scheduled" | "active" | "completed" | "cancelled";

export interface PerformanceCycle {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  type: PerformanceCycleType;
  start_date: string;
  end_date: string;
  /** Até quando dá para responder. Nulo = cobra pelo `end_date`. */
  response_deadline: string | null;
  status: PerformanceCycleStatus;
  created_by: string;
  target_departments: string[];
  target_teams: string[];
  target_users: string[];
  target_all: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCycleInput {
  name: string;
  description?: string;
  type: PerformanceCycleType;
  start_date: string;
  end_date: string;
  response_deadline?: string | null;
  target_departments?: string[];
  target_teams?: string[];
  target_users?: string[];
  target_all?: boolean;
}

export function usePerformanceCycles() {
  const { user } = useAuth();
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const companyId = profile?.primary_company_id;

  const { data: cycles, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["performance-cycles", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("performance_cycles")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PerformanceCycle[];
    },
    enabled: !!companyId,
  });

  const createCycle = useMutation({
    mutationFn: async (input: CreateCycleInput) => {
      if (!companyId || !user?.id) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase
        .from("performance_cycles")
        .insert({
          ...input,
          company_id: companyId,
          created_by: user.id,
          target_departments: input.target_departments || [],
          target_teams: input.target_teams || [],
          target_users: input.target_users || [],
          target_all: input.target_all || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      toast.success("Ciclo de avaliação criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating cycle:", error);
      toast.error("Erro ao criar ciclo de avaliação");
    },
  });

  const updateCycle = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PerformanceCycle> & { id: string }) => {
      const { data, error } = await supabase
        .from("performance_cycles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      toast.success("Ciclo atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating cycle:", error);
      toast.error("Erro ao atualizar ciclo");
    },
  });

  /**
   * Inicia o ciclo.
   *
   * Não é um simples update de status: a edge function gera as avaliações de
   * cada participante e avisa todo mundo por notificação, e-mail e Slack. Ela
   * só marca o ciclo como ativo depois disso — se falhar no meio, o ciclo
   * continua em rascunho e pode ser reiniciado, em vez de abrir vazio.
   */
  const startCycle = useMutation({
    mutationFn: async (cycleId: string) => {
      const { data, error } = await supabase.functions.invoke("performance-cycle-start", {
        body: { cycleId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha ao iniciar o ciclo");
      return data as {
        participantes: number;
        avaliacoesCriadas: number;
        notificacoes: number;
        emails: number;
        slackDMs: number;
      };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(
        `Ciclo iniciado: ${r.avaliacoesCriadas} avaliações criadas`,
        { description: `${r.notificacoes} notificações · ${r.emails} e-mails · ${r.slackDMs} DMs no Slack` },
      );
    },
    onError: (error: Error) => {
      console.error("Error starting cycle:", error);
      toast.error("Erro ao iniciar o ciclo", { description: error.message });
    },
  });

  const deleteCycle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("performance_cycles")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performance-cycles"] });
      toast.success("Ciclo excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting cycle:", error);
      toast.error("Erro ao excluir ciclo");
    },
  });

  return {
    cycles: cycles || [],
    isLoading,
    isError,
    error,
    refetch,
    createCycle,
    updateCycle,
    startCycle,
    deleteCycle,
  };
}

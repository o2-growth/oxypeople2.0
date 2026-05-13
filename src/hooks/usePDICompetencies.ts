import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CompetencyCategory = "technical" | "leadership" | "behavioral" | "other";

export interface PDICompetency {
  id: string;
  pdi_plan_id: string;
  name: string;
  description: string | null;
  current_level: number;
  target_level: number;
  category: CompetencyCategory | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CompetencyInput {
  name: string;
  description?: string | null;
  category?: CompetencyCategory | null;
  current_level: number;
  target_level: number;
}

const key = (planId: string) => ["pdi-competencies", planId];

export function usePDICompetencies(planId: string) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: key(planId),
    queryFn: async (): Promise<PDICompetency[]> => {
      const { data, error } = await supabase
        .from("pdi_competencies")
        .select("*")
        .eq("pdi_plan_id", planId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PDICompetency[];
    },
    enabled: !!planId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key(planId) });

  const add = useMutation({
    mutationFn: async (input: CompetencyInput) => {
      const current = queryClient.getQueryData<PDICompetency[]>(key(planId)) ?? [];
      const maxIndex = current.reduce((m, c) => Math.max(m, c.order_index), -1);
      const { data, error } = await supabase
        .from("pdi_competencies")
        .insert({
          pdi_plan_id: planId,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          current_level: input.current_level,
          target_level: input.target_level,
          order_index: maxIndex + 1,
        })
        .select()
        .single();
      if (error) {
        if (error.message.includes("pdi_competency_target_gte_current")) {
          throw new Error("Nível alvo precisa ser maior ou igual ao atual");
        }
        throw error;
      }
      return data as PDICompetency;
    },
    onSuccess: () => {
      toast.success("Competência adicionada.");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao adicionar competência.");
    },
  });

  const edit = useMutation({
    mutationFn: async ({ id, ...input }: CompetencyInput & { id: string }) => {
      const { error } = await supabase
        .from("pdi_competencies")
        .update({
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          current_level: input.current_level,
          target_level: input.target_level,
        })
        .eq("id", id);
      if (error) {
        if (error.message.includes("pdi_competency_target_gte_current")) {
          throw new Error("Nível alvo precisa ser maior ou igual ao atual");
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Competência atualizada.");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao editar competência.");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pdi_competencies").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key(planId) });
      const prev = queryClient.getQueryData<PDICompetency[]>(key(planId)) ?? [];
      queryClient.setQueryData<PDICompetency[]>(key(planId), prev.filter((c) => c.id !== id));
      return { prev };
    },
    onError: (err: Error, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(planId), ctx.prev);
      toast.error(err.message ?? "Erro ao remover competência.");
    },
    onSuccess: () => {
      toast.success("Competência removida.");
      invalidate();
    },
  });

  return { list, add, edit, remove };
}

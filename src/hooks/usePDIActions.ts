import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

export type ActionStatus = "todo" | "doing" | "done" | "blocked";

export interface PDIAction {
  id: string;
  pdi_plan_id: string;
  competency_id: string | null;
  feedback_request_id: string | null;
  title: string;
  description: string | null;
  status: ActionStatus;
  due_date: string | null;
  completed_at: string | null;
  evidence_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ActionInput {
  title: string;
  description?: string | null;
  competency_id?: string | null;
  due_date?: string | null;
  status: ActionStatus;
}

const key = (planId: string) => ["pdi-actions", planId];

export function usePDIActions(planId: string) {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: key(planId),
    queryFn: async (): Promise<PDIAction[]> => {
      const { data, error } = await supabase
        .from("pdi_actions")
        .select("*")
        .eq("pdi_plan_id", planId)
        .order("order_index", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as PDIAction[];
    },
    enabled: !!planId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key(planId) });

  const add = useMutation({
    mutationFn: async (input: ActionInput) => {
      const current = queryClient.getQueryData<PDIAction[]>(key(planId)) ?? [];
      const maxIndex = current.reduce((m, a) => Math.max(m, a.order_index), -1);
      const { data, error } = await supabase
        .from("pdi_actions")
        .insert({
          pdi_plan_id: planId,
          title: input.title,
          description: input.description ?? null,
          competency_id: input.competency_id ?? null,
          due_date: input.due_date ?? null,
          status: input.status,
          order_index: maxIndex + 1,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PDIAction;
    },
    onSuccess: (action) => {
      trackEvent("pdi_action_created", {
        has_due_date: !!action.due_date,
        has_competency: !!action.competency_id,
      });
      toast.success("Ação adicionada.");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao adicionar ação.");
    },
  });

  const edit = useMutation({
    mutationFn: async ({ id, ...input }: ActionInput & { id: string }) => {
      const { error } = await supabase
        .from("pdi_actions")
        .update({
          title: input.title,
          description: input.description ?? null,
          competency_id: input.competency_id ?? null,
          due_date: input.due_date ?? null,
          status: input.status,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ação atualizada.");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao editar ação.");
    },
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, from, to }: { id: string; from: ActionStatus; to: ActionStatus }) => {
      const updates: Record<string, unknown> = { status: to };
      if (to === "done") updates.completed_at = new Date().toISOString();
      if (from === "done" && to !== "done") updates.completed_at = null;
      const { error } = await supabase.from("pdi_actions").update(updates).eq("id", id);
      if (error) throw error;
      return { from, to };
    },
    onMutate: async ({ id, to }) => {
      await queryClient.cancelQueries({ queryKey: key(planId) });
      const prev = queryClient.getQueryData<PDIAction[]>(key(planId)) ?? [];
      queryClient.setQueryData<PDIAction[]>(
        key(planId),
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: to,
                completed_at: to === "done" ? new Date().toISOString() : null,
              }
            : a,
        ),
      );
      return { prev };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(planId), ctx.prev);
      toast.error(err.message ?? "Erro ao mover ação.");
    },
    onSuccess: ({ from, to }) => {
      trackEvent("pdi_action_status_changed", { from, to });
      if (to === "done") trackEvent("pdi_action_completed");
      invalidate();
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pdi_actions").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: key(planId) });
      const prev = queryClient.getQueryData<PDIAction[]>(key(planId)) ?? [];
      queryClient.setQueryData<PDIAction[]>(key(planId), prev.filter((a) => a.id !== id));
      return { prev };
    },
    onError: (err: Error, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key(planId), ctx.prev);
      toast.error(err.message ?? "Erro ao remover ação.");
    },
    onSuccess: () => {
      toast.success("Ação removida.");
      invalidate();
    },
  });

  return { list, add, edit, changeStatus, remove };
}

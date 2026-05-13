import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import type { OneOnOneFormValues } from "@/lib/validation/oneOnOneSchema";

export interface OneOnOneRow {
  id: string;
  company_id: string;
  leader_id: string;
  member_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  status: "scheduled" | "completed" | "canceled" | "no_show";
  recurrence: "none" | "weekly" | "biweekly" | "monthly";
  recurrence_parent_id: string | null;
  completed_at: string | null;
  canceled_reason: string | null;
  created_at: string;
  updated_at: string;
  leader: { id: string; full_name: string | null; avatar_url: string | null } | null;
  member: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

const KEY = "one-on-ones";

export function useOneOnOnes() {
  const { user } = useAuth();
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const companyId = profile?.primary_company_id;

  const list = useQuery({
    queryKey: [KEY, userId],
    queryFn: async (): Promise<OneOnOneRow[]> => {
      if (!userId || !companyId) return [];

      const { data, error } = await supabase
        .from("one_on_ones")
        .select(`
          id, company_id, leader_id, member_id, scheduled_at, duration_minutes,
          location, status, recurrence, recurrence_parent_id, completed_at,
          canceled_reason, created_at, updated_at,
          leader:users!one_on_ones_leader_id_fkey(id, full_name, avatar_url),
          member:users!one_on_ones_member_id_fkey(id, full_name, avatar_url)
        `)
        .eq("company_id", companyId)
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as OneOnOneRow[];
    },
    enabled: !!userId && !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [KEY] });

  const create = useMutation({
    mutationFn: async (values: OneOnOneFormValues) => {
      if (!userId || !companyId) throw new Error("Usuário não autenticado.");

      const leader_id = values.i_am_member ? values.counterpart_id : userId;
      const member_id = values.i_am_member ? userId : values.counterpart_id;

      const { data, error } = await supabase
        .from("one_on_ones")
        .insert({
          company_id: companyId,
          leader_id,
          member_id,
          scheduled_at: new Date(values.scheduled_at).toISOString(),
          duration_minutes: values.duration_minutes,
          location: values.location || null,
          recurrence: values.recurrence,
          status: "scheduled",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, values) => {
      const role = values.i_am_member ? "member" : "leader";
      trackEvent("one_on_one_scheduled", {
        recurrence: values.recurrence,
        duration_minutes: values.duration_minutes,
        role,
      });
      toast.success("1:1 agendada com sucesso!");
      invalidate();
    },
    onError: (err: Error) => {
      if (err.message.includes("one_on_one_distinct_users")) {
        toast.error("Selecione outra pessoa — você não pode ter 1:1 consigo mesmo.");
      } else if (err.message.includes("is_company_member")) {
        toast.error("Usuário não pertence à sua empresa.");
      } else {
        toast.error(err.message ?? "Erro ao agendar 1:1.");
      }
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      scheduled_at,
      duration_minutes,
      location,
    }: {
      id: string;
      scheduled_at: string;
      duration_minutes: number;
      location?: string;
    }) => {
      const { error } = await supabase
        .from("one_on_ones")
        .update({
          scheduled_at: new Date(scheduled_at).toISOString(),
          duration_minutes,
          location: location || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("1:1 atualizada.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao atualizar 1:1."),
  });

  const cancel = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from("one_on_ones")
        .update({ status: "canceled", canceled_reason: reason || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("one_on_one_canceled");
      toast.success("1:1 cancelada.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao cancelar 1:1."),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("one_on_ones")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("one_on_one_completed");
      toast.success("1:1 concluída.");
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message ?? "Erro ao concluir 1:1."),
  });

  return { list, create, update, cancel, complete };
}

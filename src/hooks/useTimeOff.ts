import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import {
  type AlertSettings,
  DEFAULT_ALERT_SETTINGS,
  type AlertMode,
} from "@/lib/timeOff/alerts";

export type TimeOffStatus =
  | "agendada"
  | "em_andamento"
  | "realizada"
  | "arquivada"
  | "cancelada";

export interface TimeOffRecord {
  id: string;
  company_id: string;
  membership_id: string | null;
  person_name: string;
  start_date: string;
  end_date: string;
  days: number;
  type: string;
  status: TimeOffStatus;
  source: "pipefy" | "manual";
  pipefy_card_id: string | null;
  manager_name: string | null;
  substitute_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeOffInput {
  membership_id: string | null;
  person_name: string;
  start_date: string;
  end_date: string;
  days: number;
  status: TimeOffStatus;
  manager_name?: string | null;
  substitute_name?: string | null;
  notes?: string | null;
}

const listKey = (companyId?: string) => ["time-off", companyId];
const settingsKey = (companyId?: string) => ["time-off-settings", companyId];

export function useTimeOffList() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: listKey(companyId),
    enabled: !!companyId,
    queryFn: async (): Promise<TimeOffRecord[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("time_off")
        .select("*")
        .eq("company_id", companyId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TimeOffRecord[];
    },
  });
}

export function useTimeOffSettings() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: settingsKey(companyId),
    enabled: !!companyId,
    queryFn: async (): Promise<AlertSettings> => {
      if (!companyId) return DEFAULT_ALERT_SETTINGS;
      const { data, error } = await supabase
        .from("time_off_settings")
        .select("alert_mode, overdue_months, soon_months")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_ALERT_SETTINGS;
      return {
        alert_mode: data.alert_mode as AlertMode,
        overdue_months: data.overdue_months,
        soon_months: data.soon_months,
      };
    },
  });
}

export function useTimeOffMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey(companyId) });
  };

  const create = useMutation({
    mutationFn: async (input: CreateTimeOffInput) => {
      if (!companyId) throw new Error("Empresa não identificada");
      const { error } = await supabase.from("time_off").insert({
        company_id: companyId,
        membership_id: input.membership_id,
        person_name: input.person_name,
        start_date: input.start_date,
        end_date: input.end_date,
        days: input.days,
        status: input.status,
        source: "manual",
        manager_name: input.manager_name ?? null,
        substitute_name: input.substitute_name ?? null,
        notes: input.notes ?? null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("time_off_created_manual");
      toast.success("Registro de ausência criado.");
      invalidate();
    },
    onError: (e: unknown) => {
      toast.error(`Erro ao criar registro: ${(e as Error).message}`);
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CreateTimeOffInput> & { id: string }) => {
      const { error } = await supabase.from("time_off").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro atualizado.");
      invalidate();
    },
    onError: (e: unknown) => {
      toast.error(`Erro ao atualizar: ${(e as Error).message}`);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("time_off").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido.");
      invalidate();
    },
    onError: (e: unknown) => {
      toast.error(`Erro ao remover: ${(e as Error).message}`);
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (settings: AlertSettings) => {
      if (!companyId) throw new Error("Empresa não identificada");
      const { error } = await supabase
        .from("time_off_settings")
        .upsert({ company_id: companyId, ...settings }, { onConflict: "company_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuração de alertas salva.");
      queryClient.invalidateQueries({ queryKey: settingsKey(companyId) });
    },
    onError: (e: unknown) => {
      toast.error(`Erro ao salvar configuração: ${(e as Error).message}`);
    },
  });

  const syncPipefy = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      const { data, error } = await supabase.functions.invoke("pipefy-timeoff-sync", {
        body: { companyId },
      });
      if (error) throw error;
      return data as { total: number; matched: number; unmatched: string[] };
    },
    onSuccess: (data) => {
      trackEvent("time_off_synced_pipefy", { total: data.total });
      toast.success(`Sincronizado: ${data.total} registros (${data.matched} vinculados).`);
      invalidate();
    },
    onError: (e: unknown) => {
      toast.error(`Erro na sincronização: ${(e as Error).message}`);
    },
  });

  return { create, update, remove, saveSettings, syncPipefy };
}

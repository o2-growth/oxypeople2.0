import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import { useAuth } from "@/contexts/AuthContext";
import { toastDbError } from "@/lib/db-errors";

export interface CompanyEvent {
  id: string;
  company_id: string;
  created_by: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
  event_type: string;
  color: string;
  is_recurring: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type CreateEventInput = {
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  location?: string;
  event_type: string;
  color?: string;
};

/**
 * Data da próxima ocorrência de um evento recorrente (aniversário): mantém
 * dia e mês, e joga para o ano seguinte se a data já passou neste ano.
 */
export function nextOccurrence(eventDate: string, today = new Date()): string {
  const d = new Date(`${eventDate.slice(0, 10)}T00:00:00Z`);
  if (isNaN(d.getTime())) return eventDate;

  const mesDia = eventDate.slice(5, 10);
  const hojeMesDia = today.toISOString().slice(5, 10);
  const ano = today.getUTCFullYear() + (mesDia < hojeMesDia ? 1 : 0);
  return `${ano}-${mesDia}`;
}

/**
 * Eventos da empresa.
 *
 * Recorrentes (aniversários) nunca são filtrados por data: o que vale é
 * dia/mês, e a data guardada é só a âncora. Filtrar por `event_date >= hoje`
 * fazia sumir todo aniversário já ocorrido no ano corrente.
 *
 * Não-recorrentes (celebrações, datas pontuais) seguem futuros por padrão —
 * `includePast` traz o histórico, que é o caso das 130 celebrações importadas
 * do Feedz, todas com data passada.
 */
export function useCompanyEvents(options: { includePast?: boolean } = {}) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;
  const { includePast = false } = options;

  return useQuery({
    queryKey: ["company-events", companyId, includePast],
    queryFn: async (): Promise<CompanyEvent[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("company_events")
        .select("*")
        .eq("company_id", companyId)
        .order("event_date", { ascending: true });

      if (error) throw error;

      const hoje = new Date().toISOString().slice(0, 10);
      const eventos = (data || []) as CompanyEvent[];

      return eventos
        .filter((e) => e.is_recurring || includePast || e.event_date.slice(0, 10) >= hoje)
        .map((e) => (e.is_recurring ? { ...e, event_date: nextOccurrence(e.event_date) } : e))
        .sort((a, b) => a.event_date.localeCompare(b.event_date));
    },
    enabled: !!companyId,
  });
}

export function useCreateEvent() {
  const { user } = useAuth();
  const { profile } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      if (!user?.id || !profile?.primary_company_id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("company_events")
        .insert({
          company_id: profile.primary_company_id,
          created_by: user.id,
          title: input.title,
          description: input.description || null,
          event_date: input.event_date,
          end_date: input.end_date || null,
          location: input.location || null,
          event_type: input.event_type,
          color: input.color || "#3B82F6",
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-events"] });
    },
    onError: (err) => toastDbError(err, "Erro ao criar evento"),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("company_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-events"] });
    },
    onError: (err) => toastDbError(err, "Erro ao remover evento"),
  });
}

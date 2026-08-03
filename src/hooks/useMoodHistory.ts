import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import type { MoodEntry } from "@/lib/mood/moodStats";

/**
 * Histórico de humor da empresa.
 *
 * A RLS de mood_entries já resolve o alcance: colaborador enxerga só os
 * próprios registros, admin enxerga os da empresa toda. Não há filtro de
 * permissão aqui de propósito — duplicá-lo no cliente só criaria uma segunda
 * fonte de verdade para divergir da política do banco.
 */
export function useMoodHistory(options: { limit?: number } = {}) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;
  const { limit = 2000 } = options;

  return useQuery({
    queryKey: ["mood-history", companyId, limit],
    queryFn: async (): Promise<MoodEntry[]> => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("mood_entries")
        .select("id,user_id,person_name,score,mood_label,description,department,recorded_at")
        .eq("company_id", companyId)
        .order("recorded_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as MoodEntry[];
    },
    enabled: !!companyId,
  });
}

/** Histórico de uma pessoa, para o perfil. */
export function useUserMoodHistory(userId: string | undefined) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["mood-history-user", companyId, userId],
    queryFn: async (): Promise<MoodEntry[]> => {
      if (!companyId || !userId) return [];

      const { data, error } = await supabase
        .from("mood_entries")
        .select("id,user_id,person_name,score,mood_label,description,department,recorded_at")
        .eq("company_id", companyId)
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false });

      if (error) throw error;
      return (data || []) as MoodEntry[];
    },
    enabled: !!companyId && !!userId,
  });
}

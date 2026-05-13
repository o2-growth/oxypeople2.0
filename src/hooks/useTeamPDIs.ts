import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PDIPlan } from "@/hooks/usePDI";

export function useTeamPDIs(reportIds: string[]) {
  return useQuery({
    queryKey: ["team-pdi-plans", reportIds],
    queryFn: async (): Promise<Record<string, PDIPlan | undefined>> => {
      if (reportIds.length === 0) return {};
      const { data, error } = await supabase
        .from("pdi_plans")
        .select("*")
        .in("user_id", reportIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Keep only the latest plan per user
      const map: Record<string, PDIPlan> = {};
      for (const row of data ?? []) {
        if (!map[row.user_id]) map[row.user_id] = row as PDIPlan;
      }
      return map;
    },
    enabled: reportIds.length > 0,
  });
}

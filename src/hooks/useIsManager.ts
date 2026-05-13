import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";

export interface DirectReport {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function useIsManager() {
  const { user } = useAuth();
  const { profile } = useUser();
  const userId = user?.id ?? "";
  const companyId = profile?.primary_company_id ?? "";

  const query = useQuery({
    queryKey: ["direct-reports", userId, companyId],
    queryFn: async (): Promise<DirectReport[]> => {
      if (!userId || !companyId) return [];
      const { data, error } = await supabase
        .from("company_memberships")
        .select("user_id, users!company_memberships_user_id_fkey(id, full_name, avatar_url)")
        .eq("company_id", companyId)
        .eq("manager_id", userId)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? [])
        .map((m) => m.users as DirectReport)
        .filter(Boolean)
        .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    },
    enabled: !!userId && !!companyId,
  });

  return {
    isManager: (query.data?.length ?? 0) > 0,
    directReports: query.data ?? [],
    isLoading: query.isLoading,
  };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";

export interface DirectReport {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Quem eu lidero — pela regra única da empresa.
 *
 * A resposta vem da função `led_user_ids` (migration 20260903120000), que une os
 * três caminhos de liderança: gestor na cadeia, líder do time/squad e líder da
 * área. Antes daqui saía só o `manager_id` direto, e por isso o Painel do Time
 * de quem lidera um squad sem ser gestor formal vinha vazio — e vice-versa.
 *
 * Perguntar ao banco em vez de montar a união no front é o que mantém a tela e
 * a RLS respondendo a mesma coisa: a política usa a mesma função.
 */
export function useIsManager() {
  const { user } = useAuth();
  const { profile } = useUser();
  const userId = user?.id ?? "";
  const companyId = profile?.primary_company_id ?? "";

  const query = useQuery({
    queryKey: ["led-people", userId, companyId],
    queryFn: async (): Promise<DirectReport[]> => {
      if (!userId || !companyId) return [];

      const { data: ids, error } = await supabase.rpc("led_user_ids", {
        p_leader: userId,
        p_company: companyId,
      });

      // A função é nova: se o front subir antes da migration, cair no gestor
      // direto mostra menos gente, não uma tela quebrada.
      const ledIds = error ? await fallbackDiretos(userId, companyId) : (ids ?? []);
      if (ledIds.length === 0) return [];

      const { data: pessoas, error: erroPessoas } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .in("id", ledIds);
      if (erroPessoas) throw erroPessoas;

      return (pessoas ?? [])
        .map((p) => p as DirectReport)
        .sort((a, b) =>
          (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR", {
            sensitivity: "base",
          }),
        );
    },
    enabled: !!userId && !!companyId,
  });

  return {
    isManager: (query.data?.length ?? 0) > 0,
    /** Pessoas que eu lidero — gestor na cadeia, líder de time ou líder de área. */
    directReports: query.data ?? [],
    isLoading: query.isLoading,
  };
}

async function fallbackDiretos(userId: string, companyId: string): Promise<string[]> {
  const { data } = await supabase
    .from("company_memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("manager_id", userId)
    .eq("status", "active");
  return (data ?? []).map((m) => m.user_id);
}

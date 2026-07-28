import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  logo_url: string | null;
  plan: string | null;
  /** E-mail do dono do workspace (contato). */
  owner_email: string | null;
}

/**
 * Dados reais da empresa (workspace) do usuário atual.
 *
 * Resolve a company a partir de `profile.primary_company_id` e traz o e-mail
 * do dono via join. Substitui qualquer dado institucional mockado na UI.
 */
export function useCompany() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["company", companyId],
    queryFn: async (): Promise<Company | null> => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("id, name, domain, logo_url, plan, owner:users!companies_owner_id_fkey(email)")
        .eq("id", companyId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const ownerRaw = data.owner as { email: string } | { email: string }[] | null;
      const owner = Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw;

      return {
        id: data.id,
        name: data.name,
        domain: data.domain,
        logo_url: data.logo_url,
        plan: data.plan,
        owner_email: owner?.email ?? null,
      };
    },
    enabled: !!companyId,
  });
}

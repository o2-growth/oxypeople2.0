import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import type { HierarchyNode } from "./useOrganizationHierarchy";

export function useAreasTeamsHierarchy() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["areas-teams-hierarchy", companyId],
    queryFn: async (): Promise<HierarchyNode | null> => {
      if (!companyId) return null;

      const [{ data: company }, { data: departments, error: deptsErr }, { data: teams, error: teamsErr }] =
        await Promise.all([
          supabase.from("companies").select("id, name").eq("id", companyId).single(),
          supabase.from("departments").select("id, name, color").eq("company_id", companyId).order("name"),
          supabase
            .from("teams")
            .select(`
              id, name, department_id,
              team_members(
                user_id, role,
                users!team_members_user_id_fkey(id, full_name, avatar_url, email)
              )
            `)
            .eq("company_id", companyId)
            .order("name"),
        ]);

      if (deptsErr) throw deptsErr;
      if (teamsErr) throw teamsErr;

      const deptNodes: HierarchyNode[] = (departments ?? []).map((dept) => {
        const deptTeams = (teams ?? []).filter((t) => t.department_id === dept.id);

        const teamNodes: HierarchyNode[] = deptTeams.map((team) => {
          const memberNodes: HierarchyNode[] = ((team.team_members as any[]) ?? []).map((m) => ({
            id: `member-${m.user_id}`,
            type: "member" as const,
            name: m.users?.full_name || m.users?.email || "Sem nome",
            role: m.role === "leader" ? "Líder" : "Membro",
            email: m.users?.email ?? "",
            avatarUrl: m.users?.avatar_url ?? "",
            children: [],
          }));

          return {
            id: `team-${team.id}`,
            type: "team" as const,
            name: team.name,
            role: "Time",
            children: memberNodes,
          };
        });

        return {
          id: `dept-${dept.id}`,
          type: "department" as const,
          name: dept.name,
          role: "Área",
          color: dept.color ?? undefined,
          children: teamNodes,
        };
      });

      return {
        id: `company-${companyId}`,
        type: "company" as const,
        name: company?.name ?? "Empresa",
        role: "Empresa",
        children: deptNodes,
      };
    },
    enabled: !!companyId,
  });
}

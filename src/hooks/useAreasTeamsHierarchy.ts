import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import type { HierarchyNode } from "./useOrganizationHierarchy";
import { isTeamLead } from "@/lib/teams/roles";

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
              id, name, department_id, parent_team_id, status, order_index,
              team_members(
                user_id, role,
                users!team_members_user_id_fkey(id, full_name, avatar_url, email)
              )
            `)
            .eq("company_id", companyId)
            .order("order_index"),
        ]);

      if (deptsErr) throw deptsErr;
      if (teamsErr) throw teamsErr;

      // Membros de um time/squad viram folhas da árvore.
      const membrosDe = (team: any): HierarchyNode[] =>
        ((team.team_members as any[]) ?? []).map((m) => ({
          id: `member-${m.user_id}`,
          type: "member" as const,
          name: m.users?.full_name || m.users?.email || "Sem nome",
          role: isTeamLead(m.role) ? "Líder" : "Membro",
          email: m.users?.email ?? "",
          avatarUrl: m.users?.avatar_url ?? "",
          children: [],
        }));

      const deptNodes: HierarchyNode[] = (departments ?? []).map((dept) => {
        // Só os times (sem pai) penduram direto na área; squads entram sob o
        // time deles. Sem esta separação os 13 squads apareceriam no mesmo
        // nível dos times, como se fossem irmãos.
        const deptTeams = (teams ?? []).filter(
          (t) => t.department_id === dept.id && !t.parent_team_id,
        );

        const teamNodes: HierarchyNode[] = deptTeams.map((team) => {
          const squads = (teams ?? []).filter((s) => s.parent_team_id === team.id);

          const squadNodes: HierarchyNode[] = squads.map((squad) => ({
            id: `team-${squad.id}`,
            type: "team" as const,
            name: squad.name,
            role: squad.status === "building" ? "Squad · em construção" : "Squad",
            children: membrosDe(squad),
          }));

          return {
            id: `team-${team.id}`,
            type: "team" as const,
            name: team.name,
            role: "Time",
            // Squads primeiro, depois quem está direto no time: a subdivisão
            // é a informação principal quando ela existe.
            children: [...squadNodes, ...membrosDe(team)],
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

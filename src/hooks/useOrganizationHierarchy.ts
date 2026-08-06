import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import { isTeamLead } from "@/lib/teams/roles";

export interface HierarchyNode {
  id: string;
  type: "company" | "department" | "team" | "member";
  name: string;
  role: string;
  position?: string;
  department?: string;
  avatarUrl?: string;
  color?: string;
  email?: string;
  children: HierarchyNode[];
}

interface DepartmentData {
  id: string;
  name: string;
  color: string | null;
  leader_id: string | null;
  leader?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
}

interface TeamData {
  id: string;
  name: string;
  department_id: string | null;
  parent_team_id: string | null;
  members: {
    user_id: string;
    role: string | null;
    user: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      email: string;
    };
  }[];
}

interface MembershipData {
  user_id: string;
  department_id: string | null;
  position: string | null;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  };
}

export function useOrganizationHierarchy() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["organization-hierarchy", companyId],
    queryFn: async (): Promise<HierarchyNode | null> => {
      if (!companyId) return null;

      // 1. Fetch company with owner
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select(`
          id,
          name,
          owner_id,
          owner:users!companies_owner_id_fkey(id, full_name, avatar_url, email)
        `)
        .eq("id", companyId)
        .single();

      if (companyError) throw companyError;

      // 2. Fetch departments with leaders
      const { data: departments, error: deptError } = await supabase
        .from("departments")
        .select(`
          id,
          name,
          color,
          leader_id,
          leader:users!departments_leader_id_fkey(id, full_name, avatar_url, email)
        `)
        .eq("company_id", companyId);

      if (deptError) throw deptError;

      // 3. Fetch teams with members
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          department_id,
          parent_team_id,
          members:team_members(
            user_id,
            role,
            user:users!team_members_user_id_fkey(id, full_name, avatar_url, email)
          )
        `)
        .eq("company_id", companyId);

      if (teamsError) throw teamsError;

      // 4. Fetch all memberships for unassigned members
      const { data: memberships, error: membershipsError } = await supabase
        .from("company_memberships")
        .select(`
          user_id,
          department_id,
          position,
          user:users!company_memberships_user_id_fkey(id, full_name, avatar_url, email)
        `)
        .eq("company_id", companyId)
        .eq("status", "active");

      if (membershipsError) throw membershipsError;

      // Build the hierarchy
      return buildHierarchy(
        company,
        departments as DepartmentData[],
        teams as TeamData[],
        memberships as MembershipData[]
      );
    },
    enabled: !!companyId,
  });
}

function buildHierarchy(
  company: {
    id: string;
    name: string;
    owner_id: string | null;
    owner: { id: string; full_name: string | null; avatar_url: string | null; email: string } | null;
  },
  departments: DepartmentData[],
  teams: TeamData[],
  memberships: MembershipData[]
): HierarchyNode {
  // Build a position lookup from memberships
  const positionByUserId = new Map<string, string>();
  memberships?.forEach((m) => {
    if (m.position) positionByUserId.set(m.user_id, m.position);
  });

  // Get all users who are team members
  const teamMemberUserIds = new Set<string>();
  teams?.forEach((team) => {
    team.members?.forEach((member) => {
      teamMemberUserIds.add(member.user_id);
    });
  });

  // Build team nodes
  //
  // Squad entra debaixo do time dele, não ao lado. Sem isto os 13 squads
  // apareciam como irmãos dos times na área, exatamente o que a tela de Times
  // já tinha corrigido — este hook tinha ficado para trás.
  const buildTeamNode = (team: TeamData): HierarchyNode => {
    const leader = team.members?.find((m) => isTeamLead(m.role));
    const regularMembers = team.members?.filter((m) => !isTeamLead(m.role)) || [];

    const memberNodes: HierarchyNode[] = regularMembers.map((member) => ({
      id: `member-${member.user_id}`,
      type: "member" as const,
      name: member.user?.full_name || "Sem nome",
      role: "Membro",
      position: "",
      avatarUrl: member.user?.avatar_url || undefined,
      email: member.user?.email,
      children: [],
    }));

    const squadNodes = (teams || [])
      .filter((s) => s.parent_team_id === team.id)
      .map(buildTeamNode);

    return {
      id: `team-${team.id}`,
      type: "team",
      name: team.name,
      role: leader?.user?.full_name || "Sem líder",
      avatarUrl: leader?.user?.avatar_url || undefined,
      email: leader?.user?.email,
      children: [...squadNodes, ...memberNodes],
    };
  };

  // Build department nodes
  const departmentNodes: HierarchyNode[] = (departments || []).map((dept) => {
    // Get teams for this department
    const deptTeams = (teams || []).filter(
      (t) => t.department_id === dept.id && !t.parent_team_id,
    );
    const teamNodes = deptTeams.map(buildTeamNode);

    // Get members directly in department (not in any team)
    const deptMembersNotInTeams = (memberships || []).filter(
      (m) => m.department_id === dept.id && !teamMemberUserIds.has(m.user_id)
    );

    // Don't include the owner or department leader as regular members
    const ownerAndLeaderIds = new Set([company.owner_id, dept.leader_id].filter(Boolean));
    const filteredDeptMembers = deptMembersNotInTeams.filter(
      (m) => !ownerAndLeaderIds.has(m.user_id)
    );

    const memberNodes: HierarchyNode[] = filteredDeptMembers.map((m) => ({
      id: `member-${m.user_id}`,
      type: "member" as const,
      name: m.user?.full_name || "Sem nome",
      role: "Membro",
      position: m.position || "",
      department: dept.name,
      avatarUrl: m.user?.avatar_url || undefined,
      email: m.user?.email,
      children: [],
    }));

    const leaderPosition = dept.leader_id ? positionByUserId.get(dept.leader_id) : undefined;

    return {
      id: `dept-${dept.id}`,
      type: "department" as const,
      name: dept.name,
      role: dept.leader?.full_name || "Sem líder",
      position: leaderPosition || "",
      avatarUrl: dept.leader?.avatar_url || undefined,
      color: dept.color || undefined,
      email: dept.leader?.email,
      children: [...teamNodes, ...memberNodes],
    };
  });

  // Get teams without department
  const teamsWithoutDept = (teams || []).filter((t) => !t.department_id && !t.parent_team_id);
  const orphanTeamNodes = teamsWithoutDept.map(buildTeamNode);

  // Get members without department or team
  const membersWithoutDeptOrTeam = (memberships || []).filter(
    (m) => !m.department_id && !teamMemberUserIds.has(m.user_id)
  );

  // Don't include the owner as unassigned member
  const filteredUnassignedMembers = membersWithoutDeptOrTeam.filter(
    (m) => m.user_id !== company.owner_id
  );

  const unassignedMemberNodes: HierarchyNode[] = filteredUnassignedMembers.map((m) => ({
    id: `member-${m.user_id}`,
    type: "member" as const,
    name: m.user?.full_name || "Sem nome",
    role: "Membro",
    position: m.position || "",
    avatarUrl: m.user?.avatar_url || undefined,
    email: m.user?.email,
    children: [],
  }));

  const ownerPosition = company.owner_id ? positionByUserId.get(company.owner_id) : undefined;

  // Build root node (company owner)
  return {
    id: `company-${company.id}`,
    type: "company",
    name: company.owner?.full_name || company.name,
    role: "Sócio e CEO",
    position: ownerPosition || "CEO",
    avatarUrl: company.owner?.avatar_url || undefined,
    email: company.owner?.email,
    children: [...departmentNodes, ...orphanTeamNodes, ...unassignedMemberNodes],
  };
}

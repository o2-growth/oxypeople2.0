import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "./useUser";
import { useOkrAccessLevels, type OkrAccessLevel } from "./useOkrAccessLevels";
import { isTeamLead } from "@/lib/teams/roles";

export type OkrTier = OkrAccessLevel | "unknown";

export interface UserPermissions {
  isAdmin: boolean;
  isTeamLeader: boolean;
  ledTeamIds: string[];
  role: string | null;
  okrTier: OkrTier;
  canCreateOkr: boolean;
  canManageOkrCascade: boolean;
}

export function useUserPermissions() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useUser();
  const companyId = profile?.primary_company_id;
  const { byUserId, isLoading: okrLevelsLoading } = useOkrAccessLevels();

  // Check if user is admin/owner
  const roleQuery = useQuery({
    queryKey: ["user-role", user?.id, companyId],
    queryFn: async () => {
      if (!user?.id || !companyId) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role || null;
    },
    enabled: !!user?.id && !!companyId,
  });

  // Get teams user leads
  const ledTeamsQuery = useQuery({
    queryKey: ["led-teams", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Filtrar por papel no banco exigiria acertar a grafia ('lead' na prática,
      // 'leader' no comentário da coluna). Trazer os vínculos e decidir aqui
      // aceita as duas — são poucas linhas por pessoa.
      const { data, error } = await supabase
        .from("team_members")
        .select("team_id, role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching led teams:", error);
        return [];
      }

      return data.filter((tm) => isTeamLead(tm.role)).map((tm) => tm.team_id);
    },
    enabled: !!user?.id,
  });

  const role = roleQuery.data;
  const isAdmin = role === "owner" || role === "admin";
  const ledTeamIds = ledTeamsQuery.data || [];
  const isTeamLeader = ledTeamIds.length > 0;

  // Permission check functions
  const canCreateForTeam = (teamId: string): boolean => {
    if (isAdmin) return true;
    return ledTeamIds.includes(teamId);
  };

  const canCreateForUser = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id) return false;
    if (targetUserId === user.id) return true;
    if (isAdmin) return true;

    // Check if target user is in a team the current user leads
    if (ledTeamIds.length === 0) return false;

    const { data } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("user_id", targetUserId)
      .in("team_id", ledTeamIds);

    return (data?.length || 0) > 0;
  };

  const canEditObjective = (objective: {
    owner_id: string;
    created_by: string;
    team_id?: string | null;
  }): boolean => {
    if (!user?.id) return false;
    if (objective.owner_id === user.id || objective.created_by === user.id) return true;
    if (isAdmin) return true;
    if (objective.team_id && ledTeamIds.includes(objective.team_id)) return true;
    return false;
  };

  const canDeleteObjective = (objective: { created_by: string }): boolean => {
    if (!user?.id) return false;
    if (objective.created_by === user.id) return true;
    if (isAdmin) return true;
    return false;
  };

  // OKR tier from okr_access_levels (single source of truth)
  const okrRow = user?.id ? byUserId.get(user.id) : undefined;
  const okrTier: OkrTier = okrRow?.okr_access_level ?? "unknown";
  const canCreateOkr = isAdmin || okrTier === "manager";
  const canManageOkrCascade = canCreateOkr; // alias for canManageRelations

  return {
    isAdmin,
    isTeamLeader,
    ledTeamIds,
    role,
    isLoading:
      profileLoading ||
      (!!user?.id && !companyId) ||
      roleQuery.isLoading ||
      ledTeamsQuery.isLoading ||
      okrLevelsLoading,
    canCreateForTeam,
    canCreateForUser,
    canEditObjective,
    canDeleteObjective,
    canCreateTeamOrIndividual: isAdmin || isTeamLeader,
    okrTier,
    canCreateOkr,
    canManageOkrCascade,
  };
}

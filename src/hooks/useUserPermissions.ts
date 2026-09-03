import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "./useUser";
import { useOkrAccessLevels, type OkrAccessLevel } from "./useOkrAccessLevels";
import { useIsManager } from "./useIsManager";
import { isTeamLead } from "@/lib/teams/roles";

export type OkrTier = OkrAccessLevel | "unknown";

export interface UserPermissions {
  isAdmin: boolean;
  isTeamLeader: boolean;
  ledTeamIds: string[];
  /** Quem eu lidero pela regra única (gestor na cadeia, time ou área). */
  ledPeopleIds: string[];
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
  // Liderança pela regra única — o mesmo led_user_ids que a RLS consulta.
  const { directReports: ledPeople, isLoading: ledPeopleLoading } = useIsManager();

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
  const ledPeopleIds = ledPeople.map((p) => p.id);
  // Liderar um time e liderar gente eram a mesma pergunta e davam respostas
  // diferentes: quem tem 15 liderados e nenhum time respondia "não sou líder".
  const isTeamLeader = ledTeamIds.length > 0 || ledPeopleIds.length > 0;

  // Permission check functions
  const canCreateForTeam = (teamId: string): boolean => {
    if (isAdmin) return true;
    return ledTeamIds.includes(teamId);
  };

  const canCreateForUser = async (targetUserId: string): Promise<boolean> => {
    if (!user?.id) return false;
    if (targetUserId === user.id) return true;
    if (isAdmin) return true;
    return ledPeopleIds.includes(targetUserId);
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
    // Objetivo de quem eu lidero — mesma condição que can_edit_objective aplica
    // na RLS, para o botão não aparecer onde o banco vai recusar (nem sumir
    // onde ele aceitaria).
    if (ledPeopleIds.includes(objective.owner_id)) return true;
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
  // O tier vale para quem não lidera ninguém. Quem lidera cria OKR pela
  // liderança — é o que a política okr_objectives_insert passou a aceitar.
  const canCreateOkr = isAdmin || okrTier === "manager" || ledPeopleIds.length > 0;
  const canManageOkrCascade = canCreateOkr; // alias for canManageRelations

  return {
    isAdmin,
    isTeamLeader,
    ledTeamIds,
    ledPeopleIds,
    role,
    isLoading:
      profileLoading ||
      (!!user?.id && !companyId) ||
      roleQuery.isLoading ||
      ledTeamsQuery.isLoading ||
      ledPeopleLoading ||
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

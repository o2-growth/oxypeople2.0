import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import { toast } from "sonner";
import { friendlyDbError } from "@/lib/db-errors";

function isDepartmentNameUniqueViolation(message: string): boolean {
  return (
    message.includes("departments_company_id_name_key") ||
    message.includes("departments_name_company_unique")
  );
}

export interface Department {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  color: string;
  leader_id: string | null;
  created_at: string;
  updated_at: string;
  leader?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  member_count: number;
  team_count: number;
}

export interface CreateDepartmentInput {
  name: string;
  description?: string;
  color?: string;
  leader_id?: string;
}

export interface UpdateDepartmentInput {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  leader_id?: string | null;
}

export function useDepartmentsWithDetails() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["departments-with-details", companyId],
    queryFn: async (): Promise<Department[]> => {
      if (!companyId) return [];

      // Fetch departments with leader info
      const { data: departments, error } = await supabase
        .from("departments")
        .select(`
          *,
          leader:users!departments_leader_id_fkey(id, full_name, avatar_url)
        `)
        .eq("company_id", companyId)
        .order("name");

      if (error) throw error;

      // Fetch member counts per department
      const { data: memberCounts, error: memberError } = await supabase
        .from("company_memberships")
        .select("department_id")
        .eq("company_id", companyId)
        .eq("status", "active")
        .not("department_id", "is", null);

      if (memberError) throw memberError;

      // Fetch team counts per department
      const { data: teamCounts, error: teamError } = await supabase
        .from("teams")
        .select("department_id")
        .eq("company_id", companyId)
        .not("department_id", "is", null);

      if (teamError) throw teamError;

      // Count members and teams per department
      const memberCountMap = new Map<string, number>();
      (memberCounts || []).forEach((m) => {
        if (m.department_id) {
          memberCountMap.set(m.department_id, (memberCountMap.get(m.department_id) || 0) + 1);
        }
      });

      const teamCountMap = new Map<string, number>();
      (teamCounts || []).forEach((t) => {
        if (t.department_id) {
          teamCountMap.set(t.department_id, (teamCountMap.get(t.department_id) || 0) + 1);
        }
      });

      return (departments || []).map((dept) => ({
        ...dept,
        leader: dept.leader || null,
        member_count: memberCountMap.get(dept.id) || 0,
        team_count: teamCountMap.get(dept.id) || 0,
      }));
    },
    enabled: !!companyId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useMutation({
    mutationFn: async (input: CreateDepartmentInput) => {
      if (!companyId) throw new Error("Company not found");

      const { data, error } = await supabase
        .from("departments")
        .insert({
          company_id: companyId,
          name: input.name,
          description: input.description || null,
          color: input.color || "#3B82F6",
          leader_id: input.leader_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Área criado com sucesso!");
    },
    onError: (error: Error) => {
      if (isDepartmentNameUniqueViolation(error.message)) {
        toast.error("Já existe uma área com este nome.");
      } else {
        toast.error(friendlyDbError(error));
      }
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateDepartmentInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("departments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Área atualizado com sucesso!");
    },
    onError: (error: Error) => {
      if (isDepartmentNameUniqueViolation(error.message)) {
        toast.error("Já existe uma área com este nome.");
      } else {
        toast.error(friendlyDbError(error));
      }
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (departmentId: string) => {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", departmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Área excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir área");
    },
  });
}

export function useAssignMemberToDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ membershipId, departmentId }: { membershipId: string; departmentId: string }) => {
      const { error } = await supabase
        .from("company_memberships")
        .update({ department_id: departmentId })
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["department-members"] });
      toast.success("Membro adicionado à área!");
    },
    onError: () => {
      toast.error("Erro ao adicionar membro");
    },
  });
}

export function useRemoveMemberFromDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("company_memberships")
        .update({ department_id: null })
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments-with-details"] });
      queryClient.invalidateQueries({ queryKey: ["department-members"] });
      toast.success("Membro removido da área!");
    },
    onError: () => {
      toast.error("Erro ao remover membro");
    },
  });
}

export function useDepartmentMembers(departmentId: string | null) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["department-members", departmentId],
    queryFn: async () => {
      if (!departmentId || !companyId) return [];

      const { data, error } = await supabase
        .from("company_memberships")
        .select(`
          id,
          department_id,
          user:users!company_memberships_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq("company_id", companyId)
        .eq("department_id", departmentId)
        .eq("status", "active");

      if (error) throw error;
      return data || [];
    },
    enabled: !!departmentId && !!companyId,
  });
}

export function useDepartmentTeams(departmentId: string | null) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["department-teams", departmentId],
    queryFn: async () => {
      if (!departmentId || !companyId) return [];

      const { data, error } = await supabase
        .from("teams")
        .select(`
          id,
          name,
          description,
          department_id,
          team_members(count)
        `)
        .eq("company_id", companyId)
        .eq("department_id", departmentId);

      if (error) throw error;
      
      return (data || []).map((team) => ({
        ...team,
        member_count: team.team_members?.[0]?.count || 0,
      }));
    },
    enabled: !!departmentId && !!companyId,
  });
}

export function useCompanyMembersWithoutDepartment() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["members-without-department", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("company_memberships")
        .select(`
          id,
          department_id,
          user:users!company_memberships_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq("company_id", companyId)
        .eq("status", "active")
        .is("department_id", null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

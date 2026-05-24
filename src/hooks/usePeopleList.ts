import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CompanyMember {
  id: string;
  user_id: string;
  company_id: string;
  status: "active" | "invited" | "pending" | "inactive";
  position: string | null;
  department: string | null;
  department_id: string | null;
  hire_date: string | null;
  employment_type: string | null;
  is_new_hire: boolean | null;
  joined_at: string | null;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
  department_info: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  role: "owner" | "admin" | "manager" | "member" | null;
}

export interface PeopleStats {
  total: number;
  active: number;
  newThisMonth: number;
  departments: number;
}

export function usePeopleList() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["people-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Fetch memberships with user info
      const { data: memberships, error: membershipsError } = await supabase
        .from("company_memberships")
        .select(`
          *,
          user:users!company_memberships_user_id_fkey(id, full_name, email, avatar_url),
          department_info:departments(id, name, color)
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (membershipsError) throw membershipsError;

      // Fetch roles for all users
      const userIds = memberships?.map((m) => m.user_id) || [];
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("company_id", companyId)
        .in("user_id", userIds);

      if (rolesError) throw rolesError;

      // Map roles to memberships
      const rolesMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      return memberships?.map((m) => ({
        ...m,
        role: rolesMap.get(m.user_id) || "member",
      })) as CompanyMember[];
    },
    enabled: !!companyId,
  });
}

export function usePeopleStats() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["people-stats", companyId],
    queryFn: async (): Promise<PeopleStats> => {
      if (!companyId) {
        return { total: 0, active: 0, newThisMonth: 0, departments: 0 };
      }

      // Get total and active count
      const { count: total } = await supabase
        .from("company_memberships")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId);

      const { count: active } = await supabase
        .from("company_memberships")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active");

      // Get new hires count (based on is_new_hire flag)
      const { count: newThisMonth } = await supabase
        .from("company_memberships")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active")
        .eq("is_new_hire", true);

      // Get department count
      const { count: departments } = await supabase
        .from("departments")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId);

      return {
        total: total || 0,
        active: active || 0,
        newThisMonth: newThisMonth || 0,
        departments: departments || 0,
      };
    },
    enabled: !!companyId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const { profile } = useUser();

  return useMutation({
    mutationFn: async ({
      emails,
      role,
      newHireData,
    }: {
      emails: string[];
      role: string;
      newHireData?: {
        isNewHire: boolean;
        hireDate?: Date;
        employmentType?: string;
      };
    }) => {
      if (!profile?.primary_company_id) {
        throw new Error("Company not found");
      }

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      const companyId = profile.primary_company_id;
      const results: { success: string[]; failed: string[] } = {
        success: [],
        failed: [],
      };

      for (const email of emails) {
        try {
          // Create invite record
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const token = crypto.randomUUID();

          const { error: inviteError } = await supabase.from("invites").insert({
            company_id: companyId,
            email: email.toLowerCase().trim(),
            role: role as "owner" | "admin" | "manager" | "member",
            token,
            expires_at: expiresAt.toISOString(),
            invited_by: userData.user.id,
          });

          if (inviteError) {
            console.error("Error creating invite:", inviteError);
            results.failed.push(email);
          } else {
            results.success.push(email);
          }
        } catch (error) {
          console.error("Error inviting:", email, error);
          results.failed.push(email);
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
      queryClient.invalidateQueries({ queryKey: ["people-stats"] });

      if (results.success.length > 0) {
        toast.success(
          `${results.success.length} convite(s) enviado(s) com sucesso!`
        );
      }
      if (results.failed.length > 0) {
        toast.error(`Falha ao enviar ${results.failed.length} convite(s)`);
      }
    },
    onError: (error) => {
      console.error("Error inviting members:", error);
      toast.error("Erro ao enviar convites");
    },
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  const { profile } = useUser();

  return useMutation({
    mutationFn: async ({
      membershipId,
      userId,
      position,
      department_id,
      role,
    }: {
      membershipId: string;
      userId: string;
      position?: string;
      department_id?: string | null;
      role?: "owner" | "admin" | "manager" | "member";
    }) => {
      const companyId = profile?.primary_company_id;
      if (!companyId) throw new Error("Company not found");

      const membershipUpdates: Record<string, unknown> = {};
      if (position !== undefined) membershipUpdates.position = position || null;
      if (department_id !== undefined) membershipUpdates.department_id = department_id || null;

      if (Object.keys(membershipUpdates).length > 0) {
        const { error } = await supabase
          .from("company_memberships")
          .update(membershipUpdates)
          .eq("id", membershipId);
        if (error) throw error;
      }

      if (role !== undefined) {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, company_id: companyId, role }, { onConflict: "user_id,company_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
      queryClient.invalidateQueries({ queryKey: ["people-stats"] });
      toast.success("Colaborador atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating member:", error);
      toast.error("Erro ao atualizar colaborador");
    },
  });
}

export function useBulkUpdateMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membershipIds,
      department_id,
      status,
    }: {
      membershipIds: string[];
      department_id?: string | null;
      status?: "active" | "inactive";
    }) => {
      const updates: Record<string, unknown> = {};
      if (department_id !== undefined) updates.department_id = department_id;
      if (status !== undefined) updates.status = status;
      if (Object.keys(updates).length === 0) return;

      const { error } = await supabase
        .from("company_memberships")
        .update(updates)
        .in("id", membershipIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
      queryClient.invalidateQueries({ queryKey: ["people-stats"] });
      toast.success("Colaboradores atualizados.");
    },
    onError: () => {
      toast.error("Erro ao atualizar colaboradores.");
    },
  });
}

export function useBulkUpdateMemberRole() {
  const { profile } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userIds, role }: { userIds: string[]; role: "admin" | "manager" | "member" }) => {
      const companyId = profile?.primary_company_id;
      if (!companyId) throw new Error("Empresa não identificada.");
      const rows = userIds.map((user_id) => ({ user_id, company_id: companyId, role }));
      const { error } = await supabase
        .from("user_roles")
        .upsert(rows, { onConflict: "user_id,company_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
      toast.success("Funções atualizadas.");
    },
    onError: () => {
      toast.error("Erro ao atualizar funções.");
    },
  });
}

export function useBulkDeleteMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipIds: string[]) => {
      const { error } = await supabase
        .from("company_memberships")
        .delete()
        .in("id", membershipIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
      queryClient.invalidateQueries({ queryKey: ["people-stats"] });
      toast.success("Colaboradores removidos.");
    },
    onError: () => {
      toast.error("Erro ao remover colaboradores.");
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("company_memberships")
        .delete()
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
      queryClient.invalidateQueries({ queryKey: ["people-stats"] });
      toast.success("Colaborador removido.");
    },
    onError: () => {
      toast.error("Erro ao remover colaborador.");
    },
  });
}

export function useUpdateMemberStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membershipId,
      status,
    }: {
      membershipId: string;
      status: "active" | "inactive";
    }) => {
      const { error } = await supabase
        .from("company_memberships")
        .update({ status })
        .eq("id", membershipId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
      queryClient.invalidateQueries({ queryKey: ["people-stats"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating member status:", error);
      toast.error("Erro ao atualizar status");
    },
  });
}

export interface MyMembership {
  id: string;
  position: string | null;
  department_id: string | null;
  department_info: { id: string; name: string; color: string | null } | null;
}

export function useMyMembership() {
  const { user } = useAuth();
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["my-membership", user?.id, companyId],
    queryFn: async (): Promise<MyMembership | null> => {
      if (!user?.id || !companyId) return null;
      const { data, error } = await supabase
        .from("company_memberships")
        .select("id, position, department_id, department_info:departments(id, name, color)")
        .eq("user_id", user.id)
        .eq("company_id", companyId)
        .single();
      if (error) return null;
      return data as MyMembership;
    },
    enabled: !!user?.id && !!companyId,
  });
}

export function useUpdateMyPosition() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ membershipId, position }: { membershipId: string; position: string | null }) => {
      const { error } = await supabase
        .from("company_memberships")
        .update({ position: position || null })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-membership"] });
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
    },
  });
}

export interface CollaboratorDetail {
  membershipId: string;
  userId: string;
  // user fields
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  // metadata
  phone: string | null;
  bio: string | null;
  cpf: string | null;
  personal_email: string | null;
  birth_date: string | null;
  address: string | null;
  cnpj: string | null;
  razao_social: string | null;
  calendar_link: string | null;
  // membership fields
  position: string | null;
  department_id: string | null;
  department_info: { id: string; name: string; color: string | null } | null;
  hire_date: string | null;
  employment_type: string | null;
  status: "active" | "invited" | "pending" | "inactive";
  role: "owner" | "admin" | "manager" | "member" | null;
}

export function useCollaboratorDetail(membershipId: string | null) {
  return useQuery({
    queryKey: ["collaborator-detail", membershipId],
    queryFn: async (): Promise<CollaboratorDetail | null> => {
      if (!membershipId) return null;

      const { data: mb, error: mbError } = await supabase
        .from("company_memberships")
        .select(`
          id, user_id, position, department_id, hire_date, employment_type, status,
          department_info:departments(id, name, color),
          user:users!company_memberships_user_id_fkey(id, full_name, email, avatar_url, metadata)
        `)
        .eq("id", membershipId)
        .single();

      if (mbError || !mb) return null;

      const u = mb.user as { id: string; full_name: string | null; email: string; avatar_url: string | null; metadata: Record<string, unknown> | null } | null;
      const meta = (u?.metadata as Record<string, unknown> | null) ?? {};

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", mb.user_id)
        .maybeSingle();

      return {
        membershipId: mb.id,
        userId: mb.user_id,
        full_name: u?.full_name ?? null,
        email: u?.email ?? "",
        avatar_url: u?.avatar_url ?? null,
        phone: (meta.phone as string) ?? null,
        bio: (meta.bio as string) ?? null,
        cpf: (meta.cpf as string) ?? null,
        personal_email: (meta.personal_email as string) ?? null,
        birth_date: (meta.birth_date as string) ?? null,
        address: (meta.address as string) ?? null,
        cnpj: (meta.cnpj as string) ?? null,
        razao_social: (meta.razao_social as string) ?? null,
        calendar_link: (meta.calendar_link as string) ?? null,
        position: mb.position,
        department_id: mb.department_id,
        department_info: mb.department_info as CollaboratorDetail["department_info"],
        hire_date: mb.hire_date,
        employment_type: mb.employment_type,
        status: mb.status as CollaboratorDetail["status"],
        role: (roleRow?.role as CollaboratorDetail["role"]) ?? "member",
      };
    },
    enabled: !!membershipId,
  });
}

export function useAdminUpdateCollaborator() {
  const queryClient = useQueryClient();
  const { profile } = useUser();

  return useMutation({
    mutationFn: async ({
      membershipId,
      userId,
      full_name,
      metadata,
      position,
      department_id,
      hire_date,
      employment_type,
      status,
      role,
    }: {
      membershipId: string;
      userId: string;
      full_name?: string | null;
      metadata?: Record<string, unknown>;
      position?: string | null;
      department_id?: string | null;
      hire_date?: string | null;
      employment_type?: string | null;
      status?: "active" | "inactive";
      role?: "owner" | "admin" | "manager" | "member";
    }) => {
      const companyId = profile?.primary_company_id;
      if (!companyId) throw new Error("Empresa não identificada");

      // Update user table (full_name + metadata) — requires admin RLS policy
      const userUpdates: Record<string, unknown> = {};
      if (full_name !== undefined) userUpdates.full_name = full_name;
      if (metadata !== undefined) userUpdates.metadata = metadata;
      if (Object.keys(userUpdates).length > 0) {
        const { error } = await supabase.from("users").update(userUpdates).eq("id", userId);
        if (error) throw error;
      }

      // Update membership
      const mbUpdates: Record<string, unknown> = {};
      if (position !== undefined) mbUpdates.position = position || null;
      if (department_id !== undefined) mbUpdates.department_id = department_id || null;
      if (hire_date !== undefined) mbUpdates.hire_date = hire_date || null;
      if (employment_type !== undefined) mbUpdates.employment_type = employment_type || null;
      if (status !== undefined) mbUpdates.status = status;
      if (Object.keys(mbUpdates).length > 0) {
        const { error } = await supabase.from("company_memberships").update(mbUpdates).eq("id", membershipId);
        if (error) throw error;
      }

      // Update role
      if (role !== undefined) {
        const { error } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, company_id: companyId, role }, { onConflict: "user_id,company_id" });
        if (error) throw error;
      }
    },
    onSuccess: (_, { membershipId }) => {
      queryClient.invalidateQueries({ queryKey: ["collaborator-detail", membershipId] });
      queryClient.invalidateQueries({ queryKey: ["people-list"] });
      queryClient.invalidateQueries({ queryKey: ["people-stats"] });
      toast.success("Colaborador atualizado!");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao atualizar colaborador");
    },
  });
}

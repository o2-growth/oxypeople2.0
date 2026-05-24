import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "./useUser";
import { toastDbError } from "@/lib/db-errors";
import type { Database } from "@/integrations/supabase/types";

import type { ObjectiveType } from "@/lib/objective-types";

type ObjectiveRow = Database["public"]["Tables"]["objectives"]["Row"];
type KeyResultRow = Database["public"]["Tables"]["key_results"]["Row"];

export type { ObjectiveType };
export type ObjectiveStatus = "planned" | "active" | "risk" | "completed" | "canceled";
export type CommitmentType = "committed" | "aspirational";

export interface ObjectiveWithDetails extends Omit<ObjectiveRow, 'type' | 'status'> {
  type: ObjectiveType;
  status: ObjectiveStatus;
  owner: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
  assignee: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
  team: {
    id: string;
    name: string;
    department: string | null;
  } | null;
  key_results: KeyResultRow[];
  children?: ObjectiveWithDetails[];
  collaborators?: {
    user_id: string;
    role: string;
  }[];
}

export interface CreateObjectiveInput {
  title: string;
  description?: string;
  due_date?: string;
  visibility: "public" | "company" | "private";
  type: ObjectiveType;
  team_id?: string;
  assignee_id?: string;
  owner_id?: string;
  parent_id?: string;
  is_active?: boolean;
  period_id?: string;
  department?: string;
  owner_department_id?: string;
  tags?: string[];
  contributors?: string[];
  editors?: string[];
  commitment_type?: CommitmentType;
  key_results?: {
    title: string;
    target_value: number;
    current_value?: number;
    initial_value?: number;
    unit?: string;
    kr_type?: string;
    weight_percentage?: number;
    owner_user_id?: string;
    direction?: string;
  }[];
}

export interface UpdateObjectiveInput {
  id: string;
  title?: string;
  description?: string;
  due_date?: string;
  status?: ObjectiveStatus;
  visibility?: "public" | "company" | "private";
  is_active?: boolean;
  period_id?: string;
  department?: string;
  owner_department_id?: string;
  tags?: string[];
  commitment_type?: CommitmentType;
}

export function useObjectives() {
  const { user } = useAuth();
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["objectives", companyId, user?.id],
    queryFn: async (): Promise<ObjectiveWithDetails[]> => {
      if (!companyId || !user?.id) return [];

      const { data, error } = await supabase
        .from("objectives")
        .select(`
          *,
          owner:users!objectives_owner_id_fkey(id, full_name, avatar_url, email),
          assignee:users!objectives_assignee_id_fkey(id, full_name, avatar_url, email),
          team:teams(id, name, department),
          key_results(*)
        `)
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching objectives:", error);
        throw error;
      }

      return (data || []).map((obj) => ({
        ...obj,
        type: obj.type as ObjectiveType,
        status: obj.status as ObjectiveStatus,
      })) as ObjectiveWithDetails[];
    },
    enabled: !!companyId && !!user?.id,
  });
}

export function useObjectiveTree() {
  const { data: objectives = [], isLoading } = useObjectives();

  // Build tree structure
  const tree = buildObjectiveTree(objectives);

  return { tree, flatObjectives: objectives, isLoading };
}

function buildObjectiveTree(objectives: ObjectiveWithDetails[]): ObjectiveWithDetails[] {
  const map = new Map<string, ObjectiveWithDetails>();
  const roots: ObjectiveWithDetails[] = [];

  // Clone and init children
  objectives.forEach((obj) => {
    map.set(obj.id, { ...obj, children: [] });
  });

  // Build parent-child relationships
  objectives.forEach((obj) => {
    const node = map.get(obj.id)!;
    if (obj.parent_id && map.has(obj.parent_id)) {
      map.get(obj.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort: strategic first, then tactical, then operational
  const typeOrder: Record<string, number> = { strategic: 0, tactical: 1, operational: 2 };
  const sortFn = (a: ObjectiveWithDetails, b: ObjectiveWithDetails) =>
    (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3);

  roots.sort(sortFn);
  const sortChildren = (nodes: ObjectiveWithDetails[]) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => n.children && sortChildren(n.children));
  };
  sortChildren(roots);

  return roots;
}

export function useCreateObjective() {
  const { user } = useAuth();
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const companyId = profile?.primary_company_id;

  return useMutation({
    mutationFn: async (input: CreateObjectiveInput) => {
      if (!user?.id || !companyId) throw new Error("Not authenticated");

      const ownerId = input.owner_id || user.id;

      const insertData: any = {
        company_id: companyId,
        owner_id: ownerId,
        created_by: user.id,
        title: input.title,
        description: input.description || null,
        due_date: input.due_date || null,
        visibility: input.visibility,
        type: input.type,
        team_id: input.team_id || null,
        assignee_id: input.assignee_id || null,
        parent_id: input.parent_id || null,
        is_active: input.is_active ?? true,
        period_id: input.period_id || null,
        department: input.department || null,
        owner_department_id: input.owner_department_id || null,
        tags: input.tags || null,
        commitment_type: input.commitment_type || "committed",
        status: "planned",
        progress: 0,
      };

      const { data: objective, error: objError } = await supabase
        .from("objectives")
        .insert(insertData)
        .select()
        .single();

      if (objError) throw objError;

      // Create key results
      if (input.key_results && input.key_results.length > 0) {
        const keyResultsData = input.key_results.map((kr) => ({
          objective_id: objective.id,
          title: kr.title,
          target_value: kr.target_value,
          current_value: kr.current_value || 0,
          initial_value: kr.initial_value || 0,
          unit: kr.unit || "%",
          kr_type: kr.kr_type || "numeric",
          weight_percentage: kr.weight_percentage || 0,
          owner_user_id: kr.owner_user_id || null,
          direction: kr.direction || "up",
        }));

        const { error: krError } = await supabase
          .from("key_results")
          .insert(keyResultsData);

        if (krError) throw krError;
      }

      // Create collaborators
      const collaborators: { objective_id: string; user_id: string; role: string }[] = [];

      if (input.contributors?.length) {
        input.contributors.forEach((userId) => {
          collaborators.push({ objective_id: objective.id, user_id: userId, role: "contributor" });
        });
      }

      if (input.editors?.length) {
        input.editors.forEach((userId) => {
          collaborators.push({ objective_id: objective.id, user_id: userId, role: "editor" });
        });
      }

      if (collaborators.length > 0) {
        await supabase.from("objective_collaborators").insert(collaborators);
      }

      // Create objective relation if parent_id
      if (input.parent_id) {
        await supabase.from("objective_relations").insert({
          parent_objective_id: input.parent_id,
          child_objective_id: objective.id,
          weight_percentage: 0,
        });
      }

      return objective;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objectives-filtered"] });
    },
    onError: (err) => toastDbError(err),
  });
}

export function useUpdateObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateObjectiveInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from("objectives")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objectives-filtered"] });
    },
    onError: (err) => toastDbError(err),
  });
}

export function useDeleteObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (objectiveId: string) => {
      const { error } = await supabase
        .from("objectives")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", objectiveId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objectives-filtered"] });
    },
    onError: (err) => toastDbError(err),
  });
}

export function useDeleteKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (krId: string) => {
      const { error } = await supabase.from("key_results").delete().eq("id", krId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objectives-filtered"] });
    },
    onError: (err) => toastDbError(err),
  });
}

export interface UpdateKeyResultInput {
  id: string;
  current_value?: number;
  title?: string;
  target_value?: number;
  initial_value?: number;
  unit?: string | null;
  kr_type?: string;
  direction?: string;
  owner_user_id?: string | null;
}

export function useUpdateKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateKeyResultInput) => {
      const { data, error } = await supabase
        .from("key_results")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["objectives"] });
      queryClient.invalidateQueries({ queryKey: ["objectives-filtered"] });
    },
    onError: (err) => toastDbError(err),
  });
}

export function usePeriods() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["periods", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from("periods")
        .select("*")
        .eq("company_id", companyId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });
}

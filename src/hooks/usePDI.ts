import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export type PDIStatus = "draft" | "active" | "completed" | "canceled";

export interface PDIPlan {
  id: string;
  company_id: string;
  user_id: string;
  manager_id: string | null;
  cycle_id: string | null;
  evaluation_id: string | null;
  title: string;
  description: string | null;
  status: PDIStatus;
  target_date: string | null;
  progress: number;
  approved_at: string | null;
  approval_requested_at: string | null;
  review_comment: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePDIInput {
  title: string;
  description?: string | null;
  target_date?: string | null;
  cycle_id?: string | null;
  manager_id?: string | null;
}

export interface CreatePDIForReportInput extends CreatePDIInput {
  forUserId: string;
}

const listKey = (userId: string) => ["pdi-plans", userId];
const detailKey = (id: string) => ["pdi-plan", id];

export function usePDIList() {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: listKey(userId),
    queryFn: async (): Promise<PDIPlan[]> => {
      const { data, error } = await supabase
        .from("pdi_plans")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PDIPlan[];
    },
    enabled: !!userId,
  });
}

export function usePDIDetail(planId: string) {
  return useQuery({
    queryKey: detailKey(planId),
    queryFn: async (): Promise<PDIPlan | null> => {
      if (!planId) return null;
      const { data, error } = await supabase
        .from("pdi_plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();
      if (error) throw error;
      return data as PDIPlan | null;
    },
    enabled: !!planId,
  });
}

export function useCreatePDI() {
  const { user } = useAuth();
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (input: CreatePDIInput) => {
      if (!user?.id || !profile?.primary_company_id) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("pdi_plans")
        .insert({
          user_id: user.id,
          company_id: profile.primary_company_id,
          title: input.title,
          description: input.description ?? null,
          target_date: input.target_date ?? null,
          cycle_id: input.cycle_id ?? null,
          manager_id: input.manager_id ?? null,
          status: "draft",
          progress: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PDIPlan;
    },
    onSuccess: (plan) => {
      trackEvent("pdi_created", {
        has_cycle: !!plan.cycle_id,
        has_manager: !!plan.manager_id,
      });
      queryClient.invalidateQueries({ queryKey: listKey(plan.user_id) });
      navigate(`/pdi/${plan.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao criar PDI.");
    },
  });
}

export function useActivatePDI(planId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pdi_plans")
        .update({ status: "active" })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("pdi_activated");
      queryClient.invalidateQueries({ queryKey: detailKey(planId) });
      queryClient.invalidateQueries({ queryKey: listKey(userId) });
      toast.success("PDI ativado com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao ativar PDI.");
    },
  });
}

export function useRefetchPDIDetail(planId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: detailKey(planId) });
}

export function useCreatePDIForReport() {
  const { user } = useAuth();
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (input: CreatePDIForReportInput) => {
      if (!user?.id || !profile?.primary_company_id) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("pdi_plans")
        .insert({
          user_id: input.forUserId,
          manager_id: user.id,
          company_id: profile.primary_company_id,
          title: input.title,
          description: input.description ?? null,
          target_date: input.target_date ?? null,
          cycle_id: input.cycle_id ?? null,
          status: "draft",
          progress: 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PDIPlan;
    },
    onSuccess: (plan) => {
      trackEvent("pdi_created", {
        has_cycle: !!plan.cycle_id,
        has_manager: true,
        created_for_report: true,
      });
      queryClient.invalidateQueries({ queryKey: ["team-pdi-plans"] });
      navigate(`/pdi/${plan.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao criar PDI.");
    },
  });
}

export function useCompletePDI(planId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pdi_plans")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("pdi_completed");
      queryClient.invalidateQueries({ queryKey: detailKey(planId) });
      queryClient.invalidateQueries({ queryKey: listKey(userId) });
      toast.success("PDI concluído com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao concluir PDI.");
    },
  });
}

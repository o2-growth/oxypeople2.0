import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

const detailKey = (id: string) => ["pdi-plan", id];
const listKey = (userId: string) => ["pdi-plans", userId];

export function useRequestApproval(planId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pdi_plans")
        .update({ approval_requested_at: new Date().toISOString(), review_comment: null })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("pdi_approval_requested");
      queryClient.invalidateQueries({ queryKey: detailKey(planId) });
      queryClient.invalidateQueries({ queryKey: listKey(userId) });
      toast.success("Solicitação enviada ao gestor.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao solicitar aprovação.");
    },
  });
}

export function useCancelApprovalRequest(planId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pdi_plans")
        .update({ approval_requested_at: null })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailKey(planId) });
      queryClient.invalidateQueries({ queryKey: listKey(userId) });
      toast.success("Solicitação cancelada.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao cancelar solicitação.");
    },
  });
}

export function useApprovePDI(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pdi_plans")
        .update({ approved_at: new Date().toISOString(), approval_requested_at: null })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("pdi_approved");
      queryClient.invalidateQueries({ queryKey: detailKey(planId) });
      queryClient.invalidateQueries({ queryKey: ["team-pdi-plans"] });
      toast.success("PDI aprovado com sucesso!");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao aprovar PDI.");
    },
  });
}

export function useRequestChanges(planId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: string) => {
      const { error } = await supabase
        .from("pdi_plans")
        .update({ approval_requested_at: null, review_comment: comment })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("pdi_changes_requested");
      queryClient.invalidateQueries({ queryKey: detailKey(planId) });
      queryClient.invalidateQueries({ queryKey: ["team-pdi-plans"] });
      toast.success("Pedido de ajustes enviado ao liderado.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao enviar pedido de ajustes.");
    },
  });
}

export function useRevokeApproval(planId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("pdi_plans")
        .update({ approved_at: null })
        .eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("pdi_approval_revoked", { reason: "manual" });
      queryClient.invalidateQueries({ queryKey: detailKey(planId) });
      queryClient.invalidateQueries({ queryKey: listKey(userId) });
      toast.success("Aprovação revogada. Você pode solicitar novamente após editar o PDI.");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao revogar aprovação.");
    },
  });
}

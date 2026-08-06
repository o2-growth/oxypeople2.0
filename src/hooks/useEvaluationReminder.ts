import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RemindInput {
  /** Cobra todo mundo que ainda deve neste ciclo. */
  cycleId?: string;
  /** Cobra pessoas específicas. */
  evaluationIds?: string[];
  channels?: ("inapp" | "email" | "slack")[];
}

/**
 * Lembrete de avaliação pendente.
 *
 * O envio acontece na edge function: cobrar por e-mail e Slack exige segredos
 * que não podem viver no navegador, e é lá que também se confere se quem pediu
 * é admin da empresa.
 */
export function useSendEvaluationReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RemindInput) => {
      const { data, error } = await supabase.functions.invoke("performance-remind", {
        body: input,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Falha ao enviar o lembrete");
      return data as { reminded: number; pending: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (data.reminded === 0) {
        toast.info("Ninguém para cobrar — está tudo respondido.");
      } else {
        toast.success(
          data.reminded === 1
            ? "Lembrete enviado."
            : `Lembrete enviado para ${data.reminded} pessoas.`,
        );
      }
    },
    onError: (error: Error) => {
      console.error("Error sending reminder:", error);
      toast.error(error.message || "Não foi possível enviar o lembrete");
    },
  });
}

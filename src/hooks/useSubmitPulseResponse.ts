import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { pulseAckKey } from "@/lib/pulse/periodStart";
import { PENDING_PULSE_QUERY_KEY, type PendingPulse } from "@/hooks/usePendingPulse";

export interface SubmitPulseInput {
  pulseSurveyId: string;
  periodStart: string;
  anonymous: boolean;
  questionType: PendingPulse["question_type"];
  score: number;
  emoji?: string | null;
  comment?: string | null;
}

export function useSubmitPulseResponse() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SubmitPulseInput) => {
      const userId = user?.id;
      if (!userId) throw new Error("Usuário não autenticado.");

      // 1. Registra a PARTICIPAÇÃO no servidor (fonte de verdade, persistente).
      //    Guarda anti-dupla via UNIQUE (pulse, user, period): se já participou,
      //    o INSERT falha e tratamos como "já respondeu". O user_id fica aqui,
      //    NÃO na resposta — o anonimato da NOTA é preservado em pulse_responses.
      const { error: partError } = await supabase.from("pulse_participants").insert({
        pulse_survey_id: input.pulseSurveyId,
        user_id: userId,
        period_start: input.periodStart,
      });
      if (partError) throw partError;

      // 2. Grava a resposta (anônima -> user_id null; identificada -> user_id).
      const { error } = await supabase.from("pulse_responses").insert({
        pulse_survey_id: input.pulseSurveyId,
        user_id: input.anonymous ? null : userId,
        period_start: input.periodStart,
        score: input.score,
        emoji: input.emoji ?? null,
        comment: input.comment?.trim() ? input.comment.trim() : null,
      });

      if (error) {
        // Rollback da participação pra pessoa poder tentar de novo.
        await supabase
          .from("pulse_participants")
          .delete()
          .eq("pulse_survey_id", input.pulseSurveyId)
          .eq("user_id", userId)
          .eq("period_start", input.periodStart);
        throw error;
      }

      // Ack local (anônimo): esconde o widget na hora, sem esperar refetch.
      // Identificado esconde via checagem no servidor (pulse_participants).
      if (input.anonymous && typeof window !== "undefined") {
        window.localStorage.setItem(pulseAckKey(input.pulseSurveyId, input.periodStart), "1");
      }

      return input;
    },
    onSuccess: (vars) => {
      trackEvent("pulse_response_submitted", {
        pulse_survey_id: vars.pulseSurveyId,
        score: vars.score,
        question_type: vars.questionType,
        anonymous: vars.anonymous,
        has_comment: Boolean(vars.comment?.trim()),
      });
      toast.success("Obrigado pelo feedback!");
      queryClient.invalidateQueries({ queryKey: [PENDING_PULSE_QUERY_KEY] });
    },
    onError: (err: Error) => {
      // Erros comuns: violação de UNIQUE (já respondeu) ou RLS (pulse inativo)
      const msg = err.message ?? "";
      if (msg.includes("duplicate key") || msg.includes("unique")) {
        toast.error("Você já respondeu este Pulse no período corrente.");
      } else {
        toast.error("Não foi possível enviar sua resposta. Tente novamente.");
      }
    },
  });
}

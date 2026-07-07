import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { useAuth } from "@/contexts/AuthContext";
import { periodStartFor, pulseAckKey } from "@/lib/pulse/periodStart";

export interface PendingPulse {
  id: string;
  question: string;
  question_type: "scale_1_5" | "enps_0_10" | "mood_emoji";
  frequency: "weekly" | "biweekly" | "monthly";
  anonymous: boolean;
  require_comment_below: number | null;
  period_start: string;
  created_at: string;
}

const PENDING_PULSE_KEY = "pending-pulse";

interface PulseSurveyRow {
  id: string;
  question: string;
  question_type: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  target_all: boolean;
  target_departments: string[] | null;
  target_teams: string[] | null;
  anonymous: boolean;
  require_comment_below: number | null;
  active: boolean;
  created_at: string;
  company_id: string;
}

/**
 * Retorna o pulse pendente do usuário no período corrente (1 por vez —
 * o mais recente que ainda não foi respondido).
 */
export function usePendingPulse() {
  const { profile } = useUser();
  const { user } = useAuth();
  const companyId = profile?.primary_company_id;
  const userId = user?.id;

  return useQuery({
    queryKey: [PENDING_PULSE_KEY, userId, companyId],
    queryFn: async (): Promise<PendingPulse | null> => {
      if (!companyId || !userId) return null;

      // 1. Carrega pulses ativos da empresa
      const { data: surveys, error } = await supabase
        .from("pulse_surveys")
        .select(
          "id, question, question_type, frequency, day_of_week, day_of_month, target_all, target_departments, target_teams, anonymous, require_comment_below, active, created_at, company_id",
        )
        .eq("company_id", companyId)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!surveys || surveys.length === 0) return null;

      const now = new Date();

      // 2. Para cada pulse, calcula period_start e verifica se já respondeu
      for (const s of surveys as PulseSurveyRow[]) {
        const periodStart = periodStartFor(
          now,
          s.frequency as PendingPulse["frequency"],
          s.day_of_week,
          s.day_of_month,
          new Date(s.created_at),
        );

        // Fonte de verdade: participação registrada no servidor (persistente,
        // vale entre dispositivos, para pulse anônimo e identificado).
        const { data: participated } = await supabase
          .from("pulse_participants")
          .select("id")
          .eq("pulse_survey_id", s.id)
          .eq("user_id", userId)
          .eq("period_start", periodStart)
          .maybeSingle();
        if (participated) continue;

        // Fallbacks para respostas feitas ANTES desta feature:
        if (s.anonymous) {
          // ack local (localStorage) — anti-duplicação anônima legada
          const ackKey = pulseAckKey(s.id, periodStart);
          if (typeof window !== "undefined" && window.localStorage.getItem(ackKey)) {
            continue;
          }
        } else {
          // pulse identificado: resposta já em pulse_responses
          const { data: existing, error: checkErr } = await supabase
            .from("pulse_responses")
            .select("id")
            .eq("pulse_survey_id", s.id)
            .eq("user_id", userId)
            .eq("period_start", periodStart)
            .maybeSingle();
          if (checkErr) throw checkErr;
          if (existing) continue;
        }

        return {
          id: s.id,
          question: s.question,
          question_type: s.question_type as PendingPulse["question_type"],
          frequency: s.frequency as PendingPulse["frequency"],
          anonymous: s.anonymous,
          require_comment_below: s.require_comment_below,
          period_start: periodStart,
          created_at: s.created_at,
        };
      }

      return null;
    },
    enabled: !!userId && !!companyId,
    staleTime: 60_000,
  });
}

export const PENDING_PULSE_QUERY_KEY = PENDING_PULSE_KEY;

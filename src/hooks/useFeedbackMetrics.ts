import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";

export interface FeedbackMonthlyPoint {
  month: string;
  requests: number;
  answered: number;
  declined: number;
  expired: number;
}

export interface FeedbackCompetency {
  name: string;
  cnt: number;
}

export interface FeedbackMetrics {
  total_requests: number;
  total_responses: number;
  avg_response_hours: number;
  pct_answered_on_time: number;
  decline_rate: number;
  avg_requests_per_user: number;
  distinct_requesters: number;
  total_members: number;
  adoption_pct: number;
  monthly: FeedbackMonthlyPoint[];
  competencies: FeedbackCompetency[];
}

export function useFeedbackMetrics(dateFrom: string, dateTo: string) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["feedback-metrics", companyId, dateFrom, dateTo],
    queryFn: async (): Promise<FeedbackMetrics> => {
      if (!companyId) throw new Error("Empresa não identificada.");

      const { data, error } = await supabase.rpc("get_feedback_metrics", {
        p_company_id: companyId,
        p_date_from: dateFrom,
        p_date_to: dateTo,
      });

      if (error) throw error;

      const raw = data as FeedbackMetrics;
      return {
        total_requests: raw.total_requests ?? 0,
        total_responses: raw.total_responses ?? 0,
        avg_response_hours: raw.avg_response_hours ?? 0,
        pct_answered_on_time: raw.pct_answered_on_time ?? 0,
        decline_rate: raw.decline_rate ?? 0,
        avg_requests_per_user: raw.avg_requests_per_user ?? 0,
        distinct_requesters: raw.distinct_requesters ?? 0,
        total_members: raw.total_members ?? 0,
        adoption_pct: raw.adoption_pct ?? 0,
        monthly: (raw.monthly as FeedbackMonthlyPoint[]) ?? [],
        competencies: (raw.competencies as FeedbackCompetency[]) ?? [],
      };
    },
    enabled: !!companyId,
  });
}

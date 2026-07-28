import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import type { PulseSurveyFormValues } from "@/lib/validation/pulseSurveySchema";

export interface PulseSurveyAdminRow {
  id: string;
  company_id: string;
  created_by: string;
  name: string;
  question: string;
  question_type: string;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  send_hour_utc: number;
  target_departments: string[];
  target_teams: string[];
  target_all: boolean;
  active: boolean;
  require_comment_below: number | null;
  anonymous: boolean;
  last_dispatched_at: string | null;
  created_at: string;
  updated_at: string;
  response_count_current_period: number;
  has_responses: boolean;
}

const PULSE_QUERY_KEY = "pulse-surveys-admin";

function periodStartFor(now: Date, frequency: string, dayOfWeek: number | null, dayOfMonth: number | null): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  if (frequency === "monthly") {
    d.setUTCDate(dayOfMonth ?? 1);
    if (d > now) d.setUTCMonth(d.getUTCMonth() - 1);
    return d;
  }
  // weekly/biweekly: anchor to most recent target weekday
  const target = dayOfWeek ?? 1;
  const diff = (d.getUTCDay() - target + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function usePulseSurveysAdmin() {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const companyId = profile?.primary_company_id;

  const surveysQuery = useQuery({
    queryKey: [PULSE_QUERY_KEY, companyId],
    queryFn: async (): Promise<PulseSurveyAdminRow[]> => {
      if (!companyId) return [];

      const { data: surveys, error } = await supabase
        .from("pulse_surveys")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!surveys || surveys.length === 0) return [];

      const surveyIds = surveys.map((s) => s.id);
      const { data: responses, error: respErr } = await supabase
        .from("pulse_responses")
        .select("pulse_survey_id, period_start")
        .in("pulse_survey_id", surveyIds);

      if (respErr) throw respErr;

      const totalBySurvey = new Map<string, number>();
      const currentBySurvey = new Map<string, number>();
      const now = new Date();
      (responses ?? []).forEach((r) => {
        if (!r.pulse_survey_id) return;
        totalBySurvey.set(r.pulse_survey_id, (totalBySurvey.get(r.pulse_survey_id) ?? 0) + 1);
      });
      surveys.forEach((s) => {
        const start = periodStartFor(now, s.frequency, s.day_of_week, s.day_of_month);
        const startIso = start.toISOString().slice(0, 10);
        const count = (responses ?? []).filter(
          (r) => r.pulse_survey_id === s.id && r.period_start === startIso,
        ).length;
        currentBySurvey.set(s.id, count);
      });

      return surveys.map((s) => ({
        id: s.id,
        company_id: s.company_id,
        created_by: s.created_by,
        name: s.name,
        question: s.question,
        question_type: s.question_type,
        frequency: s.frequency,
        day_of_week: s.day_of_week,
        day_of_month: s.day_of_month,
        send_hour_utc: s.send_hour_utc,
        target_departments: s.target_departments ?? [],
        target_teams: s.target_teams ?? [],
        target_all: s.target_all,
        active: s.active,
        require_comment_below: s.require_comment_below,
        anonymous: s.anonymous,
        last_dispatched_at: s.last_dispatched_at,
        created_at: s.created_at,
        updated_at: s.updated_at,
        response_count_current_period: currentBySurvey.get(s.id) ?? 0,
        has_responses: (totalBySurvey.get(s.id) ?? 0) > 0,
      }));
    },
    enabled: !!companyId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [PULSE_QUERY_KEY] });
  };

  const createPulse = useMutation({
    mutationFn: async (input: PulseSurveyFormValues) => {
      if (!companyId) throw new Error("Empresa não identificada.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");
      const { data, error } = await supabase
        .from("pulse_surveys")
        .insert({
          company_id: companyId,
          created_by: user.id,
          name: input.name,
          question: input.question,
          question_type: input.question_type,
          frequency: input.frequency,
          day_of_week: input.day_of_week,
          day_of_month: input.day_of_month,
          send_hour_utc: input.send_hour_utc,
          target_departments: input.target_departments,
          target_teams: input.target_teams,
          target_all: input.target_all,
          anonymous: input.anonymous,
          require_comment_below:
            input.question_type === "mood_emoji" ? null : input.require_comment_below,
          active: input.active,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      trackEvent("pulse_survey_created", {
        frequency: vars.frequency,
        question_type: vars.question_type,
        anonymous: vars.anonymous,
      });
      toast.success("Pesquisa Pulse criada");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao criar pesquisa Pulse");
    },
  });

  const updatePulse = useMutation({
    mutationFn: async (input: PulseSurveyFormValues & { id: string }) => {
      const { data, error } = await supabase
        .from("pulse_surveys")
        .update({
          name: input.name,
          question: input.question,
          question_type: input.question_type,
          frequency: input.frequency,
          day_of_week: input.day_of_week,
          day_of_month: input.day_of_month,
          send_hour_utc: input.send_hour_utc,
          target_departments: input.target_departments,
          target_teams: input.target_teams,
          target_all: input.target_all,
          anonymous: input.anonymous,
          require_comment_below:
            input.question_type === "mood_emoji" ? null : input.require_comment_below,
          active: input.active,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      trackEvent("pulse_survey_updated");
      toast.success("Pesquisa atualizada");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao atualizar pesquisa");
    },
  });

  const togglePulse = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("pulse_surveys")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
      return { id, active };
    },
    onSuccess: ({ active }) => {
      trackEvent("pulse_survey_toggled", { active });
      toast.success(active ? "Pesquisa ativada" : "Pesquisa pausada");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao alternar pesquisa");
    },
  });

  const deletePulse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pulse_surveys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      trackEvent("pulse_survey_deleted");
      toast.success("Pesquisa removida");
      invalidate();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Erro ao remover pesquisa");
    },
  });

  return {
    pulseSurveys: surveysQuery.data ?? [],
    isLoading: surveysQuery.isLoading,
    isError: surveysQuery.isError,
    error: surveysQuery.error as Error | null,
    refetch: surveysQuery.refetch,
    createPulse,
    updatePulse,
    togglePulse,
    deletePulse,
  };
}

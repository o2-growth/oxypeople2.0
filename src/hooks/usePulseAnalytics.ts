import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { calcEnps, type EnpsBreakdown } from "@/lib/pulse/enpsCalc";

export interface PulseAnalyticsFilters {
  departmentIds: string[];
  teamIds: string[];
  /** Quantos períodos passados retornar (default 12) */
  periodsBack?: number;
}

export interface PulseAnalyticsRow {
  period_start: string;
  count: number;
  avg: number;
  enps?: EnpsBreakdown;
  withCommentPct: number;
}

export interface PulseAnalyticsResponse {
  loading: boolean;
  pulse: {
    id: string;
    name: string;
    question: string;
    question_type: "scale_1_5" | "enps_0_10" | "mood_emoji";
    frequency: "weekly" | "biweekly" | "monthly";
    anonymous: boolean;
    target_all: boolean;
    target_departments: string[];
    target_teams: string[];
  } | null;
  periods: PulseAnalyticsRow[];
  comments: Array<{
    id: string;
    period_start: string;
    score: number;
    comment: string;
    author: { id: string; full_name: string | null; avatar_url: string | null } | null;
  }>;
  totalEligible: number;
  currentResponseRate: number;
  /** Bloqueado quando anônimo + < 5 respondentes únicos */
  blockedAnonymity: boolean;
  currentEnps?: EnpsBreakdown;
}

export const PULSE_ANALYTICS_KEY = "pulse-analytics";

interface PulseRow {
  id: string;
  company_id: string;
  name: string;
  question: string;
  question_type: string;
  frequency: string;
  anonymous: boolean;
  target_all: boolean;
  target_departments: string[] | null;
  target_teams: string[] | null;
}

interface ResponseRow {
  id: string;
  user_id: string | null;
  period_start: string;
  score: number;
  comment: string | null;
  created_at: string;
}

const ANONYMITY_THRESHOLD = 5;

export function usePulseAnalytics(pulseId: string | undefined, filters: PulseAnalyticsFilters) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const pulseQuery = useQuery({
    queryKey: [PULSE_ANALYTICS_KEY, "pulse", pulseId],
    queryFn: async (): Promise<PulseRow | null> => {
      if (!pulseId) return null;
      const { data, error } = await supabase
        .from("pulse_surveys")
        .select(
          "id, company_id, name, question, question_type, frequency, anonymous, target_all, target_departments, target_teams",
        )
        .eq("id", pulseId)
        .maybeSingle();
      if (error) throw error;
      return data as PulseRow | null;
    },
    enabled: !!pulseId,
  });

  const responsesQuery = useQuery({
    queryKey: [PULSE_ANALYTICS_KEY, "responses", pulseId],
    queryFn: async (): Promise<ResponseRow[]> => {
      if (!pulseId) return [];
      const { data, error } = await supabase
        .from("pulse_responses")
        .select("id, user_id, period_start, score, comment, created_at")
        .eq("pulse_survey_id", pulseId)
        .order("period_start", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ResponseRow[];
    },
    enabled: !!pulseId,
  });

  // Para drilldown de comentários: precisamos do nome dos usuários (se não anônimo)
  const userIds = useMemo(() => {
    const set = new Set<string>();
    (responsesQuery.data ?? []).forEach((r) => {
      if (r.user_id) set.add(r.user_id);
    });
    return Array.from(set);
  }, [responsesQuery.data]);

  const usersQuery = useQuery({
    queryKey: [PULSE_ANALYTICS_KEY, "users", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [] as Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        department_id: string | null;
      }>;
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, avatar_url")
        .in("id", userIds);
      if (error) throw error;
      // Departments via memberships
      const { data: memberships } = await supabase
        .from("company_memberships")
        .select("user_id, department_id, team_id")
        .in("user_id", userIds)
        .eq("company_id", companyId ?? "");
      const deptByUser = new Map<string, string | null>();
      const teamByUser = new Map<string, string | null>();
      (memberships ?? []).forEach((m) => {
        deptByUser.set(m.user_id, m.department_id);
        teamByUser.set(m.user_id, m.team_id);
      });
      return (data ?? []).map((u) => ({
        ...u,
        department_id: deptByUser.get(u.id) ?? null,
        team_id: teamByUser.get(u.id) ?? null,
      })) as Array<{
        id: string;
        full_name: string | null;
        avatar_url: string | null;
        department_id: string | null;
        team_id: string | null;
      }>;
    },
    enabled: userIds.length > 0 && !!companyId,
  });

  // Total esperado de respondentes (eligible) — depende de target_all/depts/teams
  const eligibleQuery = useQuery({
    queryKey: [PULSE_ANALYTICS_KEY, "eligible", pulseId, companyId],
    queryFn: async () => {
      if (!pulseQuery.data || !companyId) return 0;
      const p = pulseQuery.data;
      let q = supabase
        .from("company_memberships")
        .select("user_id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active");
      if (!p.target_all) {
        const orFilters: string[] = [];
        if (p.target_departments?.length) {
          orFilters.push(`department_id.in.(${p.target_departments.join(",")})`);
        }
        if (p.target_teams?.length) {
          orFilters.push(`team_id.in.(${p.target_teams.join(",")})`);
        }
        if (orFilters.length === 0) return 0;
        q = q.or(orFilters.join(","));
      }
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!pulseQuery.data && !!companyId,
  });

  const result = useMemo<PulseAnalyticsResponse>(() => {
    const pulse = pulseQuery.data;
    if (!pulse) {
      return {
        loading: pulseQuery.isLoading || responsesQuery.isLoading,
        pulse: null,
        periods: [],
        comments: [],
        totalEligible: 0,
        currentResponseRate: 0,
        blockedAnonymity: false,
      };
    }

    const usersById = new Map<
      string,
      { id: string; full_name: string | null; avatar_url: string | null; department_id: string | null; team_id: string | null }
    >();
    (usersQuery.data ?? []).forEach((u) => usersById.set(u.id, u));

    // Aplica filtros (department/team) sobre as respostas — só para identificadas
    const filtered = (responsesQuery.data ?? []).filter((r) => {
      if (filters.departmentIds.length === 0 && filters.teamIds.length === 0) return true;
      if (!r.user_id) return false;
      const u = usersById.get(r.user_id);
      if (!u) return false;
      if (filters.departmentIds.length > 0 && (!u.department_id || !filters.departmentIds.includes(u.department_id))) {
        return false;
      }
      if (filters.teamIds.length > 0 && (!u.team_id || !filters.teamIds.includes(u.team_id))) {
        return false;
      }
      return true;
    });

    // Limite período
    const periodsBack = filters.periodsBack ?? 12;
    const groupedAll = new Map<string, ResponseRow[]>();
    filtered.forEach((r) => {
      const arr = groupedAll.get(r.period_start) ?? [];
      arr.push(r);
      groupedAll.set(r.period_start, arr);
    });
    const periodKeys = Array.from(groupedAll.keys()).sort();
    const limitedKeys = periodKeys.slice(-periodsBack);

    const periods: PulseAnalyticsRow[] = limitedKeys.map((key) => {
      const responses = groupedAll.get(key) ?? [];
      const scores = responses.map((r) => r.score);
      const avg =
        scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
      const withComment = responses.filter((r) => r.comment && r.comment.trim().length > 0).length;
      const withCommentPct = responses.length > 0 ? Math.round((withComment / responses.length) * 100) : 0;

      const row: PulseAnalyticsRow = {
        period_start: key,
        count: responses.length,
        avg,
        withCommentPct,
      };
      if (pulse.question_type === "enps_0_10") {
        row.enps = calcEnps(scores);
      }
      return row;
    });

    const comments = filtered
      .filter((r) => r.comment && r.comment.trim().length > 0)
      .map((r) => ({
        id: r.id,
        period_start: r.period_start,
        score: r.score,
        comment: r.comment ?? "",
        author: pulse.anonymous ? null : usersById.get(r.user_id ?? "") ?? null,
      }));

    // Bloqueio de anonimato: apenas se anônimo E filtro aplicado E < 5 respondentes únicos no recorte
    let blockedAnonymity = false;
    if (pulse.anonymous && (filters.departmentIds.length > 0 || filters.teamIds.length > 0)) {
      const uniqueRespondents = new Set<string>();
      filtered.forEach((r) => {
        if (r.user_id) uniqueRespondents.add(r.user_id);
      });
      // Em pulse anônimo, user_id é null por design — usamos contagem de respostas como proxy
      if (filtered.length < ANONYMITY_THRESHOLD) {
        blockedAnonymity = true;
      }
    }

    const totalEligible = eligibleQuery.data ?? 0;
    const currentPeriod = periods[periods.length - 1];
    const currentResponseRate =
      totalEligible > 0 && currentPeriod ? Math.round((currentPeriod.count / totalEligible) * 100) : 0;

    return {
      loading: pulseQuery.isLoading || responsesQuery.isLoading,
      pulse: {
        id: pulse.id,
        name: pulse.name,
        question: pulse.question,
        question_type: pulse.question_type as "scale_1_5" | "enps_0_10" | "mood_emoji",
        frequency: pulse.frequency as "weekly" | "biweekly" | "monthly",
        anonymous: pulse.anonymous,
        target_all: pulse.target_all,
        target_departments: pulse.target_departments ?? [],
        target_teams: pulse.target_teams ?? [],
      },
      periods,
      comments,
      totalEligible,
      currentResponseRate,
      blockedAnonymity,
      currentEnps: currentPeriod?.enps,
    };
  }, [
    pulseQuery.data,
    pulseQuery.isLoading,
    responsesQuery.data,
    responsesQuery.isLoading,
    usersQuery.data,
    eligibleQuery.data,
    filters.departmentIds,
    filters.teamIds,
    filters.periodsBack,
  ]);

  return {
    ...result,
    isError: pulseQuery.isError || responsesQuery.isError,
    refetch: () => {
      void pulseQuery.refetch();
      void responsesQuery.refetch();
    },
  };
}

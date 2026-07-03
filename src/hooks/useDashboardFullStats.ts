import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import {
  startOfWeek,
  endOfWeek,
  subMonths,
  endOfMonth,
  format,
  differenceInMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getLevelForPoints, getNextLevel, type GamificationLevel } from "./useGamification";

export interface OKRStatusCounts {
  on_track: number;
  attention: number;
  risk: number;
  overdue: number;
  completed: number;
  total: number;
  avgProgress: number;
}

export interface NPSData {
  score: number;
  promoters: number;
  passives: number;
  detractors: number;
  totalResponses: number;
  surveyName: string;
}

export interface PerformanceData {
  activeCycles: number;
  pendingEvaluations: number;
  completionRate: number;
  averageScore: number;
}

export interface WeeklyActionsData {
  todo: number;
  doing: number;
  done: number;
  blocked: number;
  total: number;
  completionRate: number;
}

export interface HeadcountMonth {
  month: string;
  count: number;
}

export interface HeadcountData {
  monthly: HeadcountMonth[];
  current: number;
  growthPercent6m: number;
}

export interface TurnoverData {
  rate: number;
  avgTenureMonths: number;
}

export interface UserGamificationData {
  totalPoints: number;
  level: GamificationLevel;
  nextLevel: GamificationLevel | null;
  progressToNext: number;
}

export interface DashboardFullStats {
  okr: OKRStatusCounts;
  nps: NPSData;
  performance: PerformanceData;
  actions: WeeklyActionsData;
  headcount: HeadcountData;
  turnover: TurnoverData;
  gamification: UserGamificationData;
}

const emptyStats: DashboardFullStats = {
  okr: { on_track: 0, attention: 0, risk: 0, overdue: 0, completed: 0, total: 0, avgProgress: 0 },
  nps: { score: 0, promoters: 0, passives: 0, detractors: 0, totalResponses: 0, surveyName: "" },
  performance: { activeCycles: 0, pendingEvaluations: 0, completionRate: 0, averageScore: 0 },
  actions: { todo: 0, doing: 0, done: 0, blocked: 0, total: 0, completionRate: 0 },
  headcount: { monthly: [], current: 0, growthPercent6m: 0 },
  turnover: { rate: 0, avgTenureMonths: 0 },
  gamification: { totalPoints: 0, level: getLevelForPoints(0), nextLevel: getNextLevel(getLevelForPoints(0)), progressToNext: 0 },
};

export function useDashboardFullStats() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;
  const userId = profile?.id;

  return useQuery({
    queryKey: ["dashboard-full-stats", companyId, userId],
    queryFn: async (): Promise<DashboardFullStats> => {
      if (!companyId || !userId) return emptyStats;

      const now = new Date();

      const [
        objectivesRes,
        npsSurveyRes,
        cyclesRes,
        evaluationsRes,
        actionsRes,
        membershipsRes,
        pointsRes,
      ] = await Promise.all([
        // OKRs
        supabase
          .from("objectives")
          .select("auto_status, progress, status")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .is("deleted_at", null),
        // NPS - latest survey
        supabase
          .from("nps_surveys")
          .select("id, question, status")
          .eq("company_id", companyId)
          .in("status", ["active", "completed"])
          .order("created_at", { ascending: false })
          .limit(1),
        // Performance cycles
        supabase
          .from("performance_cycles")
          .select("id, status")
          .eq("company_id", companyId)
          .in("status", ["active", "scheduled"]),
        // Performance evaluations
        supabase
          .from("performance_evaluations")
          .select("status, overall_score, cycle_id")
          .eq("company_id", companyId),
        // Weekly actions
        supabase
          .from("actions")
          .select("status")
          .eq("company_id", companyId)
          .gte("created_at", startOfWeek(now, { weekStartsOn: 1 }).toISOString())
          .lte("created_at", endOfWeek(now, { weekStartsOn: 1 }).toISOString()),
        // Memberships for headcount + turnover
        supabase
          .from("company_memberships")
          .select("hire_date, status, updated_at")
          .eq("company_id", companyId),
        // Gamification points
        supabase
          .from("gamification_points")
          .select("points")
          .eq("user_id", userId)
          .eq("company_id", companyId),
      ]);

      // === OKR ===
      const objectives = objectivesRes.data || [];
      const okrCounts: OKRStatusCounts = {
        on_track: 0, attention: 0, risk: 0, overdue: 0, completed: 0, total: objectives.length, avgProgress: 0,
      };
      let progressSum = 0;
      objectives.forEach((o) => {
        const s = o.status === "completed" ? "completed" : (o.auto_status || "on_track");
        if (s in okrCounts) (okrCounts as any)[s]++;
        progressSum += o.progress || 0;
      });
      okrCounts.avgProgress = objectives.length > 0 ? Math.round(progressSum / objectives.length) : 0;

      // === NPS ===
      let npsData: NPSData = { score: 0, promoters: 0, passives: 0, detractors: 0, totalResponses: 0, surveyName: "" };
      const latestSurvey = npsSurveyRes.data?.[0];
      if (latestSurvey) {
        const { data: responses } = await supabase
          .from("nps_responses")
          .select("score")
          .eq("survey_id", latestSurvey.id);
        
        const r = responses || [];
        const promoters = r.filter((x) => x.score >= 9).length;
        const detractors = r.filter((x) => x.score <= 6).length;
        const passives = r.length - promoters - detractors;
        const npsScore = r.length > 0 ? Math.round(((promoters - detractors) / r.length) * 100) : 0;
        npsData = {
          score: npsScore,
          promoters,
          passives,
          detractors,
          totalResponses: r.length,
          surveyName: latestSurvey.question?.substring(0, 40) || "Pesquisa NPS",
        };
      }

      // === Performance ===
      const activeCycles = cyclesRes.data?.length || 0;
      const evals = evaluationsRes.data || [];
      const activeCycleIds = new Set((cyclesRes.data || []).map((c) => c.id));
      const activeEvals = evals.filter((e) => activeCycleIds.has(e.cycle_id));
      const pendingEvals = activeEvals.filter((e) => e.status === "pending").length;
      const completedEvals = activeEvals.filter((e) => e.status === "completed").length;
      const completionRate = activeEvals.length > 0 ? Math.round((completedEvals / activeEvals.length) * 100) : 0;
      const scoredEvals = activeEvals.filter((e) => e.overall_score != null);
      const averageScore = scoredEvals.length > 0
        ? parseFloat((scoredEvals.reduce((s, e) => s + (e.overall_score || 0), 0) / scoredEvals.length).toFixed(1))
        : 0;

      // === Actions ===
      const acts = actionsRes.data || [];
      const actionCounts: WeeklyActionsData = {
        todo: acts.filter((a) => a.status === "todo").length,
        doing: acts.filter((a) => a.status === "doing").length,
        done: acts.filter((a) => a.status === "done").length,
        blocked: acts.filter((a) => a.status === "blocked").length,
        total: acts.length,
        completionRate: acts.length > 0 ? Math.round((acts.filter((a) => a.status === "done").length / acts.length) * 100) : 0,
      };

      // === Headcount (12 months) ===
      const memberships = (membershipsRes.data || []).filter((m) => m.hire_date);
      const monthly: HeadcountMonth[] = [];
      for (let i = 11; i >= 0; i--) {
        const targetDate = endOfMonth(subMonths(now, i));
        const count = memberships.filter((m) => {
          const hireDate = new Date(m.hire_date!);
          if (hireDate > targetDate) return false;
          if (m.status === "inactive" && m.updated_at) {
            return new Date(m.updated_at) > targetDate;
          }
          return m.status === "active";
        }).length;
        monthly.push({ month: format(targetDate, "MMM/yy", { locale: ptBR }), count });
      }
      // Current headcount must count EVERY active member — even those without a
      // hire_date (which are excluded from the historical monthly series above).
      const currentCount = (membershipsRes.data || []).filter((m) => m.status === "active").length;
      const sixMonthsAgo = monthly[5]?.count || 0;
      const growthPercent6m = sixMonthsAgo > 0 ? Math.round(((currentCount - sixMonthsAgo) / sixMonthsAgo) * 100) : 0;

      // === Turnover ===
      const allMembers = membershipsRes.data || [];
      const activeMembers = allMembers.filter((m) => m.status === "active");
      const inactiveMembers = allMembers.filter((m) => m.status === "inactive");
      const turnoverRate = activeMembers.length > 0
        ? Math.round((inactiveMembers.length / (activeMembers.length + inactiveMembers.length)) * 100)
        : 0;
      const tenures = activeMembers
        .filter((m) => m.hire_date)
        .map((m) => differenceInMonths(now, new Date(m.hire_date!)));
      const avgTenureMonths = tenures.length > 0
        ? Math.round(tenures.reduce((a, b) => a + b, 0) / tenures.length)
        : 0;

      // === Gamification ===
      const totalPoints = (pointsRes.data || []).reduce((s, p) => s + p.points, 0);
      const level = getLevelForPoints(totalPoints);
      const nextLvl = getNextLevel(level);
      const progressToNext = nextLvl
        ? Math.round(((totalPoints - level.min_points) / (nextLvl.min_points - level.min_points)) * 100)
        : 100;

      return {
        okr: okrCounts,
        nps: npsData,
        performance: { activeCycles, pendingEvaluations: pendingEvals, completionRate, averageScore },
        actions: actionCounts,
        headcount: { monthly, current: currentCount, growthPercent6m },
        turnover: { rate: turnoverRate, avgTenureMonths },
        gamification: { totalPoints, level, nextLevel: nextLvl, progressToNext },
      };
    },
    enabled: !!companyId && !!userId,
  });
}

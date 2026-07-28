import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth, parseISO, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DeptRow {
  dept_id: string | null;
  dept_name: string;
  people_count: number;
  active_count: number;
  completed_count: number;
  avg_progress: number;
  coverage_pct: number;
}

export interface TopCompetency {
  name: string;
  count: number;
}

export interface MonthlyPoint {
  month: string;
  created: number;
  active: number;
  completed: number;
}

export interface AtRiskPlan {
  id: string;
  title: string;
  user_id: string;
  user_name: string | null;
  progress: number;
  target_date: string;
  days_until_target: number;
}

export interface PDIDashboardData {
  totalActive: number;
  onTimePct: number;
  avgProgress: number;
  pendingApprovalOver14d: number;
  deptRows: DeptRow[];
  topCompetencies: TopCompetency[];
  monthlyTrend: MonthlyPoint[];
  atRisk: AtRiskPlan[];
}

interface PlanRow {
  id: string;
  company_id: string;
  user_id: string;
  status: string;
  title: string;
  progress: number;
  target_date: string | null;
  approval_requested_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface MembershipRow {
  user_id: string;
  department: string | null;
  department_id: string | null;
  departments: { id: string; name: string } | null;
  users: { id: string; full_name: string | null } | null;
}

interface CompetencyRow {
  name: string;
  pdi_plan_id: string;
}

function daysBetween(targetDate: string): number {
  return Math.ceil((parseISO(targetDate).getTime() - Date.now()) / 86400000);
}

async function fetchDashboardData(companyId: string): Promise<PDIDashboardData> {
  // Query 1: all plans for company
  const { data: plansData, error: plansError } = await supabase
    .from("pdi_plans" as never)
    .select("id, company_id, user_id, status, title, progress, target_date, approval_requested_at, approved_at, completed_at, created_at")
    .eq("company_id", companyId);

  if (plansError) throw plansError;
  const plans = (plansData ?? []) as PlanRow[];

  // Query 2: memberships + user + dept
  const { data: membershipsData, error: membershipsError } = await supabase
    .from("company_memberships")
    .select("user_id, department, department_id, departments!company_memberships_department_id_fkey(id, name), users!company_memberships_user_id_fkey(id, full_name)")
    .eq("company_id", companyId)
    .eq("status", "active");

  if (membershipsError) throw membershipsError;
  const memberships = (membershipsData ?? []) as unknown as MembershipRow[];

  // Query 3: competencies for active+completed plans
  const relevantPlanIds = plans
    .filter((p) => p.status === "active" || p.status === "completed")
    .map((p) => p.id);

  let competencies: CompetencyRow[] = [];
  if (relevantPlanIds.length > 0) {
    const { data: compData, error: compError } = await supabase
      .from("pdi_competencies" as never)
      .select("name, pdi_plan_id")
      .in("pdi_plan_id", relevantPlanIds);
    if (compError) throw compError;
    competencies = (compData ?? []) as CompetencyRow[];
  }

  // --- Aggregations ---

  // KPIs
  const activePlans = plans.filter((p) => p.status === "active");
  const totalActive = activePlans.length;

  const completedPlans = plans.filter((p) => p.status === "completed");
  const totalCompleted = completedPlans.length;
  const completedOnTime = completedPlans.filter(
    (p) =>
      p.completed_at != null &&
      p.target_date != null &&
      p.completed_at <= p.target_date,
  ).length;
  const onTimePct = totalCompleted > 0 ? Math.round((completedOnTime / totalCompleted) * 100) : 0;

  const avgProgress =
    activePlans.length > 0
      ? activePlans.reduce((sum, p) => sum + (p.progress ?? 0), 0) / activePlans.length
      : 0;

  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
  const pendingApprovalOver14d = plans.filter(
    (p) =>
      p.approval_requested_at != null &&
      p.approved_at == null &&
      p.approval_requested_at < fourteenDaysAgo,
  ).length;

  // At-risk: active, target_date exists, days <= 30, progress < 50
  const userNameById = new Map<string, string | null>();
  memberships.forEach((m) => {
    if (m.users) userNameById.set(m.users.id, m.users.full_name);
  });

  const atRisk: AtRiskPlan[] = activePlans
    .filter((p) => {
      if (!p.target_date) return false;
      const days = daysBetween(p.target_date);
      return days <= 30 && (p.progress ?? 0) < 50;
    })
    .map((p) => ({
      id: p.id,
      title: p.title,
      user_id: p.user_id,
      user_name: userNameById.get(p.user_id) ?? null,
      progress: p.progress ?? 0,
      target_date: p.target_date!,
      days_until_target: daysBetween(p.target_date!),
    }))
    .sort((a, b) => a.days_until_target - b.days_until_target);

  // Department rows
  type DeptAccumulator = {
    dept_id: string | null;
    dept_name: string;
    user_ids: Set<string>;
  };
  const deptMap = new Map<string, DeptAccumulator>();

  memberships.forEach((m) => {
    const key = m.department_id ?? "__null__";
    if (!deptMap.has(key)) {
      const dept_name =
        m.departments?.name ?? m.department ?? "Sem área";
      deptMap.set(key, {
        dept_id: m.department_id ?? null,
        dept_name,
        user_ids: new Set(),
      });
    }
    deptMap.get(key)!.user_ids.add(m.user_id);
  });

  const plansByUser = new Map<string, PlanRow[]>();
  plans.forEach((p) => {
    const arr = plansByUser.get(p.user_id) ?? [];
    arr.push(p);
    plansByUser.set(p.user_id, arr);
  });

  const deptRows: DeptRow[] = Array.from(deptMap.values())
    .map((dept) => {
      const people_count = dept.user_ids.size;
      let active_count = 0;
      let completed_count = 0;
      let total_progress = 0;
      let active_with_progress = 0;

      dept.user_ids.forEach((uid) => {
        const userPlans = plansByUser.get(uid) ?? [];
        userPlans.forEach((p) => {
          if (p.status === "active") {
            active_count++;
            total_progress += p.progress ?? 0;
            active_with_progress++;
          } else if (p.status === "completed") {
            completed_count++;
          }
        });
      });

      const avg_progress =
        active_with_progress > 0 ? total_progress / active_with_progress : 0;
      const coverage_pct =
        people_count > 0 ? (active_count / people_count) * 100 : 0;

      return {
        dept_id: dept.dept_id,
        dept_name: dept.dept_name,
        people_count,
        active_count,
        completed_count,
        avg_progress,
        coverage_pct,
      };
    })
    .sort((a, b) => b.coverage_pct - a.coverage_pct);

  // Top competencies
  const compCountMap = new Map<string, number>();
  competencies.forEach((c) => {
    const key = c.name.toLowerCase().trim();
    compCountMap.set(key, (compCountMap.get(key) ?? 0) + 1);
  });

  const topCompetencies: TopCompetency[] = Array.from(compCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Monthly trend: 12 months
  const now = new Date();
  const monthlyTrend: MonthlyPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate).toISOString();
    const monthEnd = endOfMonth(monthDate).toISOString();
    const monthLabel = format(monthDate, "MMM", { locale: ptBR });

    const created = plans.filter(
      (p) => p.created_at >= monthStart && p.created_at <= monthEnd,
    ).length;

    const active = plans.filter(
      (p) =>
        p.status === "active" &&
        p.created_at <= monthEnd,
    ).length;

    const completed = plans.filter(
      (p) =>
        p.status === "completed" &&
        p.completed_at != null &&
        p.completed_at >= monthStart &&
        p.completed_at <= monthEnd,
    ).length;

    monthlyTrend.push({ month: monthLabel, created, active, completed });
  }

  return {
    totalActive,
    onTimePct,
    avgProgress,
    pendingApprovalOver14d,
    deptRows,
    topCompetencies,
    monthlyTrend,
    atRisk,
  };
}

export function usePDIDashboard(companyId: string) {
  const query = useQuery({
    queryKey: ["pdi-dashboard", companyId],
    queryFn: () => fetchDashboardData(companyId),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

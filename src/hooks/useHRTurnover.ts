import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import {
  format,
  parseISO,
  differenceInMonths,
  subMonths,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export interface TurnoverMonth {
  month: string;
  admissions: number;
  departures: number;
}

export interface TurnoverByDepartment {
  department: string;
  active: number;
  inactive: number;
  color: string;
}

export interface TurnoverMetrics {
  turnoverRate: number;
  avgTenureMonths: number;
  totalAdmissions: number;
  totalDepartures: number;
  monthlyData: TurnoverMonth[];
  departmentData: TurnoverByDepartment[];
}

export function useHRTurnover() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["hr-turnover", companyId],
    queryFn: async (): Promise<TurnoverMetrics> => {
      if (!companyId) {
        return {
          turnoverRate: 0,
          avgTenureMonths: 0,
          totalAdmissions: 0,
          totalDepartures: 0,
          monthlyData: [],
          departmentData: [],
        };
      }

      const { data: memberships, error } = await supabase
        .from("company_memberships")
        .select("*, department_info:departments(id, name, color)")
        .eq("company_id", companyId);

      if (error) throw error;

      const now = new Date();
      const activeMembers = memberships?.filter((m) => m.status === "active") || [];
      const inactiveMembers = memberships?.filter((m) => m.status === "inactive") || [];

      // Monthly data for last 6 months
      const monthlyData: TurnoverMonth[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthKey = format(monthStart, "yyyy-MM");
        const monthLabel = format(monthStart, "MMM/yy", { locale: ptBR });

        const admissions = memberships?.filter((m) => {
          if (!m.hire_date) return false;
          return format(parseISO(m.hire_date), "yyyy-MM") === monthKey;
        }).length || 0;

        const departures = memberships?.filter((m) => {
          if (m.status !== "inactive" || !m.updated_at) return false;
          return format(new Date(m.updated_at), "yyyy-MM") === monthKey;
        }).length || 0;

        monthlyData.push({ month: monthLabel, admissions, departures });
      }

      // Turnover rate
      const totalActive = activeMembers.length;
      const totalDepartures = inactiveMembers.length;
      const turnoverRate = totalActive > 0
        ? Math.round((totalDepartures / (totalActive + totalDepartures)) * 100)
        : 0;

      // Average tenure
      const tenures = activeMembers
        .filter((m) => m.hire_date)
        .map((m) => differenceInMonths(now, parseISO(m.hire_date!)));
      const avgTenureMonths = tenures.length > 0
        ? Math.round(tenures.reduce((a, b) => a + b, 0) / tenures.length)
        : 0;

      // Total admissions (members with hire_date)
      const totalAdmissions = memberships?.filter((m) => m.hire_date).length || 0;

      // By department
      const deptMap = new Map<string, { active: number; inactive: number; color: string }>();
      memberships?.forEach((m) => {
        const deptName = (m.department_info as any)?.name || "Sem área";
        const deptColor = (m.department_info as any)?.color || "#6B7280";
        if (!deptMap.has(deptName)) {
          deptMap.set(deptName, { active: 0, inactive: 0, color: deptColor });
        }
        const entry = deptMap.get(deptName)!;
        if (m.status === "active") entry.active++;
        else if (m.status === "inactive") entry.inactive++;
      });

      const departmentData: TurnoverByDepartment[] = Array.from(deptMap.entries())
        .map(([department, data]) => ({ department, ...data }))
        .sort((a, b) => b.active - a.active);

      return {
        turnoverRate,
        avgTenureMonths,
        totalAdmissions,
        totalDepartures,
        monthlyData,
        departmentData,
      };
    },
    enabled: !!companyId,
  });
}

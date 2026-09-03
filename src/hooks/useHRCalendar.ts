import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import {
  addDays,
  parseISO,
  format,
  getMonth,
  getDate,
  isWithinInterval,
  startOfDay,
  endOfMonth,
  endOfWeek,
  startOfWeek,
} from "date-fns";

export type HREventType =
  | "birthday"
  | "work_anniversary"
  | "experience_end"
  | "contract_expiry";

export interface HREvent {
  id: string;
  type: HREventType;
  date: Date;
  userName: string;
  avatarUrl: string | null;
  description: string;
  department: string | null;
  /** Anos completos de casa — só no o2versário. */
  years?: number;
}

export function useHRCalendar(filter: "all" | "week" | "month" = "month") {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["hr-calendar", companyId, filter],
    queryFn: async (): Promise<HREvent[]> => {
      if (!companyId) return [];

      const { data: memberships, error } = await supabase
        .from("company_memberships")
        .select(`
          *,
          user:users!company_memberships_user_id_fkey(id, full_name, avatar_url, birth_date),
          department_info:departments(name)
        `)
        .eq("company_id", companyId)
        .eq("status", "active");

      if (error) throw error;

      const now = new Date();
      const events: HREvent[] = [];

      const getInterval = () => {
        if (filter === "week") {
          return {
            start: startOfWeek(now, { weekStartsOn: 1 }),
            end: endOfWeek(now, { weekStartsOn: 1 }),
          };
        }
        return {
          start: startOfDay(now),
          end: endOfMonth(now),
        };
      };

      const interval = getInterval();

      memberships?.forEach((m) => {
        const user = m.user as any;
        const deptName = (m.department_info as any)?.name || null;
        const userName = user?.full_name || "Sem nome";
        const avatarUrl = user?.avatar_url || null;

        // Birthday
        if (user?.birth_date) {
          const bd = parseISO(user.birth_date);
          const thisYearBirthday = new Date(now.getFullYear(), getMonth(bd), getDate(bd));
          if (isWithinInterval(thisYearBirthday, interval)) {
            events.push({
              id: `bd-${m.user_id}`,
              type: "birthday",
              date: thisYearBirthday,
              userName,
              avatarUrl,
              description: `Aniversário de ${userName}`,
              department: deptName,
            });
          }
        }

        // O2versário — anos completos de casa. O Feedz publicava isso todo ano
        // ("completa hoje mais um ano na nossa empresa") e era o que sumiu na
        // migração: o calendário sabia o aniversário de nascimento e ignorava
        // o de casa.
        if (m.hire_date) {
          const admissao = parseISO(m.hire_date);
          const noAno = new Date(now.getFullYear(), getMonth(admissao), getDate(admissao));
          const anos = now.getFullYear() - admissao.getFullYear();
          // Ano zero é boas-vindas, não o2versário.
          if (anos >= 1 && isWithinInterval(noAno, interval)) {
            events.push({
              id: `wa-${m.id}`,
              type: "work_anniversary",
              date: noAno,
              userName,
              avatarUrl,
              description: `${userName} completa ${anos} ${anos === 1 ? "ano" : "anos"} de O2`,
              department: deptName,
              years: anos,
            });
          }
        }

        // Experience period end (90 days after hire)
        if (m.hire_date) {
          const experienceEnd = addDays(parseISO(m.hire_date), 90);
          if (experienceEnd >= now && isWithinInterval(experienceEnd, interval)) {
            events.push({
              id: `exp-${m.id}`,
              type: "experience_end",
              date: experienceEnd,
              userName,
              avatarUrl,
              description: `Fim do período de experiência de ${userName}`,
              department: deptName,
            });
          }
        }

        // Temporary contract expiry (for 'Temporário' type, assume 180 days from hire)
        if (m.employment_type === "Temporário" && m.hire_date) {
          const contractEnd = addDays(parseISO(m.hire_date), 180);
          if (contractEnd >= now && isWithinInterval(contractEnd, interval)) {
            events.push({
              id: `ctr-${m.id}`,
              type: "contract_expiry",
              date: contractEnd,
              userName,
              avatarUrl,
              description: `Vencimento do contrato temporário de ${userName}`,
              department: deptName,
            });
          }
        }
      });

      return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    },
    enabled: !!companyId,
  });
}

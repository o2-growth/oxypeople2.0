import { useMemo } from "react";
import { startOfWeek, endOfWeek } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useIsManager, type DirectReport } from "@/hooks/useIsManager";
import { useObjectives } from "@/hooks/useObjectives";
import { useOneOnOnes, type OneOnOneRow } from "@/hooks/useOneOnOnes";
import { useOkrSettings } from "@/hooks/useCheckins";

/**
 * Agregador LEVE do "Painel do Time" (Onda 3 — §3.2, visão gestor/admin).
 *
 * Estilo "Mural do Gestor" (Feedz) / "My Team Dashboard" (15Five): compõe os
 * liderados diretos (useIsManager → company_memberships.manager_id) com os
 * objetivos da empresa (useObjectives) e as 1:1s (useOneOnOnes) já em cache —
 * SEM query nova. Deriva progresso de OKR por liderado, check-ins atrasados do
 * time e as 1:1s da semana.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_OVERDUE_DAYS = 7;

export interface TeamReportSummary {
  report: DirectReport;
  objectivesCount: number;
  /** Progresso médio (0-100) dos objetivos do liderado. */
  avgProgress: number;
  overdueCheckins: number;
  nextOneOnOneAt: string | null;
}

export interface UseTeamPanelResult {
  reports: TeamReportSummary[];
  reportsCount: number;
  meetingsThisWeek: OneOnOneRow[];
  totalOverdueCheckins: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useTeamPanel(): UseTeamPanelResult {
  const { user } = useAuth();
  const meId = user?.id ?? null;

  const { directReports, isLoading: reportsLoading } = useIsManager();
  const objectivesQ = useObjectives();
  const oneOnOnesQ = useOneOnOnes().list;
  const settingsQ = useOkrSettings();

  const overdueDays = settingsQ.data?.checkin_overdue_days ?? DEFAULT_OVERDUE_DAYS;

  const reports = useMemo<TeamReportSummary[]>(() => {
    const objectives = objectivesQ.data ?? [];
    const meetings = oneOnOnesQ.data ?? [];
    const threshold = Date.now() - overdueDays * DAY_MS;
    const now = Date.now();

    return directReports.map((report) => {
      const own = objectives.filter(
        (o) =>
          (o.owner_id === report.id || o.assignee_id === report.id) &&
          o.status !== "canceled",
      );
      const avgProgress = own.length
        ? Math.round(own.reduce((acc, o) => acc + (o.progress ?? 0), 0) / own.length)
        : 0;

      let overdueCheckins = 0;
      for (const o of objectives) {
        if (o.status === "completed" || o.status === "canceled") continue;
        for (const kr of o.key_results ?? []) {
          const ownerId = kr.owner_user_id ?? o.owner_id;
          if (ownerId !== report.id) continue;
          if (kr.status === "completed" || kr.status === "canceled") continue;
          const last = kr.last_checkin_at ? new Date(kr.last_checkin_at).getTime() : null;
          if (last === null || last < threshold) overdueCheckins++;
        }
      }

      const nextMeeting = meetings
        .filter(
          (m) =>
            m.status === "scheduled" &&
            m.leader_id === meId &&
            m.member_id === report.id &&
            new Date(m.scheduled_at).getTime() >= now,
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
        )[0];

      return {
        report,
        objectivesCount: own.length,
        avgProgress,
        overdueCheckins,
        nextOneOnOneAt: nextMeeting?.scheduled_at ?? null,
      };
    });
  }, [directReports, objectivesQ.data, oneOnOnesQ.data, overdueDays, meId]);

  const meetingsThisWeek = useMemo<OneOnOneRow[]>(() => {
    const meetings = oneOnOnesQ.data ?? [];
    if (!meId) return [];
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return meetings
      .filter((m) => {
        if (m.leader_id !== meId) return false;
        const when = new Date(m.scheduled_at);
        return when >= start && when <= end;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
      );
  }, [oneOnOnesQ.data, meId]);

  const totalOverdueCheckins = useMemo(
    () => reports.reduce((acc, r) => acc + r.overdueCheckins, 0),
    [reports],
  );

  return {
    reports,
    reportsCount: directReports.length,
    meetingsThisWeek,
    totalOverdueCheckins,
    isLoading:
      reportsLoading ||
      objectivesQ.isLoading ||
      oneOnOnesQ.isLoading ||
      settingsQ.isLoading,
    isError: objectivesQ.isError || oneOnOnesQ.isError,
    refetch: () => {
      objectivesQ.refetch();
      oneOnOnesQ.refetch();
    },
  };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getISOWeek, getISOWeekYear, parseISO, subWeeks, startOfWeek, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MeetingRow {
  id: string;
  leader_id: string;
  member_id: string;
  scheduled_at: string;
  status: string;
  leader: { id: string; full_name: string | null } | null;
  member: { id: string; full_name: string | null } | null;
}

export interface LeaderStat {
  leader_id: string;
  leader_name: string;
  direct_reports: number;
  scheduled: number;
  completed: number;
  completion_pct: number;
  last_meeting_at: string | null;
  no_recent: boolean; // true → yellow row + badge
}

export interface TrendPoint {
  weekLabel: string;
  scheduled: number;
  completed: number;
}

export interface OneOnOnesDashboardData {
  meetings: MeetingRow[];
  leaderStats: LeaderStat[];
  trendData: TrendPoint[];
  totalMeetings: number;
  completedPct: number;
  canceledOrNoShowPct: number;
  activeLeaders: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoWeekKey(dateStr: string): string {
  const d = parseISO(dateStr);
  const week = getISOWeek(d);
  const year = getISOWeekYear(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function buildTrendData(meetings: MeetingRow[]): TrendPoint[] {
  // 12 weekly buckets ending this week
  const now = new Date();
  const buckets: TrendPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    const weekEnd = subWeeks(now, i - 1 === 0 ? -1 : i - 1);
    const weekKey = isoWeekKey(weekStart.toISOString());
    const label = format(weekStart, "dd/MM");

    const scheduled = meetings.filter((m) => {
      const mKey = isoWeekKey(m.scheduled_at);
      return mKey === weekKey;
    }).length;

    const completed = meetings.filter((m) => {
      const mKey = isoWeekKey(m.scheduled_at);
      return mKey === weekKey && m.status === "completed";
    }).length;

    void weekEnd; // used only for reference
    buckets.push({ weekLabel: label, scheduled, completed });
  }

  return buckets;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOneOnOnesDashboard(
  companyId: string | null | undefined,
  dateFrom: string,
  dateTo: string,
) {
  return useQuery({
    queryKey: ["one-on-ones-dashboard", companyId, dateFrom, dateTo],
    queryFn: async (): Promise<OneOnOnesDashboardData> => {
      if (!companyId) throw new Error("Empresa não identificada.");

      // 1. Fetch all one_on_ones in range (NO notes or topics)
      const { data: rawMeetings, error: meetingsError } = await supabase
        .from("one_on_ones")
        .select(
          "id, leader_id, member_id, scheduled_at, status, " +
            "leader:users!one_on_ones_leader_id_fkey(id, full_name), " +
            "member:users!one_on_ones_member_id_fkey(id, full_name)",
        )
        .eq("company_id", companyId)
        .gte("scheduled_at", `${dateFrom}T00:00:00`)
        .lte("scheduled_at", `${dateTo}T23:59:59`);

      if (meetingsError) throw meetingsError;

      const meetings = (rawMeetings ?? []) as unknown as MeetingRow[];

      // 2. Fetch ALL one_on_ones for the company (unbounded) to compute direct_reports
      //    (members who have had at least one meeting with this leader — best proxy
      //    since company_memberships has no manager_id column)
      const { data: allMeetingsRaw, error: allError } = await supabase
        .from("one_on_ones")
        .select("leader_id, member_id")
        .eq("company_id", companyId);

      if (allError) throw allError;

      // Build a map: leader_id → Set of distinct member_ids (all time)
      const directReportsMap = new Map<string, Set<string>>();
      for (const row of allMeetingsRaw ?? []) {
        const { leader_id, member_id } = row as { leader_id: string; member_id: string };
        if (!directReportsMap.has(leader_id)) {
          directReportsMap.set(leader_id, new Set());
        }
        directReportsMap.get(leader_id)!.add(member_id);
      }

      // 3. Aggregate client-side per leader (within the date range)
      const statsMap = new Map<
        string,
        {
          leader_id: string;
          leader_name: string;
          scheduledCount: number;
          completedCount: number;
          dates: string[];
        }
      >();

      for (const m of meetings) {
        if (!statsMap.has(m.leader_id)) {
          statsMap.set(m.leader_id, {
            leader_id: m.leader_id,
            leader_name: m.leader?.full_name ?? m.leader_id,
            scheduledCount: 0,
            completedCount: 0,
            dates: [],
          });
        }
        const entry = statsMap.get(m.leader_id)!;
        entry.scheduledCount += 1;
        if (m.status === "completed") entry.completedCount += 1;
        entry.dates.push(m.scheduled_at);
      }

      // Also add leaders who have direct_reports but no meetings in range
      for (const [leaderId] of directReportsMap) {
        if (!statsMap.has(leaderId)) {
          // We need the leader name — look for it in meetings data from allMeetingsRaw
          // We only have leader_id here. We'll fetch name lazily below if needed,
          // but let's include with unknown name for now and patch from meetings array
          statsMap.set(leaderId, {
            leader_id: leaderId,
            leader_name: leaderId, // will be patched below
            scheduledCount: 0,
            completedCount: 0,
            dates: [],
          });
        }
      }

      // Patch leader names from the main meetings list (which has names)
      for (const m of meetings) {
        const entry = statsMap.get(m.leader_id);
        if (entry && entry.leader_name === m.leader_id && m.leader?.full_name) {
          entry.leader_name = m.leader.full_name;
        }
      }

      // Determine "no recent" flag: leader has direct_reports > 0 and no meeting in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const leaderStats: LeaderStat[] = Array.from(statsMap.values())
        .map((entry) => {
          const directReports = directReportsMap.get(entry.leader_id)?.size ?? 0;
          const completionPct =
            entry.scheduledCount > 0
              ? Math.round((entry.completedCount / entry.scheduledCount) * 100)
              : 0;
          const sortedDates = [...entry.dates].sort();
          const lastMeetingAt = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

          // no_recent: has direct_reports and no meeting in last 30 days
          const hasRecentMeeting = entry.dates.some(
            (d) => parseISO(d) >= thirtyDaysAgo,
          );
          const no_recent = directReports > 0 && !hasRecentMeeting;

          return {
            leader_id: entry.leader_id,
            leader_name: entry.leader_name,
            direct_reports: directReports,
            scheduled: entry.scheduledCount,
            completed: entry.completedCount,
            completion_pct: completionPct,
            last_meeting_at: lastMeetingAt,
            no_recent,
          };
        })
        .filter((s) => s.direct_reports > 0 || s.scheduled > 0) // only include actual gestores
        .sort((a, b) => a.completion_pct - b.completion_pct); // ASC — worst first

      // 4. KPI aggregates
      const totalMeetings = meetings.length;
      const totalCompleted = meetings.filter((m) => m.status === "completed").length;
      const totalCanceledOrNoShow = meetings.filter(
        (m) => m.status === "canceled" || m.status === "no_show",
      ).length;
      const completedPct = totalMeetings > 0 ? Math.round((totalCompleted / totalMeetings) * 100) : 0;
      const canceledOrNoShowPct =
        totalMeetings > 0 ? Math.round((totalCanceledOrNoShow / totalMeetings) * 100) : 0;
      const activeLeaders = new Set(meetings.map((m) => m.leader_id)).size;

      // 5. Trend chart — 12 weekly buckets from all meetings in range
      const trendData = buildTrendData(meetings);

      return {
        meetings,
        leaderStats,
        trendData,
        totalMeetings,
        completedPct,
        canceledOrNoShowPct,
        activeLeaders,
      };
    },
    enabled: !!companyId,
  });
}

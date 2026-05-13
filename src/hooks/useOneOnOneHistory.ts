import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUser } from "@/hooks/useUser";
import type { OneOnOneRow } from "./useOneOnOnes";

export interface HistoryItem extends OneOnOneRow {
  topicCount: number;
  sharedNoteCount: number;
  myPrivateNoteCount: number;
}

const PAGE_SIZE = 25;

async function enrichWithCounts(rows: OneOnOneRow[], userId: string): Promise<HistoryItem[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [topicRes, noteRes] = await Promise.all([
    supabase.from("one_on_one_topics").select("one_on_one_id").in("one_on_one_id", ids),
    supabase
      .from("one_on_one_notes")
      .select("one_on_one_id, visibility, author_id")
      .in("one_on_one_id", ids),
  ]);

  const topicCounts: Record<string, number> = {};
  for (const t of topicRes.data ?? []) {
    topicCounts[t.one_on_one_id] = (topicCounts[t.one_on_one_id] ?? 0) + 1;
  }

  const sharedCounts: Record<string, number> = {};
  const privateCounts: Record<string, number> = {};
  for (const n of noteRes.data ?? []) {
    if (n.visibility === "shared") {
      sharedCounts[n.one_on_one_id] = (sharedCounts[n.one_on_one_id] ?? 0) + 1;
    } else if (n.author_id === userId) {
      // RLS already hides counterpart's private notes — any remaining private note is mine
      privateCounts[n.one_on_one_id] = (privateCounts[n.one_on_one_id] ?? 0) + 1;
    }
  }

  return rows.map((r) => ({
    ...r,
    topicCount: topicCounts[r.id] ?? 0,
    sharedNoteCount: sharedCounts[r.id] ?? 0,
    myPrivateNoteCount: privateCounts[r.id] ?? 0,
  }));
}

export function useOneOnOneHistory(
  counterpartFilter = "",
  statusFilter: string[] = [],
) {
  const { user } = useAuth();
  const { profile } = useUser();
  const userId = user?.id ?? "";
  const companyId = profile?.primary_company_id ?? "";
  const [visible, setVisible] = useState(PAGE_SIZE);

  const statuses =
    statusFilter.length > 0 ? statusFilter : ["completed", "canceled", "no_show"];

  const query = useQuery({
    queryKey: ["one-on-one-history", userId, companyId, statuses],
    queryFn: async (): Promise<HistoryItem[]> => {
      if (!userId || !companyId) return [];

      const { data, error } = await supabase
        .from("one_on_ones")
        .select(`
          id, company_id, leader_id, member_id, scheduled_at, duration_minutes,
          location, status, recurrence, recurrence_parent_id, completed_at,
          canceled_reason, created_at, updated_at,
          leader:users!one_on_ones_leader_id_fkey(id, full_name, avatar_url),
          member:users!one_on_ones_member_id_fkey(id, full_name, avatar_url)
        `)
        .eq("company_id", companyId)
        .in("status", statuses)
        .order("scheduled_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      const rows = (data ?? []) as unknown as OneOnOneRow[];
      return enrichWithCounts(rows, userId);
    },
    enabled: !!userId && !!companyId,
  });

  const name = counterpartFilter.trim().toLowerCase();
  const filtered = (query.data ?? []).filter((r) => {
    if (!name) return true;
    const counterpart = r.leader_id === userId ? r.member : r.leader;
    return (counterpart?.full_name ?? "").toLowerCase().includes(name);
  });

  const items = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;
  const loadMore = () => setVisible((v) => v + PAGE_SIZE);

  return { query, items, hasMore, loadMore };
}

export function usePreviousMeetings(
  oneOnOneId: string,
  leaderId: string,
  memberId: string,
) {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  return useQuery({
    queryKey: ["one-on-one-previous", oneOnOneId, leaderId, memberId],
    queryFn: async (): Promise<HistoryItem[]> => {
      if (!leaderId || !memberId || !oneOnOneId) return [];

      const { data, error } = await supabase
        .from("one_on_ones")
        .select(`
          id, company_id, leader_id, member_id, scheduled_at, duration_minutes,
          location, status, recurrence, recurrence_parent_id, completed_at,
          canceled_reason, created_at, updated_at,
          leader:users!one_on_ones_leader_id_fkey(id, full_name, avatar_url),
          member:users!one_on_ones_member_id_fkey(id, full_name, avatar_url)
        `)
        .neq("id", oneOnOneId)
        .in("status", ["completed", "canceled", "no_show"])
        .or(
          `and(leader_id.eq.${leaderId},member_id.eq.${memberId}),and(leader_id.eq.${memberId},member_id.eq.${leaderId})`,
        )
        .order("scheduled_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      const rows = (data ?? []) as unknown as OneOnOneRow[];
      return enrichWithCounts(rows, userId);
    },
    enabled: !!leaderId && !!memberId && !!oneOnOneId,
  });
}

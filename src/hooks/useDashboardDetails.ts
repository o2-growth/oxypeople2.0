import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./useUser";
import { startOfMonth, endOfMonth, subMonths, subWeeks, startOfWeek, endOfWeek } from "date-fns";

export function useCollaboratorsDetails(enabled: boolean) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["dashboard-details-collaborators", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();

      // Active members with user info
      const { data: members } = await supabase
        .from("company_memberships")
        .select(`
          user_id, position, department, hire_date, created_at,
          users!company_memberships_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);

      // Department distribution
      const { data: allMembers } = await supabase
        .from("company_memberships")
        .select("department")
        .eq("company_id", companyId)
        .eq("status", "active");

      const deptMap: Record<string, number> = {};
      (allMembers || []).forEach(m => {
        const dept = m.department || "Sem área";
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      const departments = Object.entries(deptMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // New this month
      const { count: newThisMonth } = await supabase
        .from("company_memberships")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active")
        .gte("created_at", monthStart);

      const total = allMembers?.length || 0;

      return {
        members: (members || []).map(m => ({
          id: (m.users as any)?.id,
          full_name: (m.users as any)?.full_name,
          avatar_url: (m.users as any)?.avatar_url,
          position: m.position,
          department: m.department,
        })),
        departments,
        total,
        newThisMonth: newThisMonth || 0,
      };
    },
    enabled: enabled && !!companyId,
  });
}

export function useRecognitionsDetails(enabled: boolean) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["dashboard-details-recognitions", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const now = new Date();
      const thisMonthStart = startOfMonth(now).toISOString();
      const thisMonthEnd = endOfMonth(now).toISOString();
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

      // This month count
      const { count: thisMonth } = await supabase
        .from("recognitions")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", thisMonthStart)
        .lte("created_at", thisMonthEnd);

      // Last month count
      const { count: lastMonth } = await supabase
        .from("recognitions")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", lastMonthStart)
        .lte("created_at", lastMonthEnd);

      // Recent recognitions with user info
      const { data: recent } = await supabase
        .from("recognitions")
        .select(`
          id, message, created_at, points,
          from_user:users!recognitions_from_user_id_fkey(id, full_name, avatar_url),
          to_user:users!recognitions_to_user_id_fkey(id, full_name, avatar_url),
          badge:badges(id, name, emoji)
        `)
        .eq("company_id", companyId)
        .gte("created_at", thisMonthStart)
        .order("created_at", { ascending: false })
        .limit(50);

      // Top recognized (to_user_id counts)
      const toUserCounts: Record<string, { count: number; user: any }> = {};
      (recent || []).forEach(r => {
        const u = r.to_user as any;
        if (u?.id) {
          if (!toUserCounts[u.id]) toUserCounts[u.id] = { count: 0, user: u };
          toUserCounts[u.id].count++;
        }
      });
      const topRecognized = Object.values(toUserCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top badges
      const badgeCounts: Record<string, { count: number; badge: any }> = {};
      (recent || []).forEach(r => {
        const b = r.badge as any;
        if (b?.id) {
          if (!badgeCounts[b.id]) badgeCounts[b.id] = { count: 0, badge: b };
          badgeCounts[b.id].count++;
        }
      });
      const topBadges = Object.values(badgeCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        thisMonth: thisMonth || 0,
        lastMonth: lastMonth || 0,
        topRecognized,
        topBadges,
        recent: (recent || []).slice(0, 5),
      };
    },
    enabled: enabled && !!companyId,
  });
}

export function useObjectivesDetails(enabled: boolean) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["dashboard-details-objectives", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data: objectives } = await supabase
        .from("objectives")
        .select(`
          id, title, status, progress, auto_status, updated_at,
          owner:users!objectives_owner_id_fkey(id, full_name, avatar_url)
        `)
        .eq("company_id", companyId)
        .eq("is_active", true);

      const all = objectives || [];
      const total = all.length;
      const completed = all.filter(o => o.status === "completed").length;
      const onTrack = all.filter(o => o.auto_status === "on_track" && o.status !== "completed").length;
      const attention = all.filter(o => o.auto_status === "attention").length;
      const risk = all.filter(o => o.auto_status === "risk" || o.auto_status === "overdue").length;

      const recentCompleted = all
        .filter(o => o.status === "completed")
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 5);

      const atRisk = all
        .filter(o => o.auto_status === "risk" || o.auto_status === "overdue")
        .slice(0, 3);

      return {
        total,
        completed,
        onTrack,
        attention,
        risk,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        recentCompleted,
        atRisk,
      };
    },
    enabled: enabled && !!companyId,
  });
}

export function useEngagementDetails(enabled: boolean) {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["dashboard-details-engagement", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();

      // Posts this month
      const { data: posts } = await supabase
        .from("posts")
        .select("id, author_id, created_at")
        .eq("company_id", companyId)
        .gte("created_at", monthStart);

      // Recognitions this month
      const { data: recognitions } = await supabase
        .from("recognitions")
        .select("id, from_user_id, created_at")
        .eq("company_id", companyId)
        .gte("created_at", monthStart);

      // Weekly breakdown (last 4 weeks)
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const postsInWeek = (posts || []).filter(p => {
          const d = new Date(p.created_at);
          return d >= weekStart && d <= weekEnd;
        }).length;
        const recsInWeek = (recognitions || []).filter(r => {
          const d = new Date(r.created_at);
          return d >= weekStart && d <= weekEnd;
        }).length;
        weeks.push({
          label: `Sem ${4 - i}`,
          posts: postsInWeek,
          recognitions: recsInWeek,
          total: postsInWeek + recsInWeek,
        });
      }

      // Top engaged users
      const userActivity: Record<string, { posts: number; recognitions: number }> = {};
      (posts || []).forEach(p => {
        if (!userActivity[p.author_id]) userActivity[p.author_id] = { posts: 0, recognitions: 0 };
        userActivity[p.author_id].posts++;
      });
      (recognitions || []).forEach(r => {
        if (!userActivity[r.from_user_id]) userActivity[r.from_user_id] = { posts: 0, recognitions: 0 };
        userActivity[r.from_user_id].recognitions++;
      });

      const topUserIds = Object.entries(userActivity)
        .sort((a, b) => (b[1].posts + b[1].recognitions) - (a[1].posts + a[1].recognitions))
        .slice(0, 5)
        .map(([id]) => id);

      let topUsers: any[] = [];
      if (topUserIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name, avatar_url")
          .in("id", topUserIds);

        topUsers = topUserIds.map(id => ({
          ...(users || []).find(u => u.id === id),
          ...userActivity[id],
          total: (userActivity[id]?.posts || 0) + (userActivity[id]?.recognitions || 0),
        }));
      }

      return {
        postsThisMonth: posts?.length || 0,
        recognitionsThisMonth: recognitions?.length || 0,
        weeks,
        topUsers,
      };
    },
    enabled: enabled && !!companyId,
  });
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/hooks/useUser";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

function useEngagementHistory() {
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  return useQuery({
    queryKey: ["engagement-history", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date).toISOString();
        const end = endOfMonth(date).toISOString();

        const [{ count: posts }, { count: recognitions }] = await Promise.all([
          supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", start)
            .lte("created_at", end),
          supabase
            .from("recognitions")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", start)
            .lte("created_at", end),
        ]);

        months.push({
          month: format(date, "MMM", { locale: ptBR }),
          posts: posts || 0,
          reconhecimentos: recognitions || 0,
        });
      }

      return months;
    },
    enabled: !!companyId,
  });
}

export function EngagementChart() {
  const { data, isLoading } = useEngagementHistory();

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Engajamento Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full rounded-xl" />
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(152, 60%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(152, 60%, 36%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 10%, 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(160, 10%, 45%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(160, 10%, 45%)" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid hsl(150, 10%, 90%)",
                  fontSize: "0.875rem",
                }}
              />
              <Area type="monotone" dataKey="posts" name="Posts" stroke="hsl(152, 60%, 36%)" fill="url(#colorPosts)" strokeWidth={2} />
              <Area type="monotone" dataKey="reconhecimentos" name="Reconhecimentos" stroke="hsl(38, 92%, 50%)" fill="url(#colorRec)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            Sem dados suficientes
          </div>
        )}
      </CardContent>
    </Card>
  );
}

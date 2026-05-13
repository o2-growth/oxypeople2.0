import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subMonths } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, MessageSquareQuote, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useUser } from "@/hooks/useUser";
import { useFeedbackMetrics } from "@/hooks/useFeedbackMetrics";
import { trackEvent } from "@/lib/analytics";
import { FeedbackKpiCards } from "@/components/admin/feedback/FeedbackKpiCards";
import { FeedbackTimelineChart } from "@/components/admin/feedback/FeedbackTimelineChart";
import { CompetencyRankingChart } from "@/components/admin/feedback/CompetencyRankingChart";
import { AdoptionGauge } from "@/components/admin/feedback/AdoptionGauge";
import { CronStatusCard } from "@/components/admin/feedback/CronStatusCard";

const STATUS_LABEL: Record<string, string> = {
  all: "Todos",
  answered: "Respondidos",
  declined: "Recusados",
  requested: "Pendentes",
  expired: "Expirados",
};

interface DrilldownRow {
  id: string;
  question: string;
  status: string;
  declined_reason: string | null;
  answered_at: string | null;
  created_at: string;
  requester: { full_name: string | null } | null;
  respondent: { full_name: string | null } | null;
}

export default function FeedbackAnalyticsPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const [dateFrom, setDateFrom] = useState(
    format(subMonths(new Date(), 6), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [aggregatedOnly, setAggregatedOnly] = useState(false);
  const [drillFilter, setDrillFilter] = useState<string | null>(null);
  const [drillRows, setDrillRows] = useState<DrilldownRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const { data: metrics, isLoading } = useFeedbackMetrics(dateFrom, dateTo);

  useEffect(() => {
    if (!permsLoading && !isAdmin) {
      toast.error("Sem permissão para acessar analytics de feedback.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, permsLoading, navigate]);

  useEffect(() => {
    if (metrics) trackEvent("feedback_analytics_viewed", { date_from: dateFrom, date_to: dateTo });
  }, [metrics, dateFrom, dateTo]);

  const openDrilldown = async (filter: string, tagName?: string) => {
    if (!companyId) return;
    setDrillFilter(tagName ?? filter);
    setDrillLoading(true);
    setDrillRows([]);

    let query = supabase
      .from("feedback_requests")
      .select(`
        id, question, status, declined_reason, answered_at, created_at,
        requester:users!feedback_requests_requester_id_fkey(full_name),
        respondent:users!feedback_requests_respondent_id_fkey(full_name)
      `)
      .eq("company_id", companyId)
      .gte("created_at", `${dateFrom}T00:00:00`)
      .lte("created_at", `${dateTo}T23:59:59`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all" && !tagName) query = query.eq("status", filter);

    const { data, error } = await query;
    setDrillLoading(false);

    if (error) {
      toast.error("Erro ao carregar detalhes.");
      return;
    }
    setDrillRows((data ?? []) as unknown as DrilldownRow[]);
  };

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <MessageSquareQuote className="h-6 w-6" />
              Analytics de Feedback
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Métricas de adoção e qualidade da prática de feedback contínuo.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-sm w-36"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-sm w-36"
              />
            </div>
            <div className="flex items-center gap-1.5 pb-0.5">
              {aggregatedOnly ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <Label className="text-xs cursor-pointer" htmlFor="agg-toggle">
                Modo agregado
              </Label>
              <Switch
                id="agg-toggle"
                checked={aggregatedOnly}
                onCheckedChange={setAggregatedOnly}
                className="ml-1"
              />
            </div>
          </div>
        </div>

        {isLoading || !metrics ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <FeedbackKpiCards
              metrics={metrics}
              aggregatedOnly={aggregatedOnly}
              onCardClick={(f) => openDrilldown(f)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <FeedbackTimelineChart data={metrics.monthly} />
              </div>
              <AdoptionGauge
                adoptionPct={metrics.adoption_pct}
                distinctRequesters={metrics.distinct_requesters}
                totalMembers={metrics.total_members}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <CompetencyRankingChart
                  data={metrics.competencies}
                  onTagClick={(tag) => openDrilldown("tag", tag)}
                />
              </div>
              <CronStatusCard />
            </div>
          </>
        )}
      </div>

      <Sheet open={!!drillFilter} onOpenChange={(open) => !open && setDrillFilter(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {STATUS_LABEL[drillFilter ?? "all"] ?? drillFilter} — últimos 50
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {drillLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : drillRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum feedback encontrado.</p>
            ) : (
              drillRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border p-3 text-sm space-y-1 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium line-clamp-2">{row.question}</p>
                    <Badge variant={row.status === "answered" ? "secondary" : "outline"} className="shrink-0">
                      {STATUS_LABEL[row.status] ?? row.status}
                    </Badge>
                  </div>
                  {!aggregatedOnly && (
                    <p className="text-xs text-muted-foreground">
                      {row.requester?.full_name ?? "—"} → {row.respondent?.full_name ?? "—"}
                    </p>
                  )}
                  {row.declined_reason && (
                    <p className="text-xs text-amber-600 italic">Motivo: {row.declined_reason}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

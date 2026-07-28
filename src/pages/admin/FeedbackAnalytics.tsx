import { useEffect, useState } from "react";
import { format, subMonths } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsPageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MessageSquareQuote, Eye, EyeOff } from "lucide-react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useFeedbackMetrics } from "@/hooks/useFeedbackMetrics";
import {
  useFeedbackDrilldown,
  type FeedbackDrilldownTarget,
} from "@/hooks/useFeedbackDrilldown";
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

export default function FeedbackAnalyticsPage() {
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para acessar analytics de feedback.",
  });

  const [dateFrom, setDateFrom] = useState(
    format(subMonths(new Date(), 6), "yyyy-MM-dd"),
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [aggregatedOnly, setAggregatedOnly] = useState(false);
  const [drilldown, setDrilldown] = useState<FeedbackDrilldownTarget | null>(null);

  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
  } = useFeedbackMetrics(dateFrom, dateTo);

  const {
    data: drillRows = [],
    isLoading: drillLoading,
    isError: drillError,
    refetch: refetchDrill,
  } = useFeedbackDrilldown(drilldown, dateFrom, dateTo);

  useEffect(() => {
    if (metrics) trackEvent("feedback_analytics_viewed", { date_from: dateFrom, date_to: dateTo });
  }, [metrics, dateFrom, dateTo]);

  const openStatus = (filter: string) =>
    setDrilldown({
      status: filter === "all" ? null : (filter as FeedbackDrilldownTarget["status"]),
      label: STATUS_LABEL[filter] ?? filter,
    });

  const openTag = (tag: string) => setDrilldown({ status: null, label: tag });

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="date-from" className="text-xs">De</Label>
        <Input
          id="date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="date-to" className="text-xs">Até</Label>
        <Input
          id="date-to"
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36 text-sm"
        />
      </div>
      <div className="flex items-center gap-1.5">
        {aggregatedOnly ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        <Label className="text-xs cursor-pointer" htmlFor="agg-toggle">
          Modo agregado
        </Label>
        <Switch
          id="agg-toggle"
          checked={aggregatedOnly}
          onCheckedChange={setAggregatedOnly}
        />
      </div>
    </div>
  );

  // Gate de permissão: skeleton enquanto resolve (nunca spinner de tela cheia).
  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <CardsPageSkeleton cards={6} />
      </AppLayout>
    );
  }

  const isEmpty = !!metrics && metrics.total_requests === 0;

  return (
    <AppLayout>
      <PageHeader
        title="Analytics de Feedback"
        description="Métricas de adoção e qualidade da prática de feedback contínuo."
        icon={MessageSquareQuote}
      >
        {filters}
      </PageHeader>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        </div>
      ) : isError ? (
        <QueryError
          message="Não foi possível carregar as métricas de feedback."
          onRetry={() => refetch()}
        />
      ) : isEmpty || !metrics ? (
        <EmptyState
          icon={MessageSquareQuote}
          title="Sem feedbacks no período"
          description="Nenhum pedido de feedback foi registrado no intervalo selecionado. Amplie o período para ver mais dados."
          action={{
            label: "Ampliar para 12 meses",
            onClick: () =>
              setDateFrom(format(subMonths(new Date(), 12), "yyyy-MM-dd")),
          }}
        />
      ) : (
        <div className="space-y-6">
          <FeedbackKpiCards
            metrics={metrics}
            aggregatedOnly={aggregatedOnly}
            onCardClick={openStatus}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <FeedbackTimelineChart data={metrics.monthly} />
            </div>
            <AdoptionGauge
              adoptionPct={metrics.adoption_pct}
              distinctRequesters={metrics.distinct_requesters}
              totalMembers={metrics.total_members}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <CompetencyRankingChart
                data={metrics.competencies}
                onTagClick={openTag}
              />
            </div>
            <CronStatusCard />
          </div>
        </div>
      )}

      <Sheet open={!!drilldown} onOpenChange={(open) => !open && setDrilldown(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{drilldown?.label} — últimos 50</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {drillLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : drillError ? (
              <QueryError
                message="Não foi possível carregar os detalhes."
                onRetry={() => refetchDrill()}
              />
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
                    <p className="text-xs text-warning italic">Motivo: {row.declined_reason}</p>
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

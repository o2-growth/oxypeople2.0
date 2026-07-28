import { useEffect, useState } from "react";
import { format, subDays } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Coffee, Download } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryError } from "@/components/QueryError";
import { EmptyState } from "@/components/ui/empty-state";
import { CardsPageSkeleton } from "@/components/ui/page-skeleton";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useUser } from "@/hooks/useUser";
import { useOneOnOnesDashboard } from "@/hooks/useOneOnOnesDashboard";
import { trackEvent } from "@/lib/analytics";
import { downloadCsv } from "@/lib/export-csv";
import { FrequencyTable } from "@/components/admin/one-on-ones/FrequencyTable";
import { TrendChart } from "@/components/admin/one-on-ones/TrendChart";

// ─── Period presets ───────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
] as const;

// ─── KPI Card (local, tokenizado) ───────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
}

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Skeleton do corpo (sob o header) ───────────────────────────────────────────

function DashboardBodySkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </>
  );
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCsv(rows: ReturnType<typeof import("@/hooks/useOneOnOnesDashboard").useOneOnOnesDashboard>["data"] extends infer D ? D extends { leaderStats: Array<infer R> } ? R[] : never : never) {
  downloadCsv(
    `one-on-ones-frequencia-${format(new Date(), "yyyy-MM-dd")}`,
    ["Gestor", "Liderados", "Agendadas", "Completadas", "% Conclusão", "Última 1:1"],
    rows.map((r) => [
      r.leader_name,
      r.direct_reports,
      r.scheduled,
      r.completed,
      r.scheduled === 0 ? "" : String(r.completion_pct),
      r.last_meeting_at ? format(new Date(r.last_meeting_at), "yyyy-MM-dd") : "",
    ]),
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OneOnOnesDashboardPage() {
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para acessar esta página.",
  });
  const { profile } = useUser();
  const companyId = profile?.primary_company_id;

  const [periodDays, setPeriodDays] = useState<number>(90);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);

  const dateFrom = useCustom && customFrom
    ? customFrom
    : format(subDays(new Date(), periodDays), "yyyy-MM-dd");
  const dateTo = useCustom && customTo
    ? customTo
    : format(new Date(), "yyyy-MM-dd");

  const { data, isLoading, isError, refetch } = useOneOnOnesDashboard(
    companyId,
    dateFrom,
    dateTo,
  );

  // Track filter changes
  useEffect(() => {
    if (data) {
      trackEvent("one_on_one_dashboard_filtered", { period_days: useCustom ? "custom" : periodDays });
    }
  }, [data, periodDays, useCustom]);

  function handlePeriodSelect(days: number) {
    setPeriodDays(days);
    setUseCustom(false);
  }

  function handleExport() {
    if (!data?.leaderStats) return;
    exportCsv(data.leaderStats);
    trackEvent("one_on_one_dashboard_exported");
  }

  // Enquanto valida permissão, mostra skeleton (redireciona no efeito do gate).
  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <CardsPageSkeleton cards={4} />
      </AppLayout>
    );
  }

  // Enquanto o perfil carrega (companyId indefinido), a query fica desabilitada:
  // trata como loading para não cair em empty falso.
  const isLoadingData = isLoading || !companyId;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Frequência de 1:1s"
          description="Acompanhe a frequência de reuniões 1:1 por gestor."
          icon={Coffee}
          actions={
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={!data || isLoadingData}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          }
        >
          {/* Seletor de período */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex gap-1">
              {PERIOD_OPTIONS.map((opt) => (
                <Button
                  key={opt.days}
                  size="sm"
                  variant={!useCustom && periodDays === opt.days ? "default" : "outline"}
                  onClick={() => handlePeriodSelect(opt.days)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); }}
                  className="h-8 text-sm w-36"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); }}
                  className="h-8 text-sm w-36"
                />
              </div>
            </div>
          </div>
        </PageHeader>

        {isLoadingData ? (
          <DashboardBodySkeleton />
        ) : isError ? (
          <QueryError
            message="Não foi possível carregar o dashboard de 1:1s."
            onRetry={() => refetch()}
          />
        ) : !data || data.totalMeetings === 0 ? (
          <EmptyState
            icon={Coffee}
            title="Nenhuma 1:1 no período"
            description="Não há reuniões 1:1 registradas no intervalo selecionado. Ajuste o período para ver os dados."
          />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Total de 1:1s"
                value={String(data.totalMeetings)}
                sub={useCustom ? "no período selecionado" : `nos últimos ${periodDays} dias`}
              />
              <KpiCard
                label="% Completadas"
                value={`${data.completedPct}%`}
              />
              <KpiCard
                label="% Canceladas / Faltas"
                value={`${data.canceledOrNoShowPct}%`}
              />
              <KpiCard
                label="Gestores ativos"
                value={String(data.activeLeaders)}
              />
            </div>

            {/* Trend Chart */}
            <TrendChart data={data.trendData} />

            {/* Frequency Table */}
            <div>
              <h2 className="text-base font-semibold mb-3">Frequência por Gestor</h2>
              <FrequencyTable rows={data.leaderStats} allMeetings={data.meetings} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

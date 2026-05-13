import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Coffee, Download } from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useUser } from "@/hooks/useUser";
import { useOneOnOnesDashboard } from "@/hooks/useOneOnOnesDashboard";
import { trackEvent } from "@/lib/analytics";
import { FrequencyTable } from "@/components/admin/one-on-ones/FrequencyTable";
import { TrendChart } from "@/components/admin/one-on-ones/TrendChart";

// ─── Period presets ───────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
] as const;

// ─── KPI Card ─────────────────────────────────────────────────────────────────

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

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCsv(rows: ReturnType<typeof import("@/hooks/useOneOnOnesDashboard").useOneOnOnesDashboard>["data"] extends infer D ? D extends { leaderStats: Array<infer R> } ? R[] : never : never) {
  const header = "Gestor,Liderados,Agendadas,Completadas,% Completion,Ultima 1:1";
  const body = rows
    .map((r) => {
      const lastDate = r.last_meeting_at
        ? format(new Date(r.last_meeting_at), "yyyy-MM-dd")
        : "";
      const pct = r.scheduled === 0 ? "" : String(r.completion_pct);
      return [
        `"${r.leader_name.replace(/"/g, '""')}"`,
        r.direct_reports,
        r.scheduled,
        r.completed,
        pct,
        lastDate,
      ].join(",");
    })
    .join("\n");

  const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `one-on-ones-frequencia-${format(new Date(), "yyyy-MM-dd")}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OneOnOnesDashboardPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();
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

  // Admin gate
  useEffect(() => {
    if (!permsLoading && !isAdmin) {
      toast.error("Sem permissão.");
      navigate("/", { replace: true });
    }
  }, [isAdmin, permsLoading, navigate]);

  const { data, isLoading } = useOneOnOnesDashboard(companyId, dateFrom, dateTo);

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
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
              <Coffee className="h-6 w-6" />
              Dashboard de Frequência — 1:1s
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Acompanhe a frequência de reuniões 1:1 por gestor.
            </p>
          </div>

          {/* Period selector */}
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
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              disabled={!data || isLoading}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {isLoading || !data ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                label="Total de 1:1s"
                value={String(data.totalMeetings)}
                sub={`nos últimos ${useCustom ? "período custom" : `${periodDays} dias`}`}
              />
              <KpiCard
                label="% Completadas"
                value={`${data.completedPct}%`}
              />
              <KpiCard
                label="% Canceladas / No-show"
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

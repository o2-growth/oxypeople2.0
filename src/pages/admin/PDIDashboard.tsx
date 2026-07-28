import { useEffect } from "react";
import { Download, BookOpen } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CardsPageSkeleton } from "@/components/ui/page-skeleton";
import { PageHeader } from "@/components/layout/PageHeader";
import { QueryError } from "@/components/QueryError";
import { EmptyState } from "@/components/ui/empty-state";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { useUser } from "@/hooks/useUser";
import { usePDIDashboard } from "@/hooks/usePDIDashboard";
import { DepartmentTable } from "@/components/admin/pdi/DepartmentTable";
import { TopCompetencies } from "@/components/admin/pdi/TopCompetencies";
import { AtRiskList } from "@/components/admin/pdi/AtRiskList";
import { trackEvent } from "@/lib/analytics";
import { downloadCsv } from "@/lib/export-csv";

// ─── KPI Card (local, tokenizado) ───────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

function KpiCard({ label, value, icon }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs text-muted-foreground font-normal flex items-center gap-1.5">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Skeleton do corpo (sob o header) ───────────────────────────────────────────

function DashboardBodySkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    </>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function PDIDashboardPage() {
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para acessar esta página.",
  });
  const { profile } = useUser();
  const companyId = profile?.primary_company_id ?? "";
  const { data, isLoading, isError, refetch } = usePDIDashboard(companyId);

  useEffect(() => {
    trackEvent("pdi_dashboard_viewed");
  }, []);

  // Enquanto valida permissão, mostra skeleton (redireciona no efeito do gate).
  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <CardsPageSkeleton cards={4} />
      </AppLayout>
    );
  }

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      "pdi-dashboard",
      ["Área", "Pessoas", "Ativos", "Concluídos", "Progresso Médio", "Cobertura %"],
      data.deptRows.map((r) => [
        r.dept_name,
        r.people_count,
        r.active_count,
        r.completed_count,
        r.avg_progress.toFixed(1),
        r.coverage_pct.toFixed(1),
      ]),
    );
    trackEvent("pdi_dashboard_exported");
  };

  // Enquanto o perfil carrega (companyId vazio), a query fica desabilitada:
  // trata como loading para não cair em empty falso.
  const isLoadingData = isLoading || !companyId;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl">
        <PageHeader
          title="Dashboard de PDIs"
          description="Acompanhe a evolução dos Planos de Desenvolvimento Individual por área."
          icon={BookOpen}
          actions={
            <Button onClick={exportCsv} variant="outline" size="sm" disabled={!data}>
              <Download className="h-4 w-4 mr-1.5" />
              Exportar CSV
            </Button>
          }
        />

        {isLoadingData ? (
          <DashboardBodySkeleton />
        ) : isError ? (
          <QueryError
            message="Não foi possível carregar o dashboard de PDIs."
            onRetry={() => refetch()}
          />
        ) : !data || data.deptRows.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Sem dados de PDI ainda"
            description="Assim que houver Planos de Desenvolvimento Individual nesta empresa, os indicadores aparecerão aqui."
          />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="PDIs ativos" value={String(data.totalActive)} />
              <KpiCard
                label="Concluídos no prazo"
                value={`${data.onTimePct}%`}
              />
              <KpiCard
                label="Progresso médio"
                value={`${data.avgProgress.toFixed(0)}%`}
              />
              <KpiCard
                label="Aguardando aprovação > 14d"
                value={String(data.pendingApprovalOver14d)}
              />
            </div>

            {/* Department table */}
            <DepartmentTable rows={data.deptRows} />

            {/* 2-col: Competencies + At-risk */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Competências mais trabalhadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TopCompetencies data={data.topCompetencies} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">PDIs em risco</CardTitle>
                </CardHeader>
                <CardContent>
                  <AtRiskList items={data.atRisk} />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

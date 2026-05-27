import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Download, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useUser } from "@/hooks/useUser";
import { usePDIDashboard } from "@/hooks/usePDIDashboard";
import { DepartmentTable } from "@/components/admin/pdi/DepartmentTable";
import { TopCompetencies } from "@/components/admin/pdi/TopCompetencies";
import { AtRiskList } from "@/components/admin/pdi/AtRiskList";
import { trackEvent } from "@/lib/analytics";

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

export default function PDIDashboardPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: permsLoading } = useUserPermissions();
  const { profile } = useUser();
  const companyId = profile?.primary_company_id ?? "";
  const { data, isLoading } = usePDIDashboard(companyId);

  useEffect(() => {
    if (!permsLoading && !isAdmin) {
      toast.error("Sem permissão");
      navigate("/");
    }
  }, [isAdmin, permsLoading, navigate]);

  useEffect(() => {
    trackEvent("pdi_dashboard_viewed");
  }, []);

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const exportCsv = () => {
    if (!data) return;
    const header = "Área,Pessoas,Ativos,Concluídos,Progresso Médio,Cobertura %";
    const rows = data.deptRows
      .map(
        (r) =>
          `"${r.dept_name}",${r.people_count},${r.active_count},${r.completed_count},${r.avg_progress.toFixed(1)},${r.coverage_pct.toFixed(1)}`,
      )
      .join("\n");
    const blob = new Blob([header + "\n" + rows], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pdi-dashboard.csv";
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("pdi_dashboard_exported");
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold">PDI — Dashboard</h1>
          </div>
          <Button onClick={exportCsv} variant="outline" size="sm" disabled={!data}>
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
        </div>

        {isLoading || !data ? (
          <Card>
            <CardContent className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
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

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, BookOpen, Plus, Users, Clock } from "lucide-react";
import { useIsManager } from "@/hooks/useIsManager";
import { useTeamPDIs } from "@/hooks/useTeamPDIs";
import { CreateForReportDialog } from "@/components/pdi/CreateForReportDialog";
import type { DirectReport } from "@/hooks/useIsManager";
import type { PDIPlan } from "@/hooks/usePDI";
import { PDI_STATUS } from "@/components/shared/StatusBadge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function initialsOf(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function ReportRow({
  report,
  latestPlan,
  onCreatePDI,
}: {
  report: DirectReport;
  latestPlan: PDIPlan | undefined;
  onCreatePDI: (report: DirectReport) => void;
}) {
  const navigate = useNavigate();
  const status = latestPlan ? PDI_STATUS[latestPlan.status] : null;
  const isPendingApproval =
    latestPlan?.approval_requested_at && !latestPlan.approved_at;

  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={report.avatar_url ?? undefined} />
        <AvatarFallback className="text-xs">{initialsOf(report.full_name)}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{report.full_name ?? "Sem nome"}</span>
          {status && (
            <Badge variant={status.variant} className="text-xs py-0">
              {status.label}
            </Badge>
          )}
          {isPendingApproval && (
            <Badge variant="outline" className="text-xs py-0 gap-1 text-warning border-warning/30 bg-warning/10">
              <Clock className="h-2.5 w-2.5" />
              Aguardando aprovação
            </Badge>
          )}
          {!latestPlan && (
            <span className="text-xs text-muted-foreground">Sem PDI</span>
          )}
        </div>

        {latestPlan?.status === "active" && (
          <div className="mt-1.5 flex items-center gap-2 max-w-xs">
            <Progress value={latestPlan.progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">{latestPlan.progress}%</span>
          </div>
        )}

        {latestPlan?.title && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{latestPlan.title}</p>
        )}

        {latestPlan?.target_date && (
          <p className="text-xs text-muted-foreground">
            Meta: {format(parseISO(latestPlan.target_date), "d MMM yyyy", { locale: ptBR })}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {latestPlan && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/pdi/${latestPlan.id}`)}
          >
            Ver PDI
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onCreatePDI(report)}
        >
          <Plus className="h-3.5 w-3.5" />
          Criar PDI
        </Button>
      </div>
    </div>
  );
}

export default function PDITeamPage() {
  const { isManager, directReports, isLoading: loadingReports } = useIsManager();
  const reportIds = directReports.map((r) => r.id);
  const { data: teamPlans = {}, isLoading: loadingPlans } = useTeamPDIs(reportIds);
  const [createTarget, setCreateTarget] = useState<DirectReport | null>(null);

  const pendingApprovals = directReports.filter((r) => {
    const plan = teamPlans[r.id];
    return plan?.approval_requested_at && !plan.approved_at;
  });

  const isLoading = loadingReports || loadingPlans;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              PDI do Time
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gerencie os planos de desenvolvimento dos seus liderados.
            </p>
          </div>
          {pendingApprovals.length > 0 && (
            <Badge className="gap-1.5 bg-warning/15 text-warning border-warning/30">
              <Clock className="h-3.5 w-3.5" />
              {pendingApprovals.length} aprovação{pendingApprovals.length > 1 ? "ões" : ""} pendente{pendingApprovals.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isManager || directReports.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Sem liderados diretos cadastrados.</p>
            <p className="text-xs mt-1">Configure o organograma em Gestão → Equipes.</p>
          </div>
        ) : (
          <div className="rounded-lg border divide-y divide-border">
            {directReports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                latestPlan={teamPlans[report.id]}
                onCreatePDI={setCreateTarget}
              />
            ))}
          </div>
        )}
      </div>

      {createTarget && (
        <CreateForReportDialog
          open={!!createTarget}
          onOpenChange={(open) => !open && setCreateTarget(null)}
          report={createTarget}
        />
      )}
    </AppLayout>
  );
}

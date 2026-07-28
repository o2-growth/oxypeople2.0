import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PDI_STATUS } from "@/components/shared/StatusBadge";
import { TabCountBadge } from "@/components/shared/TabCountBadge";
import { QueryError } from "@/components/QueryError";
import { DetailPageSkeleton } from "@/components/ui/page-skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, ArrowLeft, UserCheck } from "lucide-react";
import { usePDIDetail, useActivatePDI, useRefetchPDIDetail, useCompletePDI } from "@/hooks/usePDI";
import { usePDICompetencies } from "@/hooks/usePDICompetencies";
import { usePDIActions } from "@/hooks/usePDIActions";
import { CompetenciesList } from "@/components/pdi/CompetenciesList";
import { ActionsKanban } from "@/components/pdi/ActionsKanban";
import { CompetencyRadar } from "@/components/pdi/CompetencyRadar";
import { ApprovalBadge } from "@/components/pdi/ApprovalBadge";
import { ApprovalActions } from "@/components/pdi/ApprovalActions";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PDIDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const { data: plan, isLoading, isError, refetch } = usePDIDetail(id ?? "");
  const { list: competenciesList } = usePDICompetencies(id ?? "");
  const { list: actionsList } = usePDIActions(id ?? "");
  const activatePDI = useActivatePDI(id ?? "");
  const completePDI = useCompletePDI(id ?? "");
  const refetchPlan = useRefetchPDIDetail(id ?? "");

  const competencies = competenciesList.data ?? [];
  const actions = actionsList.data ?? [];
  const evidences = actions.filter((a) => a.evidence_url);

  if (isLoading) {
    return (
      <AppLayout>
        <DetailPageSkeleton className="max-w-5xl" />
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <QueryError message="Não foi possível carregar o PDI." onRetry={() => refetch()} />
      </AppLayout>
    );
  }

  if (!plan) {
    return (
      <AppLayout>
        <div className="py-16 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">PDI não encontrado ou sem acesso.</p>
          <Button
            variant="ghost"
            className="mt-4 gap-1.5"
            onClick={() => navigate("/pdi")}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const status = PDI_STATUS[plan.status];
  const isOwner = plan.user_id === userId;
  const canActivate = plan.status === "draft" && competencies.length >= 1 && isOwner;
  const canComplete = plan.status === "active" && plan.progress === 100 && isOwner;
  const backPath = isOwner ? "/pdi" : "/pdi/team";

  return (
    <AppLayout>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => navigate(backPath)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-display font-bold leading-tight flex items-center gap-2 flex-wrap">
              <BookOpen className="h-5 w-5 shrink-0" />
              {plan.title}
            </h1>
            {plan.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Criado em {format(parseISO(plan.created_at), "d 'de' MMMM yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1 flex-wrap justify-end">
            <ApprovalBadge
              approvedAt={plan.approved_at}
              approvalRequestedAt={plan.approval_requested_at}
            />
            {canActivate && (
              <Button
                size="sm"
                onClick={() => activatePDI.mutate()}
                disabled={activatePDI.isPending}
              >
                {activatePDI.isPending && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Ativar PDI
              </Button>
            )}
            {canComplete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => completePDI.mutate()}
                disabled={completePDI.isPending}
                className="gap-1.5"
              >
                {completePDI.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <UserCheck className="h-3.5 w-3.5" />
                }
                Marcar como concluído
              </Button>
            )}
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>

        {plan.review_comment && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
            <strong>Ajustes solicitados pelo gestor:</strong>
            <p className="mt-1">{plan.review_comment}</p>
          </div>
        )}

        {plan.status === "active" && (
          <ApprovalActions plan={plan} currentUserId={userId} />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso: {plan.progress}%</span>
            {plan.target_date && (
              <span className="text-muted-foreground text-xs">
                Meta:{" "}
                {format(parseISO(plan.target_date), "d 'de' MMMM yyyy", { locale: ptBR })}
              </span>
            )}
          </div>
          <Progress value={plan.progress} className="h-2" />
        </div>

        <Tabs defaultValue="competencies">
          <TabsList>
            <TabsTrigger value="competencies">
              Competências
              <TabCountBadge count={competencies.length} />
            </TabsTrigger>
            <TabsTrigger value="actions">
              Ações
              <TabCountBadge count={actions.length} />
            </TabsTrigger>
            {competencies.length >= 3 && (
              <TabsTrigger value="radar">Mapa de Competências</TabsTrigger>
            )}
            {evidences.length > 0 && (
              <TabsTrigger value="evidences">
                Evidências
                <TabCountBadge count={evidences.length} />
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="competencies" className="mt-4">
            <div className="border rounded-lg p-4">
              <CompetenciesList planId={plan.id} />
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <ActionsKanban
              planId={plan.id}
              competencies={competencies}
              onPlanRefetch={refetchPlan}
              planUserId={plan.user_id}
              currentUserId={userId}
            />
          </TabsContent>

          <TabsContent value="radar" className="mt-4">
            <div className="border rounded-lg p-4">
              <CompetencyRadar competencies={competencies} />
            </div>
          </TabsContent>

          <TabsContent value="evidences" className="mt-4">
            <div className="border rounded-lg divide-y divide-border">
              {evidences.map((action) => (
                <div key={action.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{action.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {action.evidence_url!.split("/").pop()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {action.status === "done" ? "Concluída" :
                     action.status === "doing" ? "Em andamento" :
                     action.status === "blocked" ? "Bloqueada" : "A fazer"}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

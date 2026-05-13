import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen, ArrowLeft } from "lucide-react";
import { usePDIDetail, useActivatePDI, useRefetchPDIDetail, type PDIStatus } from "@/hooks/usePDI";
import { usePDICompetencies } from "@/hooks/usePDICompetencies";
import { CompetenciesList } from "@/components/pdi/CompetenciesList";
import { ActionsKanban } from "@/components/pdi/ActionsKanban";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_BADGE: Record<PDIStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "outline" },
  active: { label: "Ativo", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  canceled: { label: "Cancelado", variant: "destructive" },
};

export default function PDIDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: plan, isLoading } = usePDIDetail(id ?? "");
  const { list: competenciesList } = usePDICompetencies(id ?? "");
  const activatePDI = useActivatePDI(id ?? "");
  const refetchPlan = useRefetchPDIDetail(id ?? "");

  const competencies = competenciesList.data ?? [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
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

  const status = STATUS_BADGE[plan.status];
  const canActivate = plan.status === "draft" && competencies.length >= 1;

  return (
    <AppLayout>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => navigate("/pdi")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-heading font-bold flex items-center gap-2 flex-wrap">
              <BookOpen className="h-5 w-5 shrink-0" />
              {plan.title}
            </h1>
            {plan.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
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
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>

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
              Competências{" "}
              {competencies.length > 0 && (
                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                  {competencies.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="actions">Ações</TabsTrigger>
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
            />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

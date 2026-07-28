import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge, PDI_STATUS } from "@/components/shared/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { Loader2, BookOpen, Plus } from "lucide-react";
import { PDIForm } from "@/components/pdi/PDIForm";
import { QueryError } from "@/components/QueryError";
import { usePDIList, type PDIPlan } from "@/hooks/usePDI";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function PDICard({ plan }: { plan: PDIPlan }) {
  const navigate = useNavigate();

  return (
    <div
      className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => navigate(`/pdi/${plan.id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-snug">{plan.title}</h3>
          {plan.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{plan.description}</p>
          )}
        </div>
        <StatusBadge status={plan.status} map={PDI_STATUS} className="shrink-0" />
      </div>

      {plan.status === "active" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span>{plan.progress}%</span>
          </div>
          <Progress value={plan.progress} className="h-1.5" />
        </div>
      )}

      {plan.target_date && (
        <p className="text-xs text-muted-foreground">
          Meta:{" "}
          {format(parseISO(plan.target_date), "d 'de' MMMM yyyy", { locale: ptBR })}
        </p>
      )}
    </div>
  );
}

export default function PDIPage() {
  const { data: plans = [], isLoading, isError, refetch } = usePDIList();
  const [formOpen, setFormOpen] = useState(false);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              PDI
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Plano de Desenvolvimento Individual.
            </p>
          </div>
          <Button onClick={() => setFormOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo PDI
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <QueryError
            message="Não foi possível carregar seus PDIs."
            onRetry={() => refetch()}
          />
        ) : plans.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum PDI criado ainda.</p>
            <Button
              variant="outline"
              className="mt-4 gap-1.5"
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Criar primeiro PDI
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <PDICard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>

      <PDIForm open={formOpen} onOpenChange={setFormOpen} />
    </AppLayout>
  );
}

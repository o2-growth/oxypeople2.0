import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardCheck, ListChecks, BarChart3, Settings2 } from "lucide-react";
import { PerformanceStats } from "@/components/performance/PerformanceStats";
import { CycleCard } from "@/components/performance/CycleCard";
import { CreateCycleDialog } from "@/components/performance/CreateCycleDialog";
import { EvaluationsList } from "@/components/performance/EvaluationsList";
import { MyEvaluations } from "@/components/performance/MyEvaluations";
import { usePerformanceCycles } from "@/hooks/usePerformanceCycles";
import { useEvaluations } from "@/hooks/useEvaluations";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryError } from "@/components/QueryError";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Performance() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null);
  const {
    cycles,
    isLoading: cyclesLoading,
    isError: cyclesError,
    refetch: refetchCycles,
    createCycle,
    updateCycle,
    deleteCycle,
  } = usePerformanceCycles();
  const {
    allEvaluations,
    pendingEvaluations,
    completedEvaluations,
    isLoading: evaluationsLoading,
    isError: evaluationsError,
    refetch: refetchEvaluations,
  } = useEvaluations();
  const { isAdmin, isLoading: permissionsLoading } = useUserPermissions();

  const isLoading = cyclesLoading || evaluationsLoading || permissionsLoading;

  const activeCycles = cycles.filter((c) => c.status === "active").length;
  const pendingCount = allEvaluations.filter((e) => e.status === "pending" || e.status === "in_progress").length;
  const completedCount = allEvaluations.filter((e) => e.status === "completed").length;
  const totalEvaluations = allEvaluations.length;
  const completionRate = totalEvaluations > 0 ? Math.round((completedCount / totalEvaluations) * 100) : 0;
  const averageScore = allEvaluations
    .filter((e) => e.overall_score !== null)
    .reduce((acc, e) => acc + (e.overall_score || 0), 0) / (completedCount || 1);

  const handleRetry = () => {
    refetchCycles();
    refetchEvaluations();
  };

  const handleCreateCycle = (data: Parameters<typeof createCycle.mutate>[0]) => {
    createCycle.mutate(data, {
      onSuccess: () => setCreateDialogOpen(false),
    });
  };

  const handleActivateCycle = (cycleId: string) => {
    updateCycle.mutate({ id: cycleId, status: "active" });
  };

  const handleCompleteCycle = (cycleId: string) => {
    updateCycle.mutate({ id: cycleId, status: "completed" });
  };

  const handleDeleteCycle = (cycleId: string) => {
    setDeletingCycleId(cycleId);
  };

  const confirmDeleteCycle = () => {
    if (deletingCycleId) {
      deleteCycle.mutate(deletingCycleId);
      setDeletingCycleId(null);
    }
  };

  const deleteConfirmation = (
    <AlertDialog
      open={!!deletingCycleId}
      onOpenChange={(open) => {
        if (!open) setDeletingCycleId(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir ciclo?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O ciclo e as avaliações vinculadas
            a ele serão removidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDeleteCycle}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteCycle.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // Admin View
  if (isAdmin) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <PageHeader
            title="Desempenho"
            description="Gerencie avaliações de desempenho da sua empresa"
            icon={ClipboardCheck}
            actions={
              <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Ciclo
              </Button>
            }
          />

          <Tabs defaultValue="cycles">
            <TabsList>
              <TabsTrigger value="cycles" className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Ciclos
              </TabsTrigger>
              <TabsTrigger value="evaluations" className="gap-2">
                <ListChecks className="h-4 w-4" />
                Avaliações
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Resultados
              </TabsTrigger>
              <TabsTrigger value="automation" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Automação
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                  <Skeleton className="h-48" />
                </div>
              ) : cyclesError || evaluationsError ? (
                <QueryError
                  message="Não foi possível carregar os dados de desempenho."
                  onRetry={handleRetry}
                />
              ) : (
                <>
                  <TabsContent value="cycles" className="space-y-6 mt-0">
                    <PerformanceStats
                      activeCycles={activeCycles}
                      pendingEvaluations={pendingCount}
                      completionRate={completionRate}
                      averageScore={averageScore}
                    />

                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold">Ciclos de Avaliação</h2>
                      {cycles.length === 0 ? (
                        <EmptyState
                          icon={ClipboardCheck}
                          title="Nenhum ciclo de avaliação"
                          description="Crie o primeiro ciclo para começar a avaliar o desempenho do time."
                          action={{
                            label: "Criar primeiro ciclo",
                            onClick: () => setCreateDialogOpen(true),
                          }}
                        />
                      ) : (
                        <div className="grid gap-4">
                          {cycles.map((cycle) => {
                            const cycleEvaluations = allEvaluations.filter(
                              (e) => e.cycle_id === cycle.id
                            );
                            const cycleCompleted = cycleEvaluations.filter(
                              (e) => e.status === "completed"
                            ).length;
                            return (
                              <CycleCard
                                key={cycle.id}
                                cycle={cycle}
                                evaluationsCount={cycleEvaluations.length}
                                completedCount={cycleCompleted}
                                onActivate={
                                  cycle.status === "draft"
                                    ? () => handleActivateCycle(cycle.id)
                                    : undefined
                                }
                                onComplete={
                                  cycle.status === "active"
                                    ? () => handleCompleteCycle(cycle.id)
                                    : undefined
                                }
                                onDelete={() => handleDeleteCycle(cycle.id)}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="evaluations" className="mt-0">
                    <EvaluationsList
                      evaluations={allEvaluations}
                      cycles={cycles}
                    />
                  </TabsContent>

                  <TabsContent value="results" className="mt-0">
                    <EmptyState
                      icon={BarChart3}
                      title="Em breve"
                      description="Resultados e relatórios de desempenho aparecerão aqui quando estiverem disponíveis."
                    />
                  </TabsContent>

                  <TabsContent value="automation" className="mt-0">
                    <EmptyState
                      icon={Settings2}
                      title="Em breve"
                      description="A configuração de automações de avaliação estará disponível em breve."
                    />
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>

          <CreateCycleDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSubmit={handleCreateCycle}
            isLoading={createCycle.isPending}
          />

          {deleteConfirmation}
        </div>
      </AppLayout>
    );
  }

  // User View
  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Desempenho"
          description="Acompanhe suas avaliações de desempenho"
          icon={ClipboardCheck}
        />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-48" />
          </div>
        ) : evaluationsError ? (
          <QueryError
            message="Não foi possível carregar suas avaliações."
            onRetry={handleRetry}
          />
        ) : (
          <MyEvaluations
            pendingEvaluations={pendingEvaluations}
            completedEvaluations={completedEvaluations}
          />
        )}
      </div>
    </AppLayout>
  );
}

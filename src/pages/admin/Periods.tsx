import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, CalendarRange } from "lucide-react";
import { usePeriodsAdmin, type PeriodAdminRow } from "@/hooks/usePeriodsAdmin";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { PageHeader } from "@/components/layout/PageHeader";
import { ListPageSkeleton } from "@/components/ui/page-skeleton";
import { QueryError } from "@/components/QueryError";
import { EmptyState } from "@/components/ui/empty-state";
import { PeriodFormDialog } from "@/components/admin/periods/PeriodFormDialog";

function formatPeriodDate(value: string): string {
  try {
    return format(new Date(`${value}T00:00:00`), "dd MMM yyyy", { locale: ptBR });
  } catch {
    return value;
  }
}

export default function PeriodsAdminPage() {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: permsLoading } = useRequireAdmin({
    message: "Sem permissão para gerenciar períodos.",
  });
  const { periods, isLoading, error, createPeriod, updatePeriod, deletePeriod } = usePeriodsAdmin();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PeriodAdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PeriodAdminRow | null>(null);

  const [cardsRef] = useAutoAnimate<HTMLDivElement>();
  const [tbodyRef] = useAutoAnimate<HTMLTableSectionElement>();

  if (permsLoading || !isAdmin) {
    return (
      <AppLayout>
        <ListPageSkeleton />
      </AppLayout>
    );
  }

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (row: PeriodAdminRow) => {
    setEditTarget(row);
    setFormOpen(true);
  };

  const handleSubmit = async (values: { name: string; start_date: string; end_date: string }) => {
    if (editTarget) {
      await updatePeriod.mutateAsync({ ...values, id: editTarget.id });
    } else {
      await createPeriod.mutateAsync(values);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deletePeriod.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const rowActions = (p: PeriodAdminRow) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={() => openEdit(p)}
        aria-label="Editar período"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteTarget(p)}
        aria-label="Remover período"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <AppLayout>
      <PageHeader
        icon={CalendarRange}
        title="Períodos"
        description="Ciclos de OKR (trimestres, semestres, anos). Sobreposições são bloqueadas pelo banco."
        actions={
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo período
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de períodos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <QueryError
              message="Não foi possível carregar os períodos."
              onRetry={() => queryClient.invalidateQueries({ queryKey: ["periods-admin"] })}
            />
          ) : periods.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="Nenhum período cadastrado"
              description="Crie o primeiro ciclo de OKR (trimestre, semestre ou ano) para começar."
              action={{ label: "Novo período", onClick: openCreate }}
            />
          ) : (
            <>
              {/* Mobile: cards (colapso da tabela) */}
              <div ref={cardsRef} className="space-y-3 md:hidden">
                {periods.map((p) => (
                  <div key={p.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{p.name}</p>
                      <Badge variant={p.objective_count > 0 ? "secondary" : "outline"}>
                        {p.objective_count} objetivos
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatPeriodDate(p.start_date)} — {formatPeriodDate(p.end_date)}
                    </p>
                    <div className="flex justify-end border-t pt-2">{rowActions(p)}</div>
                  </div>
                ))}
              </div>

              {/* Desktop: tabela completa */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Objetivos</TableHead>
                      <TableHead className="w-32 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody ref={tbodyRef}>
                    {periods.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>{formatPeriodDate(p.start_date)}</TableCell>
                        <TableCell>{formatPeriodDate(p.end_date)}</TableCell>
                        <TableCell>
                          <Badge variant={p.objective_count > 0 ? "secondary" : "outline"}>
                            {p.objective_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{rowActions(p)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <PeriodFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValue={editTarget}
        onSubmit={handleSubmit}
        isSubmitting={createPeriod.isPending || updatePeriod.isPending}
        existingPeriods={periods}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover período?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.objective_count
                ? `${deleteTarget.objective_count} objetivos estão vinculados a "${deleteTarget?.name}". O banco vai bloquear a remoção.`
                : `O período "${deleteTarget?.name}" será removido permanentemente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
